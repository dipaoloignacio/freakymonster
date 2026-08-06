/**
 * Dominio público del sitio. Vive acá y no repetido en cada archivo porque
 * ya se desincronizó una vez: layout, robots y sitemap apuntaban a
 * freakymonster.vercel.app —que devuelve 404— mientras el sitio real vive en
 * dipaoloproyects.space. El síntoma no fue obvio: las URLs absolutas de Open
 * Graph (og:url, og:image) quedaban colgadas, así que WhatsApp e Instagram
 * pedían una imagen inexistente y no mostraban ninguna vista previa.
 *
 * Es el mismo dominio que usa el backend para las back_urls de Mercado Pago
 * (ver FRONTEND_BASE_URL en apps/api/src/payments/payments.service.ts).
 */
export const SITE_URL = "https://freakymonster.dipaoloproyects.space";

/**
 * Imagen de vista previa al compartir el link. 1200x630 (la relación 1.91:1
 * que esperan Open Graph y Twitter), armada sobre una foto del estudio con el
 * logo encima — ver public/og-image.jpg.
 *
 * Se sirve como JPG y no SVG porque varias plataformas (WhatsApp entre ellas)
 * directamente no renderizan SVG en las previews, y liviana (~87 KB) porque
 * WhatsApp descarta las imágenes pesadas y muestra la tarjeta sin foto.
 */
export const OG_IMAGE = {
  url: "/og-image.jpg",
  width: 1200,
  height: 630,
  alt: "Freaky Monster Tattoo Studio — Mendoza",
} as const;
