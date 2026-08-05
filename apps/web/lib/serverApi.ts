// Lecturas del backend hechas desde el SERVIDOR (Server Components), no
// desde el navegador. Vive aparte de lib/api.ts porque la URL base es otra:
//
// NEXT_PUBLIC_API_URL es la que usa el browser y en producción vale "/api"
// —relativa, mismo dominio detrás de Nginx—. Una ruta relativa no se puede
// fetchear desde el servidor (no hay origen contra el cual resolverla), así
// que el render del servidor necesita una URL absoluta y propia:
// API_INTERNAL_URL, que apunta al contenedor de la API por el nombre de
// servicio de la red de Docker (ver docker-compose.prod.yml).
//
// A diferencia de NEXT_PUBLIC_*, esta variable se lee en tiempo de ejecución
// y nunca llega al bundle del cliente.
import type { Artist } from "./api";

const PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL;

const SERVER_API_BASE_URL =
  process.env.API_INTERNAL_URL ??
  // En dev NEXT_PUBLIC_API_URL sí es absoluta (http://localhost:3001/api) y
  // sirve igual; el chequeo de "http" es justamente para descartar el "/api"
  // relativo de producción, donde API_INTERNAL_URL es obligatoria.
  (PUBLIC_API_URL?.startsWith("http") ? PUBLIC_API_URL : "http://localhost:3001/api");

/**
 * Cada cuánto se regenera la home. Los tatuadores cambian cada varios meses,
 * así que no hace falta pegarle a la API en cada visita: la página se sirve
 * pre-generada (rápida) y Next la revalida en background pasado este plazo.
 *
 * También es el techo de cuánto tarda la home en reflejar un alta o una baja
 * hecha desde el panel — y en recuperarse si la API estaba caída cuando le
 * tocó regenerarse.
 */
export const ARTISTS_REVALIDATE_SECONDS = 300;

/**
 * Devuelve null (nunca tira) si la API no responde: la home no puede romperse
 * porque el backend esté caído o —caso garantizado— porque todavía no exista,
 * como en el build de la imagen Docker, donde el contenedor de la API no está
 * levantado. Quien llama decide qué mostrar en ese caso.
 */
export async function fetchArtistsForRender(): Promise<Artist[] | null> {
  try {
    const response = await fetch(`${SERVER_API_BASE_URL}/artists`, {
      next: { revalidate: ARTISTS_REVALIDATE_SECONDS },
    });
    if (!response.ok) return null;
    return (await response.json()) as Artist[];
  } catch {
    return null;
  }
}
