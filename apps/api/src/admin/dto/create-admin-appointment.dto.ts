import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { AppointmentBaseDto } from '../../appointments/dto/appointment-base.dto';

/**
 * El alta manual del panel acepta todo lo del alta pública más el canje de una
 * gift card.
 *
 * Es un DTO aparte y no un campo opcional en CreateAppointmentDto a propósito:
 * si viviera en el DTO compartido, el endpoint público de reservas también
 * aceptaría un giftCardCode, y cualquiera podría quemar una card desde el
 * wizard. Canjear es, por ahora, una operación del estudio.
 */
export class CreateAdminAppointmentDto extends AppointmentBaseDto {
  /**
   * Opcional, a diferencia del alta pública: el estudio toma reservas por
   * teléfono y por WhatsApp, donde el mail muchas veces no se da. Exigirlo
   * obligaría a inventarlo, que es peor que no tenerlo. El formato se valida
   * igual cuando viene.
   */
  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  // Se normaliza al validarlo contra la base (mayúsculas, guiones opcionales):
  // ver canonicalizeGiftCardCode.
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  giftCardCode?: string;
}
