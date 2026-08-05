export const whatsappUrl =
  "https://wa.me/5492617199005?text=" +
  encodeURIComponent("Hola Freaky Monster! Quiero reservar un turno.");

export const whatsappConsultaUrl =
  "https://wa.me/5492617199005?text=" +
  encodeURIComponent("Hola! Quiero consultar sobre un tatuaje.");

export const whatsappPaymentIssueUrl =
  "https://wa.me/5492617199005?text=" +
  encodeURIComponent("Hola! Tuve un problema pagando la seña de mi turno.");

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
