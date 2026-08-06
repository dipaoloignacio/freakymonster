import { IsBoolean, IsNumber, IsOptional, IsPositive, IsString, MaxLength, ValidateIf } from 'class-validator';

// Ver CreateGiftCardTierDto para el porqué de los límites.
export class UpdateGiftCardTierDto {
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount?: number;

  // Distingue "no lo mandes" (undefined, no se toca) de "borralo" (null, se
  // guarda sin label). Sin el ValidateIf, mandar null explícito reventaría
  // contra @IsString.
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(60)
  label?: string | null;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
