import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CreateAppointmentDto } from '../../appointments/dto/create-appointment.dto';

/**
 * El alta manual del panel acepta todo lo del alta pública más el canje de una
 * gift card.
 *
 * Es un DTO aparte y no un campo opcional en CreateAppointmentDto a propósito:
 * si viviera en el DTO compartido, el endpoint público de reservas también
 * aceptaría un giftCardCode, y cualquiera podría quemar una card desde el
 * wizard. Canjear es, por ahora, una operación del estudio.
 */
export class CreateAdminAppointmentDto extends CreateAppointmentDto {
  // Se normaliza al validarlo contra la base (mayúsculas, guiones opcionales):
  // ver canonicalizeGiftCardCode.
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  giftCardCode?: string;
}
