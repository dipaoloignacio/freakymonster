import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AppointmentStatus, PrismaClient } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  calendarDaysOfMonth,
  dayOfWeekOf,
  localCalendarDayRangeUtc,
  localCalendarTimeToUtc,
  naiveCalendarDayRangeUtc,
} from '../common/timezone';
import { GetAvailabilityDto } from './dto/get-availability.dto';
import { GetMonthAvailabilityDto } from './dto/get-month-availability.dto';

// Ver convención de zona horaria del proyecto en src/common/timezone.ts.

// Exportado porque AdminService también lo necesita (revalidar horario al
// reprogramar) — no lo reimplementes ahí.
export function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToHHMM(totalMinutes: number): string {
  const hh = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const mm = String(totalMinutes % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

interface AppointmentRange {
  id: string;
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

    // Este es el punto donde se hace cumplir `active`, no solo el listado del
    // wizard: AppointmentsService.create() pasa por acá, así que un servicio
    // (o un tatuador) desactivado deja de ser reservable incluso para alguien
    // con el wizard viejo abierto o pegándole a la API directo con los ids.
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
    });
    if (!service || !service.active) {
      throw new NotFoundException('Servicio no encontrado');
    }

    const artistService = await this.prisma.artistService.findUnique({
      where: { artistId_serviceId: { artistId, serviceId } },
      include: { artist: { select: { active: true } } },
    });
    if (!artistService) {
      throw new BadRequestException('Este tatuador no ofrece este servicio');
    }
    if (!artistService.artist.active) {
      throw new NotFoundException('Tatuador no encontrado');
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

    return this.buildSlots(date, weeklyAvailability, service.durationMinutes, existingAppointments);
  }

  /**
   * Genera la grilla de slots libres de UN día. Única fuente de verdad del
   * cálculo: la usan getAvailableSlots() (día puntual) y
   * getMonthAvailability() (mes completo). Tienen que compartirla sí o sí —
   * si divergen, el calendario del wizard diría "hay lugar" y al entrar al
   * día no habría nada, que es exactamente el bug que el calendario venía a
   * resolver.
   */
  private buildSlots(
    date: string,
    windows: { startTime: string; endTime: string }[],
    durationMinutes: number,
    busyAppointments: AppointmentRange[],
  ): string[] {
    const availableSlots: string[] = [];

    for (const window of windows) {
      const windowStart = parseTimeToMinutes(window.startTime);
      const windowEnd = parseTimeToMinutes(window.endTime);

      for (let slotStart = windowStart; slotStart + durationMinutes <= windowEnd; slotStart += durationMinutes) {
        const candidateStart = localCalendarTimeToUtc(date, minutesToHHMM(slotStart));
        const candidateEnd = localCalendarTimeToUtc(date, minutesToHHMM(slotStart + durationMinutes));

        if (!this.hasOverlap(candidateStart, candidateEnd, busyAppointments)) {
          availableSlots.push(candidateStart.toISOString());
        }
      }
    }

    return availableSlots;
  }

  /**
   * Qué días de un mes tienen al menos un turno libre, para que el
   * calendario del wizard pueda deshabilitar los completos sin que el
   * cliente tenga que entrar día por día a descubrirlo.
   *
   * Hace 3 consultas fijas (horarios, bloqueos y turnos del mes entero) y
   * después resuelve los ~31 días en memoria — no una consulta por día.
   */
  async getMonthAvailability(dto: GetMonthAvailabilityDto): Promise<string[]> {
    const { artistId, serviceId, month } = dto;

    const service = await this.prisma.service.findUnique({ where: { id: serviceId } });
    if (!service || !service.active) {
      throw new NotFoundException('Servicio no encontrado');
    }

    const artistService = await this.prisma.artistService.findUnique({
      where: { artistId_serviceId: { artistId, serviceId } },
      include: { artist: { select: { active: true } } },
    });
    if (!artistService) {
      throw new BadRequestException('Este tatuador no ofrece este servicio');
    }
    if (!artistService.artist.active) {
      throw new NotFoundException('Tatuador no encontrado');
    }

    const days = calendarDaysOfMonth(month);
    const monthStart = localCalendarDayRangeUtc(days[0]).start;
    const monthEnd = localCalendarDayRangeUtc(days[days.length - 1]).end;

    const weeklyAvailability = await this.prisma.weeklyAvailability.findMany({ where: { artistId } });
    if (weeklyAvailability.length === 0) {
      return [];
    }
    const windowsByDayOfWeek = new Map<number, { startTime: string; endTime: string }[]>();
    for (const window of weeklyAvailability) {
      const list = windowsByDayOfWeek.get(window.dayOfWeek) ?? [];
      list.push(window);
      windowsByDayOfWeek.set(window.dayOfWeek, list);
    }

    // AvailabilityBlock.date es @db.Date → se compara "naive" (ver
    // naiveCalendarDayRangeUtc). Por eso el rango de bloqueos NO es el mismo
    // que el de turnos, aunque cubran el mismo mes.
    const blocks = await this.prisma.availabilityBlock.findMany({
      where: {
        artistId,
        date: { gte: naiveCalendarDayRangeUtc(days[0]).start, lt: naiveCalendarDayRangeUtc(days[days.length - 1]).end },
      },
    });
    const blockedDates = new Set(blocks.map((block) => block.date.toISOString().slice(0, 10)));

    // Mismo criterio de "ocupado" que findBusyAppointments(), pero para todo
    // el mes de una: CONFIRMED, más PENDING que no hayan vencido.
    const now = new Date();
    const monthAppointments = await this.prisma.appointment.findMany({
      where: {
        artistId,
        startTime: { gte: monthStart, lt: monthEnd },
        OR: [
          { status: AppointmentStatus.CONFIRMED },
          { status: AppointmentStatus.PENDING, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
        ],
      },
      select: { id: true, startTime: true, endTime: true },
    });

    const availableDates: string[] = [];
    for (const date of days) {
      if (blockedDates.has(date)) continue;

      const windows = windowsByDayOfWeek.get(dayOfWeekOf(date));
      if (!windows) continue;

      const { start, end } = localCalendarDayRangeUtc(date);
      const busy = monthAppointments.filter(
        (appointment) => appointment.startTime >= start && appointment.startTime < end,
      );

      if (this.buildSlots(date, windows, service.durationMinutes, busy).length > 0) {
        availableDates.push(date);
      }
    }

    return availableDates;
  }
}
