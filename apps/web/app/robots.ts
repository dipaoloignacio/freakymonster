import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // El código del panel de admin viaja en la URL — no debe indexarse.
      // /dev/ son páginas de trabajo (pruebas de carga del modelo 3D, etc.),
      // no tienen por qué aparecer en una búsqueda.
      disallow: ["/turnos/", "/dev/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
