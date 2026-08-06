import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateGiftCardDto {
  // El monto NO viaja en el body: se toma del tier en el backend. Si el
  // cliente pudiera mandarlo, podría comprar una card de $1 y recibir una de
  // $120.000 — el precio nunca se acepta desde el navegador.
  @IsString()
  @IsNotEmpty()
  tierId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  purchaserName: string;

  // Obligatorio aunque el regalo sea para otro: es el comprobante de quién
  // pagó y el destinatario de respaldo del email si no se carga uno.
  @IsEmail()
  purchaserEmail: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  recipientName?: string;

  @IsOptional()
  @IsEmail()
  recipientEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}
