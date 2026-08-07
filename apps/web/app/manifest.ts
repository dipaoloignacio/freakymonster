import type { MetadataRoute } from "next";

/**
 * Convención de Next: este archivo se sirve en /manifest.webmanifest y el
 * <link rel="manifest"> lo inyecta el framework solo — no hace falta
 * declararlo a mano en el <head> de layout.tsx.
 *
 * Habilita "Agregar a pantalla de inicio" en Android. Para un estudio de
 * tatuajes eso no es un capricho: el tráfico llega casi todo desde el link
 * de Instagram, en el celular, y quien vuelve a sacar turno entra por el
 * ícono en vez de rebuscar el link.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Freaky Monster Tattoo Studio",
    // El que se ve abajo del ícono en la pantalla de inicio, donde entran
    // ~12 caracteres antes de que Android lo corte con puntos suspensivos.
    short_name: "Freaky Monster",
    description:
      "Estudio de tatuajes en el microcentro de Mendoza (km0). Blackwork, realismo y old school.",
    start_url: "/",
    display: "standalone",
    background_color: "#0d0b0a",
    theme_color: "#0d0b0a",
    lang: "es-AR",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
