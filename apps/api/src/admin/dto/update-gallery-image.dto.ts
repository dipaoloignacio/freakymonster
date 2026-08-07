import { Transform } from 'class-transformer';
import { IsArray, IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

/**
 * Mismo formato multipart/form-data que CreateGalleryImageDto — ver ese archivo
 * para el porqué de los @Transform.
 *
 * Ojo con la diferencia entre `artistId: ''` y no mandar el campo: acá el
 * string vacío se transforma en `null` y no en `undefined`, porque en un PATCH
 * "vaciar el tatuador" es una intención legítima (la foto pasa a ser del
 * estudio, sin autor). `undefined` significa "no lo toques", que es lo que hace
 * el service con el spread condicional.
 */
export class UpdateGalleryImageDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (typeof value === 'string' ? JSON.parse(value) : value))
  styles?: string[];

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' || value === 'null' ? null : value))
  artistId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  @Transform(({ value }) => (value === '' ? null : value))
  caption?: string | null;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  active?: boolean;

  // Solo tienen sentido cuando se reemplaza el archivo; si no viene imagen
  // nueva, el service las ignora para no pisar las de la foto que sigue ahí.
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
