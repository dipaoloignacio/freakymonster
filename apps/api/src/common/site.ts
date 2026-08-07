/**
 * Dónde vive el sitio público, visto desde el backend.
 *
 * Vive acá y no repetido en cada servicio porque ya lo usan dos cosas que no se
 * hablan entre sí: las back_urls de Mercado Pago (payments.service.ts) y las
 * imágenes de los emails (notifications/email.service.ts). Un email apunta a
 * este dominio para traer el logo; si un día el dominio cambia y solo se
 * actualiza uno de los dos, el síntoma es de los peores: el pago sigue
 * funcionando y el mail llega, pero con el logo roto — y nadie lo ve, porque
 * quien manda el mail no es quien lo recibe.
 *
 * Es el mismo valor que apps/web/lib/site.ts del lado del frontend, que existe
 * por exactamente el mismo motivo (ahí está contada la vez que se desincronizó
 * y dejó las vistas previas de Open Graph sin imagen).
 *
 * Igual que el CORS condicional de main.ts: en local, `apps/web` corre en
 * localhost:3000, así que las back_urls tienen que apuntar ahí para poder
 * probar el flujo de pago de punta a punta en desarrollo. En producción
 * (NODE_ENV=production, fijado en el Dockerfile) apunta al dominio real —
 * hardcodear siempre el dominio real rompería el testing local, porque
 * Mercado Pago redirigiría al sitio en vivo en vez de al servidor de dev.
 */
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

export const FRONTEND_BASE_URL = IS_PRODUCTION
  ? 'https://freakymonster.dipaoloproyects.space'
  : 'http://localhost:3000';
