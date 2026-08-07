import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AppointmentStatus, DepositStatus, GiftCardStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AvailabilityService, parseTimeToMinutes } from '../availability/availability.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { EmailService } from '../notifications/email.service';
import { CreateAppointmentDto } from '../appointments/dto/create-appointment.dto';
import { dayOfWeekOf, localCalendarDayRangeUtc, localCalendarTimeToUtc, naiveCalendarDayRangeUtc } from '../common/timezone';
import { GetAdminAppointmentsDto } from './dto/get-admin-appointments.dto';
import { UpdateAdminAppointmentDto } from './dto/update-admin-appointment.dto';
import { CreateAvailabilityBlockDto } from './dto/create-availability-block.dto';
import { CreateArtistDto } from './dto/create-artist.dto';
import { UpdateArtistDto } from './dto/update-artist.dto';
import { CreateGalleryImageDto } from './dto/create-gallery-image.dto';
import { UpdateGalleryImageDto } from './dto/update-gallery-image.dto';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { CreateAdminAppointmentDto } from './dto/create-admin-appointment.dto';
import { CreateGiftCardTierDto } from './dto/create-gift-card-tier.dto';
import { UpdateGiftCardTierDto } from './dto/update-gift-card-tier.dto';
import { SetWeeklyAvailabilityDto } from './dto/set-weekly-availability.dto';
import { canonicalizeGiftCardCode } from '../common/gift-card-code';
import { giftCardRejectionReason } from '../common/gift-card-redemption';
import { ARTIST_IMAGES_URL_PREFIX, GALLERY_IMAGES_URL_PREFIX } from '../uploads.constants';

// redeemedGiftCards: para que la lista del panel pueda marcar de un vistazo
// qué turnos se pagaron con gift card, y con cuál.
const APPOINTMENT_INCLUDE = {
  artist: true,
  service: true,
  redeemedGiftCards: { select: { id: true, code: true, amount: true } },
} as const;

/**
 * Martes a sábado, 12:00–20:00 (horario general del estudio, el mismo que
 * carga el seed). Se aplica al crear un tatuador porque sin ninguna franja
 * getAvailableSlots() devuelve vacío TODOS los días: el tatuador queda
 * inservible en el wizard aunque figure activo y con servicios asignados, y
 * nada en la UI explica por qué. Es solo un punto de partida editable.
 */
const DEFAULT_WEEKLY_AVAILABILITY = [2, 3, 4, 5, 6].map((dayOfWeek) => ({
  dayOfWeek,
  startTime: '12:00',
  endTime: '20:00',
}));

const WEEKLY_AVAILABILITY_ORDER = [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] as const;

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly availabilityService: AvailabilityService,
    private readonly appointmentsService: AppointmentsService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Alta manual desde el panel (reserva por teléfono/WhatsApp).
   *
   * Delega en AppointmentsService.create() para no duplicar la validación de
   * disponibilidad ni la transacción SERIALIZABLE que evita la doble reserva
   * — un turno cargado a mano compite por los mismos slots que uno de la web.
   *
   * Cambia dos cosas respecto del alta pública:
   *  - Nace CONFIRMED: el estudio ya habló con el cliente, no hay nada que
   *    esperar. Dejarlo PENDING lo mostraría como "sin confirmar" para
   *    siempre.
   *  - No aplica el vencimiento de 15 minutos de la seña. Ese plazo existe
   *    para liberar el slot si el cliente no paga online; acá no hay pago
   *    online, así que activarlo haría que el cron de limpieza cancele el
   *    turno solo a los 15 minutos de haberlo cargado.
   *
   * La seña, si el servicio la pide, queda en NONE y la coordina el estudio
   * por su cuenta — salvo que se canjee una gift card, ver abajo.
   *
   * Con `giftCardCode`, el canje va DENTRO de la transacción que crea el
   * turno (hook onCreated): si la card no sirve, el turno no se crea, y si el
   * horario se ocupó en el ínterin, la card no queda quemada. Además el turno
   * nace con depositStatus PAID: la seña está cubierta por la card, y dejarla
   * en NONE la mostraría como pendiente de cobro en el panel para siempre.
   * Que fue con gift card y no con Mercado Pago se ve igual, porque el turno
   * queda vinculado a la card canjeada.
   */
  async createAppointment(dto: CreateAdminAppointmentDto) {
    const { giftCardCode, ...appointmentDto } = dto;

    const created = await this.appointmentsService.create(appointmentDto, {
      status: AppointmentStatus.CONFIRMED,
      applyDepositExpiry: false,
      ...(giftCardCode
        ? {
            depositStatus: DepositStatus.PAID,
            onCreated: (tx, appointmentId) =>
              this.redeemGiftCardInTransaction(tx, giftCardCode, appointmentId),
          }
        : {}),
    });

    // create() devuelve el turno pelado; el panel (y el email) necesitan
    // tatuador y servicio, igual que el resto de los endpoints de turnos.
    const appointment = await this.prisma.appointment.findUniqueOrThrow({
      where: { id: created.id },
      include: APPOINTMENT_INCLUDE,
    });

    // El turno nace CONFIRMED, así que el cliente merece la misma
    // confirmación que si hubiera reservado por la web — el flujo público la
    // manda desde el webhook de Mercado Pago, que acá nunca se dispara.
    //
    // Solo el mail al cliente: el aviso al estudio (sendStudioNotification)
    // existe para enterarlo de una reserva que entró sola, y este turno lo
    // acaba de cargar el estudio a mano. Si el cliente no dejó email, el
    // método no manda nada.
    //
    // Va fuera de toda transacción y envuelto en try/catch: un email caído no
    // puede voltear un turno ya creado. Mismo criterio que PaymentsService.
    try {
      await this.emailService.sendCustomerConfirmation(appointment);
    } catch (error) {
      this.logger.error(
        `Error inesperado enviando el email de confirmación del turno manual ${appointment.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    return appointment;
  }

  async findAppointments(dto: GetAdminAppointmentsDto) {
    const where: Prisma.AppointmentWhereInput = {};

    if (dto.status) where.status = dto.status;
    if (dto.artistId) where.artistId = dto.artistId;

    if (dto.date) {
      // Un día puntual manda por sobre from/to si vinieran los dos.
      const { start, end } = localCalendarDayRangeUtc(dto.date);
      where.startTime = { gte: start, lt: end };
    } else if (dto.from || dto.to) {
      where.startTime = {
        ...(dto.from ? { gte: localCalendarDayRangeUtc(dto.from).start } : {}),
        ...(dto.to ? { lt: localCalendarDayRangeUtc(dto.to).end } : {}),
      };
    } else {
      // Sin filtros de fecha: turnos futuros, no todo el historial.
      where.startTime = { gte: new Date() };
    }

    return this.prisma.appointment.findMany({
      where,
      include: APPOINTMENT_INCLUDE,
      orderBy: { startTime: 'asc' },
    });
  }

  async updateAppointment(id: string, dto: UpdateAdminAppointmentDto) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: APPOINTMENT_INCLUDE,
    });
    if (!appointment) {
      throw new NotFoundException('Turno no encontrado');
    }

    if (dto.status) {
      return this.prisma.appointment.update({
        where: { id },
        data: {
          status: dto.status,
          // Un turno CANCELLED no debería poder "expirar" — no tiene sentido.
          ...(dto.status === AppointmentStatus.CANCELLED ? { expiresAt: null } : {}),
        },
        include: APPOINTMENT_INCLUDE,
      });
    }

    if (dto.date && dto.startTime) {
      return this.rescheduleAppointment(appointment, dto.date, dto.startTime);
    }

    throw new BadRequestException('Mandá "status" para cancelar, o "date" + "startTime" para reprogramar');
  }

  /**
   * Revalida disponibilidad reusando AvailabilityService (mismo criterio
   * que un cliente reservando: día laboral, no bloqueado, sin solapar otro
   * turno) — la única diferencia con AppointmentsService.create() es que
   * acá excluimos al propio turno del chequeo de solapamiento, porque va a
   * dejar de ocupar su horario viejo.
   */
  private async rescheduleAppointment(
    appointment: Prisma.AppointmentGetPayload<{ include: typeof APPOINTMENT_INCLUDE }>,
    date: string,
    startTime: string,
  ) {
    const { artistId, service } = appointment;

    const weeklyAvailability = await this.prisma.weeklyAvailability.findMany({
      where: { artistId, dayOfWeek: dayOfWeekOf(date) },
    });
    if (weeklyAvailability.length === 0) {
      throw new ConflictException('El tatuador no atiende ese día');
    }

    const { start: blockStart, end: blockEnd } = naiveCalendarDayRangeUtc(date);
    const block = await this.prisma.availabilityBlock.findFirst({
      where: { artistId, date: { gte: blockStart, lt: blockEnd } },
    });
    if (block) {
      throw new ConflictException('Ese día está bloqueado para este tatuador');
    }

    const startMinutes = parseTimeToMinutes(startTime);
    const endMinutes = startMinutes + service.durationMinutes;
    const fitsWorkingHours = weeklyAvailability.some(
      (window) => startMinutes >= parseTimeToMinutes(window.startTime) && endMinutes <= parseTimeToMinutes(window.endTime),
    );
    if (!fitsWorkingHours) {
      throw new ConflictException('Ese horario cae fuera del horario laboral del tatuador');
    }

    const candidateStart = localCalendarTimeToUtc(date, startTime);
    const candidateEnd = new Date(candidateStart.getTime() + service.durationMinutes * 60_000);

    const busyAppointments = await this.availabilityService.findBusyAppointments(this.prisma, artistId, date);
    const othersOnly = busyAppointments.filter((busy) => busy.id !== appointment.id);
    if (this.availabilityService.hasOverlap(candidateStart, candidateEnd, othersOnly)) {
      throw new ConflictException('Ese horario ya está ocupado');
    }

    return this.prisma.appointment.update({
      where: { id: appointment.id },
      data: { startTime: candidateStart, endTime: candidateEnd },
      include: APPOINTMENT_INCLUDE,
    });
  }

  /**
   * Sin artistId bloquea el día para todos los tatuadores activos.
   *
   * Es idempotente por (tatuador, día): si ya existe un bloqueo se saltea en
   * vez de crear otro. No hay índice único que lo impida a nivel base, y sin
   * este chequeo cada click repetido dejaba una fila duplicada — así se
   * juntaron cientos de bloqueos basura en desarrollo.
   */
  async createAvailabilityBlock(dto: CreateAvailabilityBlockDto) {
    let artistIds: string[];
    if (dto.artistId) {
      const artist = await this.prisma.artist.findUnique({ where: { id: dto.artistId } });
      if (!artist) {
        throw new NotFoundException('Tatuador no encontrado');
      }
      artistIds = [artist.id];
    } else {
      // Los inactivos no se bloquean: ya no reciben turnos, sería ruido.
      const activeArtists = await this.prisma.artist.findMany({
        where: { active: true },
        select: { id: true },
      });
      if (activeArtists.length === 0) {
        throw new BadRequestException('No hay tatuadores activos para bloquear');
      }
      artistIds = activeArtists.map((artist) => artist.id);
    }

    // AvailabilityBlock.date es @db.Date → medianoche UTC "naive", sin
    // conversión de zona horaria (ver naiveCalendarDayRangeUtc).
    const { start, end } = naiveCalendarDayRangeUtc(dto.date);
    const existing = await this.prisma.availabilityBlock.findMany({
      where: { artistId: { in: artistIds }, date: { gte: start, lt: end } },
      select: { artistId: true },
    });
    const alreadyBlocked = new Set(existing.map((block) => block.artistId));
    const toCreate = artistIds.filter((artistId) => !alreadyBlocked.has(artistId));

    if (toCreate.length > 0) {
      await this.prisma.availabilityBlock.createMany({
        data: toCreate.map((artistId) => ({ artistId, date: start, reason: dto.reason })),
      });
    }

    return {
      created: toCreate.length,
      alreadyBlocked: alreadyBlocked.size,
      blocks: await this.prisma.availabilityBlock.findMany({
        where: { artistId: { in: artistIds }, date: { gte: start, lt: end } },
        include: { artist: { select: { id: true, name: true } } },
      }),
    };
  }

  /**
   * Bloqueos de hoy en adelante. Los pasados no se listan: no se pueden
   * "deshacer" en ningún sentido útil y taparían los que sí importan.
   */
  async listAvailabilityBlocks() {
    const todayStart = naiveCalendarDayRangeUtc(new Date().toISOString().slice(0, 10)).start;

    return this.prisma.availabilityBlock.findMany({
      where: { date: { gte: todayStart } },
      include: { artist: { select: { id: true, name: true } } },
      orderBy: [{ date: 'asc' }, { artistId: 'asc' }],
    });
  }

  async deleteAvailabilityBlock(id: string) {
    const block = await this.prisma.availabilityBlock.findUnique({ where: { id } });
    if (!block) {
      throw new NotFoundException('Bloqueo no encontrado');
    }

    // Borrar el bloqueo solo vuelve a ofrecer esos horarios; no toca ningún
    // turno (los que ya existían nunca se borraron al bloquear).
    return this.prisma.availabilityBlock.delete({ where: { id } });
  }

  // A diferencia de ArtistsService.findActiveArtists() (público, solo
  // activos, para el wizard de reserva), acá el panel necesita ver también
  // los inactivos para poder reactivarlos o editarlos.
  async listArtists() {
    return this.prisma.artist.findMany({ orderBy: { name: 'asc' } });
  }

  async createArtist(dto: CreateArtistDto, file?: Express.Multer.File) {
    return this.prisma.artist.create({
      data: {
        name: dto.name,
        bio: dto.bio,
        specialties: dto.specialties ?? [],
        imageUrl: file ? `${ARTIST_IMAGES_URL_PREFIX}/${file.filename}` : null,
        // Ver DEFAULT_WEEKLY_AVAILABILITY: sin franjas el tatuador nace roto.
        availability: { create: DEFAULT_WEEKLY_AVAILABILITY },
      },
    });
  }

  async updateArtist(id: string, dto: UpdateArtistDto, file?: Express.Multer.File) {
    const artist = await this.prisma.artist.findUnique({ where: { id } });
    if (!artist) {
      throw new NotFoundException('Tatuador no encontrado');
    }

    return this.prisma.artist.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.bio !== undefined ? { bio: dto.bio } : {}),
        ...(dto.specialties !== undefined ? { specialties: dto.specialties } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
        ...(file ? { imageUrl: `${ARTIST_IMAGES_URL_PREFIX}/${file.filename}` } : {}),
      },
    });
  }

  /**
   * Mismo criterio que deleteService(): si el tatuador nunca tuvo un turno no
   * hay historial que preservar y se borra de verdad; si tiene turnos, no se
   * puede borrar sin romper esos registros (FK desde Appointment.artistId, y
   * el turno viejo tiene que poder seguir mostrando de quién era), así que
   * degrada a desactivación.
   *
   * `deleted` le dice al panel cuál de las dos cosas pasó, y
   * `appointmentCount` le permite explicar por qué.
   *
   * Desactivar a secas no pasa por acá: es un PATCH con active=false.
   */
  async deleteArtist(id: string) {
    const artist = await this.prisma.artist.findUnique({ where: { id } });
    if (!artist) {
      throw new NotFoundException('Tatuador no encontrado');
    }

    const appointmentCount = await this.prisma.appointment.count({ where: { artistId: id } });
    if (appointmentCount > 0) {
      const deactivated = await this.prisma.artist.update({ where: { id }, data: { active: false } });
      return { deleted: false, appointmentCount, artist: deactivated };
    }

    // Todo lo que referencia al tatuador por FK tiene que irse primero.
    // Nada de esto es historial: son horarios, bloqueos y qué servicios
    // ofrecía, todo sin sentido sin el tatuador.
    const deleted = await this.prisma.$transaction(async (tx) => {
      await tx.weeklyAvailability.deleteMany({ where: { artistId: id } });
      await tx.availabilityBlock.deleteMany({ where: { artistId: id } });
      await tx.artistService.deleteMany({ where: { artistId: id } });
      return tx.artist.delete({ where: { id } });
    });

    return { deleted: true, appointmentCount: 0, artist: deleted };
  }

  async getWeeklyAvailability(artistId: string) {
    const artist = await this.prisma.artist.findUnique({ where: { id: artistId } });
    if (!artist) {
      throw new NotFoundException('Tatuador no encontrado');
    }

    return this.prisma.weeklyAvailability.findMany({
      where: { artistId },
      orderBy: [...WEEKLY_AVAILABILITY_ORDER],
    });
  }

  /**
   * Reemplaza la semana completa (ver SetWeeklyAvailabilityDto). Los turnos
   * ya agendados NO se tocan: guardan su propio startTime/endTime, así que
   * achicar el horario no los mueve ni los borra — solo deja de ofrecer esos
   * huecos de acá en adelante. Un turno que quede fuera del nuevo horario
   * sigue existiendo y se ve normal en el panel.
   */
  async setWeeklyAvailability(artistId: string, dto: SetWeeklyAvailabilityDto) {
    const artist = await this.prisma.artist.findUnique({ where: { id: artistId } });
    if (!artist) {
      throw new NotFoundException('Tatuador no encontrado');
    }

    for (const window of dto.windows) {
      if (parseTimeToMinutes(window.endTime) <= parseTimeToMinutes(window.startTime)) {
        throw new BadRequestException(
          `La franja del día ${window.dayOfWeek} termina antes de empezar (${window.startTime}–${window.endTime})`,
        );
      }
    }

    // deleteMany + createMany en una transacción: si algo falla, el tatuador
    // no queda a mitad de camino sin horarios.
    return this.prisma.$transaction(async (tx) => {
      await tx.weeklyAvailability.deleteMany({ where: { artistId } });
      if (dto.windows.length > 0) {
        await tx.weeklyAvailability.createMany({
          data: dto.windows.map((window) => ({ artistId, ...window })),
        });
      }
      return tx.weeklyAvailability.findMany({
        where: { artistId },
        orderBy: [...WEEKLY_AVAILABILITY_ORDER],
      });
    });
  }

  // Igual que listArtists(): el panel ve activos e inactivos (el wizard solo
  // ve activos). Devuelve los tatuadores que ofrecen cada servicio aplanados
  // a [{ id, name }] — el panel los muestra como referencia de un vistazo,
  // pero la asignación se edita desde el formulario del tatuador.
  async listServices() {
    const services = await this.prisma.service.findMany({
      orderBy: { name: 'asc' },
      include: { artists: { include: { artist: { select: { id: true, name: true } } } } },
    });

    return services.map(({ artists, ...service }) => ({
      ...service,
      artists: artists.map((link) => link.artist),
    }));
  }

  /**
   * Un servicio con seña pero sin monto dejaría el checkout de Mercado Pago
   * sin importe — se valida contra el estado RESULTANTE (no contra el DTO
   * suelto) para que valga igual en create y en update: un PATCH que solo
   * manda requiresDeposit=true tiene que fallar si el servicio no tenía
   * monto, y uno que solo manda depositAmount tiene que poder completar un
   * servicio que ya lo requería.
   */
  private assertDepositIsCoherent(requiresDeposit: boolean, depositAmount: number | null) {
    if (requiresDeposit && (depositAmount === null || depositAmount === undefined)) {
      throw new BadRequestException('Un servicio que requiere seña necesita un monto de seña');
    }
  }

  async createService(dto: CreateServiceDto) {
    const requiresDeposit = dto.requiresDeposit ?? false;
    this.assertDepositIsCoherent(requiresDeposit, dto.depositAmount ?? null);

    return this.prisma.service.create({
      data: {
        name: dto.name,
        durationMinutes: dto.durationMinutes,
        requiresDeposit,
        // Sin seña no guardamos monto: si no, quedaría un valor viejo colgado
        // que reaparecería solo al reactivar requiresDeposit más adelante.
        depositAmount: requiresDeposit ? dto.depositAmount : null,
      },
    });
  }

  async updateService(id: string, dto: UpdateServiceDto) {
    const service = await this.prisma.service.findUnique({ where: { id } });
    if (!service) {
      throw new NotFoundException('Servicio no encontrado');
    }

    const requiresDeposit = dto.requiresDeposit ?? service.requiresDeposit;
    const depositAmount =
      dto.depositAmount !== undefined
        ? dto.depositAmount
        : service.depositAmount !== null
          ? Number(service.depositAmount)
          : null;
    this.assertDepositIsCoherent(requiresDeposit, depositAmount);

    return this.prisma.service.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.durationMinutes !== undefined ? { durationMinutes: dto.durationMinutes } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
        requiresDeposit,
        depositAmount: requiresDeposit ? depositAmount : null,
      },
    });
  }

  /**
   * A diferencia de deactivateArtist() (que nunca borra), un servicio que
   * todavía no se usó en ningún turno no tiene historial que preservar, así
   * que se borra de verdad — es lo que uno espera después de cargar un
   * servicio mal y querer deshacerlo. Con turnos asociados sí hay que
   * conservarlo (FK desde Appointment.serviceId, y el turno viejo tiene que
   * poder seguir mostrando qué era), así que ahí degrada a desactivación.
   *
   * `deleted` le dice al panel cuál de las dos cosas pasó, para poder avisar
   * "se desactivó porque ya tiene turnos" en vez de mentir con "borrado".
   */
  async deleteService(id: string) {
    const service = await this.prisma.service.findUnique({ where: { id } });
    if (!service) {
      throw new NotFoundException('Servicio no encontrado');
    }

    const appointmentCount = await this.prisma.appointment.count({ where: { serviceId: id } });
    if (appointmentCount > 0) {
      const deactivated = await this.prisma.service.update({ where: { id }, data: { active: false } });
      return { deleted: false, appointmentCount, service: deactivated };
    }

    // Las filas de ArtistService apuntan al servicio por FK, así que hay que
    // sacarlas primero o el DELETE falla.
    const deleted = await this.prisma.$transaction(async (tx) => {
      await tx.artistService.deleteMany({ where: { serviceId: id } });
      return tx.service.delete({ where: { id } });
    });

    return { deleted: true, appointmentCount: 0, service: deleted };
  }

  // ---------------------------------------------------------------------
  // Gift cards — montos configurables
  //
  // Los tiers son solo el catálogo de montos que ofrece el estudio. Las gift
  // cards emitidas (modelo GiftCard) guardan su propio `amount` como
  // snapshot y NO apuntan al tier, así que editar o desactivar un tier nunca
  // toca una card ya vendida. Por eso acá no hay degradación a desactivar ni
  // conteos de uso como en artistas o servicios.
  // ---------------------------------------------------------------------

  /**
   * Busca una gift card por su código para el panel.
   *
   * Devuelve los datos SIEMPRE que exista, incluso si no se puede usar, con el
   * motivo del rechazo: el admin tiene al cliente enfrente y necesita poder
   * decirle "esta se canjeó el 3 de julio", no solo "no sirve".
   */
  async findGiftCardByCode(rawCode: string) {
    const code = canonicalizeGiftCardCode(rawCode);
    // Un código con formato imposible es indistinguible de uno inexistente
    // para quien lo está tipeando, así que se responde igual.
    const giftCard = code ? await this.prisma.giftCard.findUnique({ where: { code } }) : null;

    if (!giftCard) {
      throw new NotFoundException('No encontramos ninguna gift card con ese código');
    }

    const rejectionReason = giftCardRejectionReason(giftCard);
    return { ...giftCard, redeemable: rejectionReason === null, rejectionReason };
  }

  /**
   * Valida y canjea la card DENTRO de la transacción que crea el turno.
   *
   * El update condicionado a status ACTIVE (updateMany + chequeo de count, que
   * es la única forma de filtrar por un campo no único) es lo que hace que dos
   * canjes simultáneos del mismo código no puedan pasar los dos: el segundo
   * afecta 0 filas y aborta. Validar antes con un findUnique y después
   * actualizar sin condición dejaría esa ventana abierta.
   */
  private async redeemGiftCardInTransaction(
    tx: Prisma.TransactionClient,
    rawCode: string,
    appointmentId: string,
  ) {
    const code = canonicalizeGiftCardCode(rawCode);
    const giftCard = code ? await tx.giftCard.findUnique({ where: { code } }) : null;
    if (!giftCard) {
      throw new NotFoundException('No encontramos ninguna gift card con ese código');
    }

    const rejectionReason = giftCardRejectionReason(giftCard);
    if (rejectionReason) {
      throw new BadRequestException(rejectionReason);
    }

    const { count } = await tx.giftCard.updateMany({
      where: { id: giftCard.id, status: GiftCardStatus.ACTIVE },
      data: {
        status: GiftCardStatus.REDEEMED,
        redeemedAt: new Date(),
        redeemedByAppointmentId: appointmentId,
      },
    });

    if (count !== 1) {
      throw new ConflictException('Esta gift card se acaba de canjear en otro turno');
    }
  }

  async listGiftCardTiers() {
    // Activos e inactivos: es la vista de administración. El listado público
    // (fase de compra) va a filtrar por active.
    return this.prisma.giftCardTier.findMany({ orderBy: { amount: 'asc' } });
  }

  async createGiftCardTier(dto: CreateGiftCardTierDto) {
    return this.prisma.giftCardTier.create({
      data: {
        amount: dto.amount,
        label: dto.label ?? null,
        active: dto.active ?? true,
      },
    });
  }

  async updateGiftCardTier(id: string, dto: UpdateGiftCardTierDto) {
    const tier = await this.prisma.giftCardTier.findUnique({ where: { id } });
    if (!tier) {
      throw new NotFoundException('Monto de gift card no encontrado');
    }

    return this.prisma.giftCardTier.update({
      where: { id },
      data: {
        ...(dto.amount !== undefined ? { amount: dto.amount } : {}),
        // null es un valor válido acá (borrar el label), por eso se compara
        // contra undefined y no se usa un ?? que lo confundiría con "no vino".
        ...(dto.label !== undefined ? { label: dto.label } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
      },
    });
  }

  private async assertArtistAndServiceExist(artistId: string, serviceId: string) {
    const [artist, service] = await Promise.all([
      this.prisma.artist.findUnique({ where: { id: artistId } }),
      this.prisma.service.findUnique({ where: { id: serviceId } }),
    ]);
    if (!artist) {
      throw new NotFoundException('Tatuador no encontrado');
    }
    if (!service) {
      throw new NotFoundException('Servicio no encontrado');
    }
  }

  // upsert en vez de create: reasignar algo que ya estaba asignado no es un
  // error desde el panel (el checkbox ya estaba tildado), y así no hay que
  // atrapar el P2002 de la PK compuesta.
  async assignServiceToArtist(artistId: string, serviceId: string) {
    await this.assertArtistAndServiceExist(artistId, serviceId);

    return this.prisma.artistService.upsert({
      where: { artistId_serviceId: { artistId, serviceId } },
      create: { artistId, serviceId },
      update: {},
    });
  }

  // Los turnos ya agendados guardan su propio artistId/serviceId (no apuntan
  // a ArtistService), así que desasignar no toca el historial: solo deja de
  // ofrecer esa combinación en el wizard de acá en adelante.
  //
  // deleteMany en vez de delete para que desasignar algo que no estaba
  // asignado sea idempotente en vez de tirar P2025.
  async unassignServiceFromArtist(artistId: string, serviceId: string) {
    await this.assertArtistAndServiceExist(artistId, serviceId);
    await this.prisma.artistService.deleteMany({ where: { artistId, serviceId } });

    return { artistId, serviceId, assigned: false };
  }

  // --- Galería de trabajos -------------------------------------------------

  /**
   * El panel ve activas e inactivas (la página pública solo las activas), y
   * ordenadas por fecha de carga descendente: lo último que se subió es lo que
   * el estudio quiere revisar.
   */
  async listGalleryImages() {
    return this.prisma.galleryImage.findMany({
      orderBy: { createdAt: 'desc' },
      include: { artist: { select: { id: true, name: true } } },
    });
  }

  async createGalleryImage(dto: CreateGalleryImageDto, file?: Express.Multer.File) {
    // Sin archivo no hay nada que mostrar. A diferencia de un tatuador, que
    // puede existir sin foto, una entrada de galería ES la foto.
    if (!file) {
      throw new BadRequestException('Hace falta subir una imagen');
    }

    // Se valida antes de escribir: la FK tiraría igual, pero con un error de
    // Prisma que el panel no puede explicar. Además evita dejar el archivo
    // huérfano en disco por un id mal tipeado.
    if (dto.artistId) {
      await this.assertArtistExists(dto.artistId);
    }

    return this.prisma.galleryImage.create({
      data: {
        imageUrl: `${GALLERY_IMAGES_URL_PREFIX}/${file.filename}`,
        styles: dto.styles ?? [],
        artistId: dto.artistId ?? null,
        caption: dto.caption ?? null,
        width: dto.width ?? null,
        height: dto.height ?? null,
      },
      include: { artist: { select: { id: true, name: true } } },
    });
  }

  async updateGalleryImage(id: string, dto: UpdateGalleryImageDto, file?: Express.Multer.File) {
    const image = await this.prisma.galleryImage.findUnique({ where: { id } });
    if (!image) {
      throw new NotFoundException('Foto no encontrada');
    }

    if (dto.artistId) {
      await this.assertArtistExists(dto.artistId);
    }

    return this.prisma.galleryImage.update({
      where: { id },
      data: {
        // El spread condicional distingue "no mandaron el campo" (undefined,
        // no se toca) de "lo mandaron vacío" (null, se borra). Para artistId y
        // caption las dos cosas son intenciones distintas y válidas.
        ...(dto.styles !== undefined ? { styles: dto.styles } : {}),
        ...(dto.artistId !== undefined ? { artistId: dto.artistId } : {}),
        ...(dto.caption !== undefined ? { caption: dto.caption } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
        // Las dimensiones se escriben SOLO junto con un archivo nuevo. Un
        // PATCH que solo cambia el estilo no trae medidas, y aceptarlas
        // sueltas dejaría la proporción apuntando a una imagen que ya no está.
        ...(file
          ? {
              imageUrl: `${GALLERY_IMAGES_URL_PREFIX}/${file.filename}`,
              width: dto.width ?? null,
              height: dto.height ?? null,
            }
          : {}),
      },
      include: { artist: { select: { id: true, name: true } } },
    });
  }

  /**
   * Borrado real, a diferencia de deleteArtist()/deleteService(), que degradan
   * a desactivación. Acá se puede porque nada apunta a una GalleryImage: no
   * hay historial que preservar ni FK entrante que romper. Una foto que el
   * estudio quiere sacar de la vista pero conservar se desactiva con un PATCH.
   *
   * El archivo en disco queda. Es a propósito por ahora: borrarlo hace que un
   * error de dedo sea irreversible, y pesan poco. Si algún día molesta, el
   * lugar es acá.
   */
  async deleteGalleryImage(id: string) {
    const image = await this.prisma.galleryImage.findUnique({ where: { id } });
    if (!image) {
      throw new NotFoundException('Foto no encontrada');
    }

    return this.prisma.galleryImage.delete({ where: { id } });
  }

  private async assertArtistExists(artistId: string) {
    const artist = await this.prisma.artist.findUnique({ where: { id: artistId } });
    if (!artist) {
      throw new BadRequestException('El tatuador indicado no existe');
    }
  }
}
