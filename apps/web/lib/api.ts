// Cliente del backend propio (AvailabilityModule/AppointmentsModule/ArtistsModule
// en apps/api) que consume el wizard de reserva en components/reservation/.
//
// NEXT_PUBLIC_API_URL se incrusta en el bundle en tiempo de build (no de
// runtime) — ver apps/web/.env.example y el ARG del Dockerfile.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export interface Artist {
  id: string;
  name: string;
  bio: string | null;
  specialties: string[];
  imageUrl: string | null;
}

export interface ArtistServiceOption {
  id: string;
  name: string;
  durationMinutes: number;
  requiresDeposit: boolean;
  depositAmount: string | null;
}

export interface CreateAppointmentPayload {
  artistId: string;
  serviceId: string;
  date: string; // "YYYY-MM-DD"
  startTime: string; // "HH:mm", hora Mendoza
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  notes?: string;
}

export interface Appointment {
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
}

async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const body = await response.json();
    if (Array.isArray(body?.message)) return body.message.join(", ");
    if (typeof body?.message === "string") return body.message;
  } catch {
    // el body no era JSON — seguimos con el mensaje genérico de abajo.
  }
  return `Error inesperado (${response.status})`;
}

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`);
  if (!response.ok) {
    throw new ApiError(response.status, await extractErrorMessage(response));
  }
  return response.json();
}

export function fetchArtists(): Promise<Artist[]> {
  return request<Artist[]>("/artists");
}

export function fetchArtistServices(artistId: string): Promise<ArtistServiceOption[]> {
  return request<ArtistServiceOption[]>(`/artists/${artistId}/services`);
}

export function fetchAvailability(
  artistId: string,
  serviceId: string,
  date: string
): Promise<string[]> {
  const params = new URLSearchParams({ artistId, serviceId, date });
  return request<string[]>(`/availability?${params.toString()}`);
}

export async function createAppointment(payload: CreateAppointmentPayload): Promise<Appointment> {
  const response = await fetch(`${API_BASE_URL}/appointments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new ApiError(response.status, await extractErrorMessage(response));
  }

  return response.json();
}

export interface PaymentPreference {
  initPoint: string;
  preferenceId: string;
}

export async function createPaymentPreference(appointmentId: string): Promise<PaymentPreference> {
  const response = await fetch(`${API_BASE_URL}/appointments/${appointmentId}/payment-preference`, {
    method: "POST",
  });

  if (!response.ok) {
    throw new ApiError(response.status, await extractErrorMessage(response));
  }

  return response.json();
}
