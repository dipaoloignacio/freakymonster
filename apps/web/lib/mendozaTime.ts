// Helpers de formato para mostrar horarios en hora Mendoza en el navegador.
// El cálculo real de disponibilidad (qué está libre) es 100% responsabilidad
// del backend — esto es solo presentación.
const MENDOZA_TZ = "America/Argentina/Mendoza";

/** ISO UTC → "HH:mm" en hora Mendoza (para mostrar un slot). */
export function formatSlotTime(iso: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: MENDOZA_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

/** ISO UTC → "HH:mm" sin separadores raros, para mandar a POST /appointments
 * (que espera exactamente el mismo formato que devuelve la disponibilidad). */
export function isoToMendozaHHmm(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: MENDOZA_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${hour}:${minute}`;
}

/** Fecha calendario legible en español para mostrar en el resumen del turno. */
export function formatDateLong(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

/** Hoy como "YYYY-MM-DD", en la zona horaria del navegador (uso solo para
 * deshabilitar fechas pasadas en el calendario — el backend es la fuente de
 * verdad real sobre qué fechas tienen disponibilidad). */
export function todayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** "YYYY-MM-DD" + N días → "YYYY-MM-DD" (para el rango default del panel). */
export function addDaysToDateString(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** ISO UTC → "mar 11 ago, 14:00" en hora Mendoza — para filas de tabla. */
export function formatDateTimeShort(iso: string): string {
  const date = new Date(iso);
  const datePart = new Intl.DateTimeFormat("es-AR", {
    timeZone: MENDOZA_TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);
  return `${datePart}, ${formatSlotTime(iso)}`;
}
