import { IsOptional, IsString } from 'class-validator';

/**
 * Filtros de la página pública. Los dos son opcionales y combinables: /galeria
 * pide directamente el subconjunto que va a mostrar en vez de traerse todo y
 * filtrar en el navegador.
 */
export class GetGalleryImagesDto {
  @IsOptional()
  @IsString()
  artistId?: string;

  @IsOptional()
  @IsString()
  style?: string;
}
