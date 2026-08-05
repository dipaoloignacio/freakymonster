import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ArtistsService {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveArtists() {
    return this.prisma.artist.findMany({
      where: { active: true },
      select: { id: true, name: true, bio: true, specialties: true, imageUrl: true },
      orderBy: { name: 'asc' },
    });
  }

  async findServicesForArtist(artistId: string) {
    const artist = await this.prisma.artist.findUnique({ where: { id: artistId } });
    if (!artist || !artist.active) {
      throw new NotFoundException('Tatuador no encontrado');
    }

    // Solo servicios activos: un servicio desactivado desde el panel deja de
    // ofrecerse, aunque la asignación tatuador↔servicio siga existiendo (se
    // conserva para poder reactivarlo sin recargar las asignaciones).
    const artistServices = await this.prisma.artistService.findMany({
      where: { artistId, service: { active: true } },
      include: { service: true },
    });

    return artistServices.map(({ service }) => ({
      id: service.id,
      name: service.name,
      durationMinutes: service.durationMinutes,
      requiresDeposit: service.requiresDeposit,
      depositAmount: service.depositAmount,
    }));
  }
}
