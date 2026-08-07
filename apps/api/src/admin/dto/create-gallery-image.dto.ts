import { Transform } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

/**
 * Llega por multipart/form-data junto con el archivo, así que TODOS los campos
 * viajan como string — de ahí los @Transform. Mismo formato que
 * CreateArtistDto; ver ese archivo.
 */
export class CreateGalleryImageDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (typeof value === 'string' ? JSON.parse(value) : value))
  styles?: string[];

  /**
   * Opcional a nivel de tipo porque el schema lo permite, pero el formulario
   * del panel lo pide igual: una foto sin tatuador no aparece cuando alguien
   * filtra por tatuador, que es para lo que existe la página.
   *
   * El string vacío se normaliza a undefined: un <select> sin elegir manda ""
   * por multipart, y guardar "" como FK reventaría contra Artist.
   */
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' ? undefined : value))
  artistId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  @Transform(({ value }) => (value === '' ? undefined : value))
  caption?: string;

  /**
   * Dimensiones medidas por el NAVEGADOR al subir — ver el comentario de
   * GalleryImage.width en schema.prisma. Vienen como string por multipart, de
   * ahí el Number(). Si no llegan o no son un número válido quedan undefined y
   * la página cae a proporción 1:1.
   */
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  width?: number;

  @IsOptional()
  @Transform(({ value }) => (value === '' || value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  height?: number;
}
