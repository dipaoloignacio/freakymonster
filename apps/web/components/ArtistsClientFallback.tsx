"use client";

import { useEffect, useState } from "react";
import { fetchArtists, type Artist } from "@/lib/api";
import ArtistsSection from "./ArtistsSection";

/**
 * Reintento desde el navegador cuando el render del servidor no consiguió
 * tatuadores. El caso que lo hace necesario no es raro sino garantizado: la
 * home se pre-genera durante el build de la imagen Docker, donde el
 * contenedor de la API todavía no existe, así que el primer visitante después
 * de un deploy vería la sección vacía hasta la primera revalidación. Con esto
 * la ve igual, resuelta en el cliente.
 *
 * Si el reintento también falla, no renderiza nada: la home nunca se rompe ni
 * muestra un error por una sección secundaria.
 */
export default function ArtistsClientFallback() {
  const [artists, setArtists] = useState<Artist[] | null>(null);

  useEffect(() => {
    let alive = true;
    fetchArtists()
      .then((data) => {
        if (alive) setArtists(data);
      })
      .catch(() => {
        // Silencio a propósito — ver el comentario de arriba.
      });
    return () => {
      alive = false;
    };
  }, []);

  if (!artists || artists.length === 0) return null;

  return <ArtistsSection artists={artists} />;
}
