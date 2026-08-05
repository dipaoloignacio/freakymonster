import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsInt, Matches, Max, Min, ValidateNested } from 'class-validator';

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export class WeeklyAvailabilityWindowDto {
  // Misma convención que dayOfWeekOf() en common/timezone.ts.
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  // Hora Mendoza, igual que WeeklyAvailability.startTime en el schema.
  @Matches(HHMM, { message: 'startTime tiene que tener formato HH:mm' })
  startTime: string;

  @Matches(HHMM, { message: 'endTime tiene que tener formato HH:mm' })
  endTime: string;
}

/**
 * Reemplaza TODAS las franjas del tatuador de una (no es un PATCH parcial):
 * el formulario del panel edita la semana entera como una sola unidad, así
 * que mandar el estado completo evita tener que diferenciar altas, bajas y
 * modificaciones fila por fila.
 *
 * El array admite varias franjas para el mismo día (ej. cortar al mediodía),
 * que es lo que getAvailableSlots() ya soporta al iterar las ventanas —
 * aunque hoy la UI del panel cargue una sola por día.
 */
export class SetWeeklyAvailabilityDto {
  @IsArray()
  @ArrayMaxSize(21)
  @ValidateNested({ each: true })
  @Type(() => WeeklyAvailabilityWindowDto)
  windows: WeeklyAvailabilityWindowDto[];
}
