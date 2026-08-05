import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AppointmentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AvailabilityService, parseTimeToMinutes } from '../availability/availability.service';
import { dayOfWeekOf, localCalendarDayRangeUtc, localCalendarTimeToUtc, naiveCalendarDayRangeUtc } from '../common/timezone';
import { GetAdminAppointmentsDto } from './dto/get-admin-appointments.dto';
import { UpdateAdminAppointmentDto } from './dto/update-admin-appointment.dto';
import { CreateAvailabilityBlockDto } from './dto/create-availability-block.dto';
import { CreateArtistDto } from './dto/create-artist.dto';
import { UpdateArtistDto } from './dto/update-artist.dto';
import { ARTIST_IMAGES_URL_PREFIX } from '../uploads.constants';

const APPOINTMENT_INCLUDE = { artist: true, service: true } as const;

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availabilityService: AvailabilityService,
  ) {}

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

  async createAvailabilityBlock(dto: CreateAvailabilityBlockDto) {
    const artist = await this.prisma.artist.findUnique({ where: { id: dto.artistId } });
    if (!artist) {
      throw new NotFoundException('Tatuador no encontrado');
    }

    return this.prisma.availabilityBlock.create({
      data: {
        artistId: dto.artistId,
        date: new Date(`${dto.date}T00:00:00.000Z`),
        reason: dto.reason,
      },
    });
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

  // No hay DELETE real: un tatuador con turnos asociados (pasados o
  // futuros) no se puede borrar sin romper esos registros (FK a
  // Appointment.artistId). "Borrar" acá significa desactivar — el mismo
  // efecto que PATCH .../active=false, expuesto como endpoint separado
  // porque es la acción que dispara el botón "Eliminar" del panel. El
  // tatuador deja de aparecer en el wizard de reserva (ArtistsService
  // filtra por active) pero su historial y el registro en sí quedan
  // intactos.
  async deactivateArtist(id: string) {
    const artist = await this.prisma.artist.findUnique({ where: { id } });
    if (!artist) {
      throw new NotFoundException('Tatuador no encontrado');
    }

    return this.prisma.artist.update({ where: { id }, data: { active: false } });
  }
}
