import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AppointmentStatus, PrismaClient } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  dayOfWeekOf,
  localCalendarDayRangeUtc,
  localCalendarTimeToUtc,
  naiveCalendarDayRangeUtc,
} from '../common/timezone';
import { GetAvailabilityDto } from './dto/get-availability.dto';

// Ver convención de zona horaria del proyecto en src/common/timezone.ts.

function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToHHMM(totalMinutes: number): string {
  const hh = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const mm = String(totalMinutes % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

interface AppointmentRange {
  startTime: Date;
  endTime: Date;
}

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Determina si [candidateStart, candidateEnd) se solapa con alguno de los
   * turnos existentes. Única fuente de verdad para "overlap": la usa tanto
   * getAvailableSlots() (para filtrar la grilla) como AppointmentsService
   * (para el re-chequeo dentro de la transacción al crear un turno) — no
   * la reimplementes en otro lado.
   */
  hasOverlap(candidateStart: Date, candidateEnd: Date, existingAppointments: AppointmentRange[]): boolean {
    return existingAppointments.some(
      (appointment) => candidateStart < appointment.endTime && candidateEnd > appointment.startTime,
    );
  }

  /**
   * Turnos que ocupan un horario de un tatuador en la fecha calendario
   * `date` (hora Mendoza): todos los CONFIRMED, más los PENDING que todavía
   * no vencieron (expiresAt null o en el futuro). Un PENDING con expiresAt
   * ya pasado NO cuenta como ocupado — el slot se libera solo, en tiempo
   * real, sin depender de que el cron de limpieza ya haya pasado a
   * cancelarlo (ver AppointmentExpiryCleanupService).
   *
   * Acepta tanto `this.prisma` como el cliente de una transacción (`tx`),
   * para poder reusarse dentro de un `$transaction`.
   */
  async findBusyAppointments(
    client: Pick<PrismaClient, 'appointment'>,
    artistId: string,
    date: string,
  ): Promise<AppointmentRange[]> {
    const { start, end } = localCalendarDayRangeUtc(date);
    const now = new Date();
    return client.appointment.findMany({
      where: {
        artistId,
        startTime: { gte: start, lt: end },
        OR: [
          { status: AppointmentStatus.CONFIRMED },
          {
            status: AppointmentStatus.PENDING,
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          },
        ],
      },
    });
  }

  async getAvailableSlots(dto: GetAvailabilityDto): Promise<string[]> {
    const { artistId, serviceId, date } = dto;

    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
    });
    if (!service) {
      throw new NotFoundException('Servicio no encontrado');
    }

    const artistService = await this.prisma.artistService.findUnique({
      where: { artistId_serviceId: { artistId, serviceId } },
    });
    if (!artistService) {
      throw new BadRequestException('Este tatuador no ofrece este servicio');
    }

    const dayOfWeek = dayOfWeekOf(date);

    const weeklyAvailability = await this.prisma.weeklyAvailability.findMany({
      where: { artistId, dayOfWeek },
    });
    if (weeklyAvailability.length === 0) {
      return [];
    }

    // AvailabilityBlock.date es @db.Date (fecha calendario, sin hora ni zona
    // horaria) → se compara "naive", no como instante real.
    const { start: blockDayStart, end: blockDayEnd } = naiveCalendarDayRangeUtc(date);
    const block = await this.prisma.availabilityBlock.findFirst({
      where: { artistId, date: { gte: blockDayStart, lt: blockDayEnd } },
    });
    if (block) {
      return [];
    }

    const existingAppointments = await this.findBusyAppointments(this.prisma, artistId, date);

    const duration = service.durationMinutes;
    const availableSlots: string[] = [];

    for (const window of weeklyAvailability) {
      const windowStart = parseTimeToMinutes(window.startTime);
      const windowEnd = parseTimeToMinutes(window.endTime);

      for (let slotStart = windowStart; slotStart + duration <= windowEnd; slotStart += duration) {
        const slotEnd = slotStart + duration;
        const candidateStart = localCalendarTimeToUtc(date, minutesToHHMM(slotStart));
        const candidateEnd = localCalendarTimeToUtc(date, minutesToHHMM(slotEnd));

        if (!this.hasOverlap(candidateStart, candidateEnd, existingAppointments)) {
          availableSlots.push(candidateStart.toISOString());
        }
      }
    }

    return availableSlots;
  }
}
