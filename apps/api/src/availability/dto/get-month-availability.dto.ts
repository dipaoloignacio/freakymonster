import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class GetMonthAvailabilityDto {
  @IsString()
  @IsNotEmpty()
  artistId: string;

  @IsString()
  @IsNotEmpty()
  serviceId: string;

  // "YYYY-MM". Un mes entero por request: el calendario del wizard necesita
  // saber de una cuáles días pintar como completos, y pedir día por día
  // serían ~31 requests por cada mes que el cliente mira.
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'month tiene que tener formato YYYY-MM' })
  month: string;
}
