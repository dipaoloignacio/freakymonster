import { IsDateString, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateAvailabilityBlockDto {
  /**
   * Omitirlo bloquea el día para TODOS los tatuadores activos (feriado,
   * cierre del local). Es opcional en vez de un "all" mágico para no tener
   * que reservar un id que en teoría podría existir.
   */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  artistId?: string;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}
