import { IsDateString, IsEnum, IsOptional, Matches } from 'class-validator';
import { AppointmentStatus } from '@prisma/client';

// Cubre las dos acciones del PATCH: mandar `status` cancela (u otro cambio
// de estado); mandar `date` + `startTime` reprograma. AdminService decide
// cuál es según qué campos vinieron — ver ahí el detalle de por qué no son
// dos endpoints separados.
export class UpdateAdminAppointmentDto {
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @IsOptional()
  @IsDateString()
  date?: string;

  // Hora Mendoza, mismo formato que CreateAppointmentDto.startTime.
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'startTime debe tener formato HH:mm (hora Mendoza)',
  })
  startTime?: string;
}
