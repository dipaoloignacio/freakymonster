import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GetGalleryImagesDto } from './dto/get-gallery-images.dto';

@Injectable()
export class GalleryImagesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Solo fotos activas. Desactivar una desde el panel la saca de acá al
   * instante, sin borrar nada.
   *
   * Los filtros van del lado de la base y no del navegador para que la página
   * pueda pedir el subconjunto que necesita —el link "ver trabajos de Renzo"
   * trae solo los de Renzo— en vez de descargar la galería entera cada vez.
   */
  async findActive(filters: GetGalleryImagesDto) {
    return this.prisma.galleryImage.findMany({
      where: {
        active: true,
        ...(filters.artistId ? { artistId: filters.artistId } : {}),
        // `has` es contención en el array de Postgres, no igualdad: una foto
        // con ["blackwork", "dotwork"] tiene que aparecer en los dos filtros.
        ...(filters.style ? { styles: { has: filters.style } } : {}),
      },
      select: {
        id: true,
        imageUrl: true,
        styles: true,
        caption: true,
        createdAt: true,
        width: true,
        height: true,
        artistId: true,
        // El nombre viene incluido para que la página no tenga que cruzar
        // contra /artists por su cuenta ni esperar dos requests para poder
        // pintar el epígrafe.
        artist: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
