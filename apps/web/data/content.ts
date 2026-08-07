export const whatsappUrl =
  "https://wa.me/5492617199005?text=" +
  encodeURIComponent("Hola Freaky Monster! Quiero reservar un turno.");

export const whatsappConsultaUrl =
  "https://wa.me/5492617199005?text=" +
  encodeURIComponent("Hola! Quiero consultar sobre un tatuaje.");

export const whatsappPaymentIssueUrl =
  "https://wa.me/5492617199005?text=" +
  encodeURIComponent("Hola! Tuve un problema pagando la seña de mi turno.");

/**
 * Proporción real (ancho/alto) de cada archivo de public/gallery/, medida sobre
 * el PNG. El collage la usa para derivar el ancho de cada tarjeta a partir de su
 * alto, así ninguna foto sale deformada ni recortada a la fuerza.
 *
 * Ojo: estas cinco van de 0,71 a 1,00 —de retrato suave a cuadrado—, o sea que
 * la proporción sola NO alcanza para armar un mosaico irregular. La variedad de
 * alturas la pone el patrón de variantes en components/Gallery.tsx; esto es lo
 * que evita que esa variedad deforme las fotos.
 *
 * Si se agrega una foto nueva hay que medirla y sumarla acá:
 *   identify -format "%f %wx%h\n" public/gallery/archivo.png
 */
export const galleryAspect: Record<string, number> = {
  "/gallery/spider.png": 873 / 872,
  "/gallery/cupcake.png": 871 / 869,
  "/gallery/medusa.png": 620 / 874,
  "/gallery/split-face.png": 762 / 866,
  "/gallery/wolf.png": 653 / 880,
};

export const gallery: { label: string; image?: string }[] = [
  { label: "Blackwork — antebrazo", image: "/gallery/spider.png" },
  { label: "Realismo — retrato", image: "/gallery/cupcake.png" },
  { label: "Old school — pecho", image: "/gallery/medusa.png" },
  { label: "Japonés — espalda", image: "/gallery/split-face.png" },
  { label: "Fine line — muñeca", image: "/gallery/wolf.png" },
  { label: "Neotradicional — brazo", image: "/gallery/spider.png" },
  { label: "Dotwork — costilla", image: "/gallery/cupcake.png" },
  { label: "Lettering — clavícula", image: "/gallery/medusa.png" },
  { label: "Blackwork — pierna", image: "/gallery/split-face.png" },
];

// Los tatuadores NO van acá: salen de la base vía GET /api/artists, así que
// el panel de admin es la única fuente. Ver components/Artists.tsx.
// (Las fotos en public/artists/ siguen en uso: son las que referencia el
// imageUrl de los tatuadores del seed — ver apps/api/prisma/seed.ts.)

export const styles = [
  { name: "Blackwork" },
  { name: "Realismo" },
  { name: "Old School" },
  { name: "Neotradicional" },
  { name: "Japonés" },
  { name: "Fine Line" },
  { name: "Dotwork" },
  { name: "Lettering" },
];

export const testimonials = [
  {
    quote:
      "Entré con una idea vaga y salí con una obra. Cero apuro, cero relleno de charla, todo precisión.",
    name: "J. Alvarez",
  },
  {
    quote:
      "El realismo que me hizo Malena parece una foto. Cicatrizó perfecto y el trato fue impecable.",
    name: "R. Sosa",
  },
  {
    quote:
      "Ambiente serio, no el típico local turístico. Se nota que son gremio, no franquicia.",
    name: "F. Torres",
  },
];
