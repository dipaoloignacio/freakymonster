// La misma URL interna que usa el render del servidor (ver lib/site.ts y
// lib/serverApi.ts). Se repite acá porque next.config.mjs se evalúa antes que
// cualquier módulo de la app y no puede importar TypeScript.
const API_INTERNAL_URL =
  process.env.API_INTERNAL_URL ??
  (process.env.NEXT_PUBLIC_API_URL?.startsWith("http")
    ? process.env.NEXT_PUBLIC_API_URL
    : "http://localhost:3001/api");

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  images: {
    // 30 días en vez de los 60 SEGUNDOS que Next pone por defecto. Medido en
    // producción, el logo del hero salía con
    // `Cache-Control: public, max-age=60, must-revalidate`: 230 KB de WebP que
    // el navegador vuelve a pedir cada minuto aunque el archivo no cambió.
    //
    // Es seguro estirarlo porque ninguna de las imágenes que pasan por acá se
    // edita en su lugar: las de public/ (logo, hero, about) cambian con un
    // deploy, y las fotos de tatuadores subidas desde el panel llegan con un
    // nombre de archivo nuevo cada vez, así que la URL —y por lo tanto la
    // entrada de caché— es otra.
    //
    // El costo de equivocarse: si se pisa un archivo de public/ manteniendo el
    // nombre, quien ya lo tenga cacheado sigue viendo el viejo hasta 30 días.
    // Renombrarlo (logo-v2.png) lo resuelve.
    minimumCacheTTL: 2592000,
    // Para dev: ahí el backend vive en un origen distinto (localhost:3001) y
    // resolveAssetUrl (lib/api.ts) devuelve una URL absoluta a ese host.
    // En producción la imageUrl queda relativa (mismo dominio vía Nginx), y
    // las URLs relativas NO pasan por remotePatterns — las resuelve el rewrite
    // de abajo.
    remotePatterns: [{ protocol: "http", hostname: "localhost" }],
  },
  async rewrites() {
    return [
      {
        // Las fotos subidas desde el panel las sirve el backend, no Next.
        //
        // En el navegador eso no es problema: Nginx manda /api/* al contenedor
        // de la API. Pero el optimizador de next/image, ante una URL RELATIVA,
        // la resuelve contra el propio servidor de Next —no contra el dominio
        // público—, así que el fetch nunca pasa por Nginx, cae en un
        // contenedor que no tiene /api/uploads y devuelve 400 con
        // "The requested resource isn't a valid image ... received null".
        // La imagen se veía rota en el sitio aunque el archivo existiera y
        // respondiera 200 pidiéndolo directo.
        //
        // Este rewrite le da a Next su propia ruta hacia la API, por la red
        // interna. Solo lo usa el optimizador: las requests del navegador ni
        // llegan acá, las atiende Nginx antes.
        source: "/api/uploads/:path*",
        destination: `${API_INTERNAL_URL}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
