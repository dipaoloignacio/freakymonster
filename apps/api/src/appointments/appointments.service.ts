import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { AppointmentStatus, DepositStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AvailabilityService } from '../availability/availability.service';
import { EmailService } from '../notifications/email.service';
import { localCalendarTimeToUtc } from '../common/timezone';
import { CreateAppointmentInput } from './dto/appointment-base.dto';

const SLOT_TAKEN_MESSAGE = 'Este horario ya no está disponible';

export interface CreateAppointmentOptions {
  /**
   * Estado inicial fijo. Lo usa el panel, que crea CONFIRMED siempre: un turno
   * cargado a mano ya viene acordado por teléfono/WhatsApp.
   *
   * Si no viene —el caso del wizard público— el estado se deriva de si el
   * servicio pide seña: ver la lógica en create().
   */
  status?: AppointmentStatus;
  /**
   * Si el turno tiene que vencer a los 15 minutos cuando el servicio pide
   * seña. Solo aplica al flujo público, donde ese plazo es la ventana para
   * pagar online: en un turno cargado por el estudio no hay pago online que
   * esperar, y dejarlo activado haría que AppointmentExpiryCleanupService lo
   * cancele solo a los 15 minutos.
   */
  applyDepositExpiry: boolean;
  /**
   * Estado de seña con el que nace el turno. Por defecto NONE: la seña la
   * marca el webhook de Mercado Pago. El alta con gift card lo pisa con PAID,
   * porque esa seña ya quedó cubierta.
   */
  depositStatus?: DepositStatus;
  /**
   * Corre DENTRO de la transacción que crea el turno, con el turno ya
   * insertado. Existe para el canje de gift cards: marcar la card y crear el
   * turno tienen que ser atómicos — si el canje falla, el turno no puede
   * quedar creado, y si el turno falla por doble reserva, la card no puede
   * quedar quemada. Lanzar acá aborta las dos cosas.
   */
  onCreated?: (tx: Prisma.TransactionClient, appointmentId: string) => Promise<void>;
}

const PUBLIC_BOOKING: CreateAppointmentOptions = {
  applyDepositExpiry: true,
};

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly availabilityService: AvailabilityService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * `options` existe para que el alta manual del panel (AdminService) pueda
   * reusar TODA esta lógica — validación de disponibilidad y, sobre todo, la
   * transacción SERIALIZABLE de más abajo — sin duplicarla. Duplicar el
   * check-then-insert sería la forma más fácil de terminar con dos criterios
   * distintos de doble reserva.
   */
  async create(dto: CreateAppointmentInput, options: CreateAppointmentOptions = PUBLIC_BOOKING) {
    const { artistId, serviceId, date, startTime, customerName, customerPhone, customerEmail, notes } = dto;

    // Reusa TODA la validación de reglas de negocio + la grilla de slots que
    // ya vive en AvailabilityService: servicio existe (404), tatuador ofrece
    // el servicio (400), día laboral, no bloqueado, slots ya ocupados. Esto
    // es solo la primera pasada — no alcanza por sí sola, ver más abajo.
    const availableSlots = await this.availabilityService.getAvailableSlots({ artistId, serviceId, date });

    const candidateStart = localCalendarTimeToUtc(date, startTime);
    const requestedIso = candidateStart.toISOString();

    if (!availableSlots.includes(requestedIso)) {
      throw new ConflictException(SLOT_TAKEN_MESSAGE);
    }

    const service = await this.prisma.service.findUnique({ where: { id: serviceId } });
    const candidateEnd = new Date(candidateStart.getTime() + service!.durationMinutes * 60_000);

    // Solo los servicios que requieren seña expiran (le damos 15 minutos al
    // cliente para pagar antes de liberar el slot).
    const expiresAt =
      options.applyDepositExpiry && service!.requiresDeposit ? new Date(Date.now() + 15 * 60_000) : null;

    // Sin `status` explícito (wizard público), el estado sale de la seña:
    //  - Con seña: PENDING. Falta el pago, y hasta que el webhook de Mercado
    //    Pago lo confirme el turno no está cerrado.
    //  - Sin seña: CONFIRMED directo. No hay nada que esperar — dejarlo
    //    PENDING obligaba a alguien del estudio a confirmarlo a mano, y
    //    mientras tanto el cliente veía su reserva como "sin confirmar" sin
    //    que hubiera nada que él pudiera hacer al respecto.
    const status =
      options.status ??
      (service!.requiresDeposit ? AppointmentStatus.PENDING : AppointmentStatus.CONFIRMED);

    // Entre el chequeo de arriba y este INSERT puede colarse otra reserva
    // (dos clientes pidiendo el mismo slot casi al mismo tiempo). Por eso el
    // create va envuelto en una transacción con aislamiento SERIALIZABLE:
    // Postgres usa serializable snapshot isolation (SSI) con predicate locks,
    // así que detecta el "write skew" (dos transacciones que cada una ve el
    // slot libre y ambas insertan) aunque ninguna vea la fila de la otra —
    // una de las dos falla al hacer COMMIT con SQLSTATE 40001 (Prisma P2034).
    // REPEATABLE READ NO alcanza acá: usa snapshot isolation sin predicate
    // locks, y como el turno todavía no existe como fila, no hay nada que
    // bloquear — las dos transacciones podrían commitear igual (doble
    // reserva). Por eso el nivel mínimo válido para este patrón
    // check-then-insert es SERIALIZABLE.
    let appointment: { id: string };
    try {
      appointment = await this.prisma.$transaction(
        async (tx) => {
          const busyAppointments = await this.availabilityService.findBusyAppointments(tx, artistId, date);

          if (this.availabilityService.hasOverlap(candidateStart, candidateEnd, busyAppointments)) {
            throw new ConflictException(SLOT_TAKEN_MESSAGE);
          }

          const appointment = await tx.appointment.create({
            data: {
              artistId,
              serviceId,
              customerName,
              customerPhone,
              customerEmail,
              notes,
              startTime: candidateStart,
              endTime: candidateEnd,
              status,
              // NONE salvo que quien llama diga lo contrario: la seña la marca
              // el webhook de Mercado Pago (flujo público) o la coordina el
              // estudio por afuera (alta manual). El único caso que nace
              // pagado es el canje de gift card.
              depositStatus: options.depositStatus ?? DepositStatus.NONE,
              expiresAt,
            },
          });

          // Después del insert y todavía dentro de la transacción: si esto
          // lanza, el turno se va con él.
          if (options.onCreated) {
            await options.onCreated(tx, appointment.id);
          }

          return appointment;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        throw new ConflictException(SLOT_TAKEN_MESSAGE);
      }
      throw error;
    }

    // Un turno que nace CONFIRMED por no requerir seña no pasa por el webhook
    // de Mercado Pago, que es de donde salen los mails del flujo público: sin
    // esto, el cliente no recibe nada y —más importante— el estudio tampoco se
    // entera de que entró una reserva. Antes ese aviso lo daba, de hecho, el
    // paso manual de confirmarla en el panel.
    //
    // Solo cuando el estado lo derivamos nosotros (`options.status` ausente =
    // wizard público): el alta del panel pasa un estado explícito y manda su
    // propio mail, así que entrar acá le duplicaría el envío.
    if (options.status === undefined && status === AppointmentStatus.CONFIRMED) {
      await this.notifyAutoConfirmed(appointment.id);
    }

    return appointment;
  }

  /**
   * Los dos avisos de un turno auto-confirmado. Fuera de la transacción y
   * envuelto: el turno ya está creado y un email caído no puede deshacerlo
   * — mismo criterio que PaymentsService y AdminService.
   */
  private async notifyAutoConfirmed(appointmentId: string): Promise<void> {
    try {
      const appointment = await this.prisma.appointment.findUniqueOrThrow({
        where: { id: appointmentId },
        include: { artist: true, service: true },
      });
      await this.emailService.sendCustomerConfirmation(appointment);
      await this.emailService.sendStudioNotification(appointment);
    } catch (error) {
      this.logger.error(
        `Error inesperado enviando los mails del turno auto-confirmado ${appointmentId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
