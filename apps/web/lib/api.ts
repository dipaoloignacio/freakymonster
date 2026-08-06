// Cliente del backend propio (AvailabilityModule/AppointmentsModule/ArtistsModule
// en apps/api) que consume el wizard de reserva en components/reservation/.
//
// NEXT_PUBLIC_API_URL se incrusta en el bundle en tiempo de build (no de
// runtime) — ver apps/web/.env.example y el ARG del Dockerfile.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api";

// Fotos subidas vía el panel admin devuelven imageUrl bajo "/api/uploads/..."
// (servido por el backend). En producción eso alcanza tal cual (mismo origen,
// Nginx de por medio). En dev, web (3000) y api (3001) son orígenes distintos,
// así que esa ruta relativa resolvería contra localhost:3000 y rompería la
// imagen — hay que anteponer el origin del backend ahí.
//
// Los tatuadores seedeados manualmente (ver prisma/seed.ts) usan en cambio
// "/artists/nombre.jpg", assets propios de apps/web/public/ — esos SIEMPRE
// son same-origin y no hay que tocarlos, por eso el chequeo del prefijo.
const API_ORIGIN = API_BASE_URL.startsWith("http") ? new URL(API_BASE_URL).origin : "";

export function resolveAssetUrl(path: string | null): string | null {
  if (!path || !path.startsWith("/api/")) return path;
  return `${API_ORIGIN}${path}`;
}

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

/**
 * Fechas ("YYYY-MM-DD") del mes que tienen al menos un turno libre. Una sola
 * request por mes en vez de una por día — ver el endpoint /availability/month.
 * @param month "YYYY-MM"
 */
export function fetchMonthAvailability(
  artistId: string,
  serviceId: string,
  month: string
): Promise<string[]> {
  const params = new URLSearchParams({ artistId, serviceId, month });
  return request<string[]>(`/availability/month?${params.toString()}`);
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

// --- Gift cards ---------------------------------------------------------

export interface GiftCardTier {
  id: string;
  /** Decimal de Prisma serializado: llega como string. */
  amount: string;
  label: string | null;
}

export interface CreateGiftCardPayload {
  tierId: string;
  purchaserName: string;
  purchaserEmail: string;
  recipientName?: string;
  recipientEmail?: string;
  message?: string;
}

export interface GiftCard {
  id: string;
  amount: string;
  status: "PENDING" | "ACTIVE" | "REDEEMED" | "EXPIRED";
}

/** Solo los montos vigentes — el catálogo público. */
export function fetchGiftCardTiers(): Promise<GiftCardTier[]> {
  return request<GiftCardTier[]>("/gift-card-tiers");
}

/**
 * Crea la gift card en PENDING, antes de pagar. El código y la vigencia los
 * pone el backend cuando Mercado Pago confirma el pago: hasta entonces la card
 * no sirve para nada, así que abandonar el checkout no deja nada canjeable.
 */
export async function createGiftCard(payload: CreateGiftCardPayload): Promise<GiftCard> {
  const response = await fetch(`${API_BASE_URL}/gift-cards`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new ApiError(response.status, await extractErrorMessage(response));
  }

  return response.json();
}

export async function createGiftCardPaymentPreference(giftCardId: string): Promise<PaymentPreference> {
  const response = await fetch(`${API_BASE_URL}/gift-cards/${giftCardId}/payment-preference`, {
    method: "POST",
  });

  if (!response.ok) {
    throw new ApiError(response.status, await extractErrorMessage(response));
  }

  return response.json();
}
