import { ConflictException, Injectable } from '@nestjs/common';
import { AppointmentStatus, DepositStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AvailabilityService } from '../availability/availability.service';
import { localCalendarTimeToUtc } from '../common/timezone';
import { CreateAppointmentDto } from './dto/create-appointment.dto';

const SLOT_TAKEN_MESSAGE = 'Este horario ya no está disponible';

export interface CreateAppointmentOptions {
  /**
   * Estado inicial. El wizard público crea PENDING (falta que el cliente
   * pague o que el estudio confirme); el panel crea CONFIRMED, porque un
   * turno cargado a mano ya viene acordado por teléfono/WhatsApp.
   */
  status: AppointmentStatus;
  /**
   * Si el turno tiene que vencer a los 15 minutos cuando el servicio pide
   * seña. Solo aplica al flujo público, donde ese plazo es la ventana para
   * pagar online: en un turno cargado por el estudio no hay pago online que
   * esperar, y dejarlo activado haría que AppointmentExpiryCleanupService lo
   * cancele solo a los 15 minutos.
   */
  applyDepositExpiry: boolean;
}

const PUBLIC_BOOKING: CreateAppointmentOptions = {
  status: AppointmentStatus.PENDING,
  applyDepositExpiry: true,
};

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availabilityService: AvailabilityService,
  ) {}

  /**
   * `options` existe para que el alta manual del panel (AdminService) pueda
   * reusar TODA esta lógica — validación de disponibilidad y, sobre todo, la
   * transacción SERIALIZABLE de más abajo — sin duplicarla. Duplicar el
   * check-then-insert sería la forma más fácil de terminar con dos criterios
   * distintos de doble reserva.
   */
  async create(dto: CreateAppointmentDto, options: CreateAppointmentOptions = PUBLIC_BOOKING) {
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
    // cliente para pagar antes de liberar el slot). Si no requiere seña, el
    // turno queda PENDING sin presión de tiempo — alguien del estudio lo
    // confirma a mano después.
    const expiresAt =
      options.applyDepositExpiry && service!.requiresDeposit ? new Date(Date.now() + 15 * 60_000) : null;

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
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const busyAppointments = await this.availabilityService.findBusyAppointments(tx, artistId, date);

          if (this.availabilityService.hasOverlap(candidateStart, candidateEnd, busyAppointments)) {
            throw new ConflictException(SLOT_TAKEN_MESSAGE);
          }

          return tx.appointment.create({
            data: {
              artistId,
              serviceId,
              customerName,
              customerPhone,
              customerEmail,
              notes,
              startTime: candidateStart,
              endTime: candidateEnd,
              status: options.status,
              // Siempre NONE al crear: la seña la marca el webhook de Mercado
              // Pago (flujo público) o la coordina el estudio por afuera
              // (alta manual). Nunca se da por pagada al crear el turno.
              depositStatus: DepositStatus.NONE,
              expiresAt,
            },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        throw new ConflictException(SLOT_TAKEN_MESSAGE);
      }
      throw error;
    }
  }
}
