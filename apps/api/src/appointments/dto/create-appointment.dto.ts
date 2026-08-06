import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { toE164 } from '../../common/phone';

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

  // Se guarda SIEMPRE en E.164 (+5492617199005): un solo formato en la base
  // hace que armar un link de WhatsApp, comparar dos números o exportarlos sea
  // trivial. Normalizar acá y no en cada pantalla es lo que garantiza que
  // valga para los dos caminos de alta (wizard público y panel), sin depender
  // de que el front mande el formato correcto.
  //
  // El Transform corre antes que las validaciones (ValidationPipe con
  // transform: true). Si el número no es válido devuelve el original, y el
  // @Matches de abajo es el que rechaza — así el mensaje de error es uno solo.
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? (toE164(value) ?? value) : value))
  @Matches(/^\+[1-9]\d{7,14}$/, {
    message:
      'El teléfono no es un número válido. Revisá el código de país y el número (ej. +54 9 261 719-9005).',
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
