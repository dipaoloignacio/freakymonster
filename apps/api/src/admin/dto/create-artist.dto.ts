import { Transform } from 'class-transformer';
import { IsArray, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

// Llega por multipart/form-data (junto con el archivo de imagen, si lo hay)
// — todos los campos de texto viajan como string, por eso el frontend manda
// specialties como JSON.stringify(array) y acá se parsea de vuelta.
export class CreateArtistDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  bio?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (typeof value === 'string' ? JSON.parse(value) : value))
  specialties?: string[];
}
