import {
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateAppointmentDto {
  @IsString()
  @IsNotEmpty()
  artistId: string;

  @IsString()
  @IsNotEmpty()
  serviceId: string;

  @IsDateString()
  date: string;

  // Hora Mendoza, mismo formato que WeeklyAvailability.startTime/endTime.
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'startTime debe tener formato HH:mm (hora Mendoza)',
  })
  startTime: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  customerName: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[+\d][\d\s-]{6,19}$/, {
    message: 'customerPhone tiene un formato inválido',
  })
  customerPhone: string;

  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
