import { IsBoolean, IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, Max, MaxLength, Min } from 'class-validator';

// Ver CreateServiceDto para el porqué de los límites de durationMinutes y de
// dónde vive la validación cruzada de la seña.
export class UpdateServiceDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(720)
  durationMinutes?: number;

  @IsOptional()
  @IsBoolean()
  requiresDeposit?: boolean;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  depositAmount?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
