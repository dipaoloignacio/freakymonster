// Cliente del AdminModule (apps/api/src/admin) — el panel en
// app/turnos/[code]/. El "code" de la URL se manda como header x-admin-key
// en cada request; el backend lo compara contra ADMIN_API_KEY.
import { ApiError } from "./api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api";

export interface AdminAppointment {
  id: string;
  artistId: string;
  serviceId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  startTime: string;
  endTime: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  depositStatus: "NONE" | "PENDING" | "PAID";
  notes: string | null;
  createdAt: string;
  artist: { id: string; name: string };
  service: { id: string; name: string; durationMinutes: number };
}

export interface AdminAppointmentFilters {
  status?: string;
  artistId?: string;
  date?: string;
  from?: string;
  to?: string;
}

async function adminRequest<T>(code: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      "x-admin-key": code,
    },
  });

  if (!response.ok) {
    let message = `Error inesperado (${response.status})`;
    try {
      const body = await response.json();
      if (Array.isArray(body?.message)) message = body.message.join(", ");
      else if (typeof body?.message === "string") message = body.message;
    } catch {
      // el body no era JSON — seguimos con el mensaje genérico.
    }
    throw new ApiError(response.status, message);
  }

  return response.json();
}

export function fetchAdminAppointments(
  code: string,
  filters: AdminAppointmentFilters = {}
): Promise<AdminAppointment[]> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  const qs = params.toString();
  return adminRequest(code, `/admin/appointments${qs ? `?${qs}` : ""}`);
}

export interface CreateAdminAppointmentPayload {
  artistId: string;
  serviceId: string;
  date: string; // "YYYY-MM-DD"
  startTime: string; // "HH:mm", hora Mendoza
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  notes?: string;
}

/**
 * Alta manual (reserva por teléfono/WhatsApp). Mismo body que el alta
 * pública, pero el turno nace CONFIRMED y sin vencimiento de seña — ver
 * AdminService.createAppointment() en el backend.
 */
export function createAdminAppointment(
  code: string,
  payload: CreateAdminAppointmentPayload
): Promise<AdminAppointment> {
  return adminRequest(code, "/admin/appointments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function cancelAdminAppointment(code: string, id: string): Promise<AdminAppointment> {
  return adminRequest(code, `/admin/appointments/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "CANCELLED" }),
  });
}

export function rescheduleAdminAppointment(
  code: string,
  id: string,
  date: string,
  startTime: string
): Promise<AdminAppointment> {
  return adminRequest(code, `/admin/appointments/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date, startTime }),
  });
}

export interface AdminAvailabilityBlock {
  id: string;
  artistId: string;
  date: string;
  reason: string | null;
  artist: { id: string; name: string };
}

/**
 * `artistId` en null bloquea el día para todos los tatuadores activos.
 * La respuesta dice cuántos se crearon y cuántos ya estaban bloqueados (el
 * endpoint es idempotente por tatuador+día).
 */
export function createAdminAvailabilityBlock(
  code: string,
  artistId: string | null,
  date: string,
  reason?: string
): Promise<{ created: number; alreadyBlocked: number; blocks: AdminAvailabilityBlock[] }> {
  return adminRequest(code, "/admin/availability-blocks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ artistId: artistId ?? undefined, date, reason: reason || undefined }),
  });
}

/** Bloqueos de hoy en adelante (los pasados no se listan). */
export function fetchAdminAvailabilityBlocks(code: string): Promise<AdminAvailabilityBlock[]> {
  return adminRequest(code, "/admin/availability-blocks");
}

export function deleteAdminAvailabilityBlock(code: string, id: string): Promise<AdminAvailabilityBlock> {
  return adminRequest(code, `/admin/availability-blocks/${id}`, { method: "DELETE" });
}

export interface AdminArtist {
  id: string;
  name: string;
  bio: string | null;
  specialties: string[];
  imageUrl: string | null;
  active: boolean;
}

export interface ArtistFormInput {
  name?: string;
  bio?: string;
  specialties?: string[];
  active?: boolean;
  image?: File | null;
}

// Multipart/form-data porque puede venir con archivo — ver CreateArtistDto /
// UpdateArtistDto en el backend para el formato esperado de cada campo.
function buildArtistFormData(input: ArtistFormInput): FormData {
  const formData = new FormData();
  if (input.name !== undefined) formData.set("name", input.name);
  if (input.bio !== undefined) formData.set("bio", input.bio);
  if (input.specialties !== undefined) formData.set("specialties", JSON.stringify(input.specialties));
  if (input.active !== undefined) formData.set("active", String(input.active));
  if (input.image) formData.set("image", input.image);
  return formData;
}

export function fetchAdminArtists(code: string): Promise<AdminArtist[]> {
  return adminRequest(code, "/admin/artists");
}

export function createAdminArtist(code: string, input: ArtistFormInput & { name: string }): Promise<AdminArtist> {
  return adminRequest(code, "/admin/artists", {
    method: "POST",
    body: buildArtistFormData(input),
  });
}

export function updateAdminArtist(code: string, id: string, input: ArtistFormInput): Promise<AdminArtist> {
  return adminRequest(code, `/admin/artists/${id}`, {
    method: "PATCH",
    body: buildArtistFormData(input),
  });
}

/** Desactivar es un update común: el tatuador y su historial quedan intactos. */
export function deactivateAdminArtist(code: string, id: string): Promise<AdminArtist> {
  return updateAdminArtist(code, id, { active: false });
}

/**
 * `deleted: false` significa que el tatuador ya tenía turnos y el backend lo
 * desactivó en vez de borrarlo — hay que decirlo, no mentir con "eliminado".
 */
export function deleteAdminArtist(
  code: string,
  id: string
): Promise<{ deleted: boolean; appointmentCount: number; artist: AdminArtist }> {
  return adminRequest(code, `/admin/artists/${id}`, { method: "DELETE" });
}

// Franja de horario laboral semanal. dayOfWeek: 0 = domingo … 6 = sábado
// (misma convención que dayOfWeekOf() en el backend). Horas en hora Mendoza.
export interface WeeklyAvailabilityWindow {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export function fetchArtistAvailability(
  code: string,
  artistId: string
): Promise<(WeeklyAvailabilityWindow & { id: string })[]> {
  return adminRequest(code, `/admin/artists/${artistId}/availability`);
}

// PUT: reemplaza la semana completa, no es un merge.
export function setArtistAvailability(
  code: string,
  artistId: string,
  windows: WeeklyAvailabilityWindow[]
): Promise<(WeeklyAvailabilityWindow & { id: string })[]> {
  return adminRequest(code, `/admin/artists/${artistId}/availability`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ windows }),
  });
}

export interface AdminService {
  id: string;
  name: string;
  durationMinutes: number;
  requiresDeposit: boolean;
  // Decimal de Prisma — viaja como string en JSON, no como number, para no
  // perder precisión. Convertir con Number() solo para mostrar/editar.
  depositAmount: string | null;
  active: boolean;
  // Qué tatuadores lo ofrecen. Solo lectura desde la pestaña Servicios; se
  // edita desde el formulario del tatuador (ver ArtistsTab).
  artists: { id: string; name: string }[];
}

export interface ServiceFormInput {
  name?: string;
  durationMinutes?: number;
  requiresDeposit?: boolean;
  depositAmount?: number;
  active?: boolean;
}

export function fetchAdminServices(code: string): Promise<AdminService[]> {
  return adminRequest(code, "/admin/services");
}

export function createAdminService(
  code: string,
  input: ServiceFormInput & { name: string; durationMinutes: number }
): Promise<AdminService> {
  return adminRequest(code, "/admin/services", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function updateAdminService(code: string, id: string, input: ServiceFormInput): Promise<AdminService> {
  return adminRequest(code, `/admin/services/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

// `deleted: false` significa que el servicio ya tenía turnos y el backend lo
// desactivó en vez de borrarlo — hay que avisarlo, no decir "borrado".
export function deleteAdminService(
  code: string,
  id: string
): Promise<{ deleted: boolean; appointmentCount: number; service: AdminService }> {
  return adminRequest(code, `/admin/services/${id}`, { method: "DELETE" });
}

export function assignServiceToArtist(code: string, artistId: string, serviceId: string): Promise<unknown> {
  return adminRequest(code, `/admin/artists/${artistId}/services/${serviceId}`, { method: "POST" });
}

export function unassignServiceFromArtist(code: string, artistId: string, serviceId: string): Promise<unknown> {
  return adminRequest(code, `/admin/artists/${artistId}/services/${serviceId}`, { method: "DELETE" });
}
