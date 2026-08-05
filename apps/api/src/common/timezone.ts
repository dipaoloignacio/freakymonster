import { DateTime } from 'luxon';

/**
 * ============================================================================
 * CONVENCIÓN DE ZONA HORARIA DE TODO EL PROYECTO — LEER ANTES DE TOCAR FECHAS
 * ============================================================================
 * Todos los DateTime de este proyecto se calculan asumiendo
 * America/Argentina/Mendoza (hora del estudio) y se convierten a UTC solo
 * para almacenamiento/transporte (columnas DateTime de Postgres, JSON de la
 * API). El frontend/cliente HTTP es responsable de mostrarlos convertidos
 * de vuelta a hora local si hace falta.
 *
 * Un string de negocio como WeeklyAvailability.startTime = "12:00" NUNCA es
 * UTC — es hora Mendoza. Combinarlo con una fecha para obtener un instante
 * real (Date/timestamp) SIEMPRE tiene que pasar por localCalendarTimeToUtc()
 * (o Luxon + STUDIO_TIMEZONE directamente), nunca por `new Date(...)` /
 * `setUTCHours` a mano — así es como se coló el bug de 3 horas en la Fase 3.
 *
 * Excepción: columnas @db.Date sin hora (ej. AvailabilityBlock.date) son
 * fechas calendario puras, sin zona horaria — no pasan por esta conversión
 * (ver naiveCalendarDayRangeUtc).
 * ============================================================================
 */
export const STUDIO_TIMEZONE = 'America/Argentina/Mendoza';

/**
 * Convierte una fecha calendario ("YYYY-MM-DD") + hora local del estudio
 * ("HH:mm") al instante UTC real que representa.
 * Ej: ("2026-08-11", "12:00") → Date para 2026-08-11T15:00:00.000Z.
 */
export function localCalendarTimeToUtc(dateStr: string, timeStr: string): Date {
  const dt = DateTime.fromISO(`${dateStr}T${timeStr}`, { zone: STUDIO_TIMEZONE });
  if (!dt.isValid) {
    throw new Error(`Fecha/hora inválida: ${dateStr}T${timeStr} (${dt.invalidReason})`);
  }
  return dt.toUTC().toJSDate();
}

/**
 * Día de la semana (0 = domingo … 6 = sábado, igual convención que
 * WeeklyAvailability.dayOfWeek) de una fecha calendario. El "día de la
 * semana" es una propiedad de la fecha en sí, no de un instante, así que
 * no hace falta (ni corresponde) convertir zona horaria acá.
 */
export function dayOfWeekOf(dateStr: string): number {
  const dt = DateTime.fromISO(dateStr, { zone: STUDIO_TIMEZONE });
  return dt.weekday % 7; // Luxon: 1=lunes...7=domingo → 0=domingo...6=sábado
}

/**
 * Rango [inicio, fin) del día calendario `dateStr` en America/Argentina/
 * Mendoza, expresado como instantes UTC reales. Usar para filtrar columnas
 * DateTime que representan un momento real (ej. Appointment.startTime).
 */
export function localCalendarDayRangeUtc(dateStr: string): { start: Date; end: Date } {
  const startLocal = DateTime.fromISO(`${dateStr}T00:00:00`, { zone: STUDIO_TIMEZONE });
  return {
    start: startLocal.toUTC().toJSDate(),
    end: startLocal.plus({ days: 1 }).toUTC().toJSDate(),
  };
}

/**
 * Rango [inicio, fin) del día calendario `dateStr` en UTC "naive" (medianoche
 * UTC, sin conversión de zona horaria). Usar únicamente para comparar contra
 * columnas @db.Date sin hora (ej. AvailabilityBlock.date), que Postgres
 * guarda como fecha calendario pura. NO usar para columnas DateTime reales.
 */
export function naiveCalendarDayRangeUtc(dateStr: string): { start: Date; end: Date } {
  const start = new Date(`${dateStr}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

/**
 * Todas las fechas calendario ("YYYY-MM-DD") de un mes "YYYY-MM". Operación
 * de calendario pura: no depende de zona horaria (agosto tiene 31 días en
 * cualquier lado), pero se resuelve con Luxon para no reimplementar años
 * bisiestos a mano.
 */
export function calendarDaysOfMonth(month: string): string[] {
  const first = DateTime.fromISO(`${month}-01`, { zone: STUDIO_TIMEZONE });
  if (!first.isValid) {
    throw new Error(`Mes inválido: ${month} (${first.invalidReason})`);
  }
  return Array.from({ length: first.daysInMonth! }, (_, i) => first.plus({ days: i }).toFormat('yyyy-MM-dd'));
}

/**
 * Formatea un instante UTC como fecha y hora legible en hora Mendoza, para
 * mostrar en emails/UI (nunca mostrar el UTC crudo a un humano).
 * Ej: "martes 18 de agosto de 2026, 12:00".
 */
export function formatLocalDateTime(date: Date): string {
  return DateTime.fromJSDate(date, { zone: 'utc' })
    .setZone(STUDIO_TIMEZONE)
    .setLocale('es')
    .toFormat("cccc d 'de' LLLL 'de' yyyy, HH:mm 'hs'");
}
