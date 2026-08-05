import { IsBoolean, IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, Max, MaxLength, Min } from 'class-validator';

// JSON plano (a diferencia de Create/UpdateArtistDto, que van por
// multipart porque llevan archivo) — acá no hay nada que subir.
export class CreateServiceDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  // El mínimo no es cosmético: getAvailableSlots() arma la grilla avanzando
  // de a `durationMinutes` por vez, así que un 0 la colgaría en un loop
  // infinito. El máximo (12h) es para que un typo tipo 6000 no genere una
  // grilla vacía sin explicación visible.
  @IsInt()
  @Min(5)
  @Max(720)
  durationMinutes: number;

  @IsOptional()
  @IsBoolean()
  requiresDeposit?: boolean;

  // La regla cruzada "si requiresDeposit, tiene que haber monto" NO se
  // valida acá sino en AdminService: en el PATCH hay que evaluarla contra el
  // estado resultante (DTO + lo que ya está guardado), y tenerla en un solo
  // lugar evita que las dos versiones se desincronicen.
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  depositAmount?: number;
}
