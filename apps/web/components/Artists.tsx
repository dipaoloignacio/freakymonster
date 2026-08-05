import { fetchArtistsForRender } from "@/lib/serverApi";
import ArtistsSection from "./ArtistsSection";
import ArtistsClientFallback from "./ArtistsClientFallback";

/**
 * Los tatuadores salen de la base (GET /api/artists, el mismo endpoint que usa
 * el wizard de reserva, que ya filtra por active) en vez de estar hardcodeados:
 * un alta o una baja hecha desde el panel tiene que verse acá.
 *
 * Sin `revalidate` esto convertiría la home en dinámica y cada visita pegaría a
 * la API y a la base. Con ISR (ver ARTISTS_REVALIDATE_SECONDS) la página se
 * sigue sirviendo pre-generada —igual de rápida que cuando el listado era
 * estático— y Next la regenera sola en background cada tanto.
 */
export default async function Artists() {
  const artists = await fetchArtistsForRender();

  // null = la API no respondió (o no existía todavía, como en el build de
  // Docker). Distinto de una lista vacía, que es una respuesta válida: el
  // estudio no tiene tatuadores activos y la sección simplemente no va.
  if (artists === null) return <ArtistsClientFallback />;
  if (artists.length === 0) return null;

  return <ArtistsSection artists={artists} />;
}
