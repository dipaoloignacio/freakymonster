import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';

// JSON plano, como Create/UpdateServiceDto — acá tampoco hay archivos.
export class CreateGiftCardTierDto {
  // 2 decimales para acompañar al Decimal(10, 2) de la base; positivo porque
  // una gift card de 0 o negativa no significa nada.
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number;

  // Opcional: el monto ya se explica solo. El label es para cuando el estudio
  // quiere darle un nombre ("Regalo chico") en la vista pública.
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  label?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
