import { IsEmail } from 'class-validator';
import { AppointmentBaseDto } from './appointment-base.dto';

// Alta pública (el wizard de la web).
export class CreateAppointmentDto extends AppointmentBaseDto {
  // Obligatorio acá y opcional en el panel: un turno reservado desde la web
  // se confirma por mail —es el único canal por escrito que queda con ese
  // cliente—, mientras que el estudio toma reservas por teléfono donde el
  // mail muchas veces no se da, y exigirlo obligaría a inventarlo.
  @IsEmail()
  customerEmail: string;
}
