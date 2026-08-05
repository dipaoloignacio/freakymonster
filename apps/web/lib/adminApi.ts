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

export function createAdminAvailabilityBlock(
  code: string,
  artistId: string,
  date: string,
  reason?: string
): Promise<{ id: string }> {
  return adminRequest(code, "/admin/availability-blocks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ artistId, date, reason: reason || undefined }),
  });
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

export function deactivateAdminArtist(code: string, id: string): Promise<AdminArtist> {
  return adminRequest(code, `/admin/artists/${id}`, { method: "DELETE" });
}
