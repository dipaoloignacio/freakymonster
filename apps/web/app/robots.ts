import type { MetadataRoute } from "next";

const SITE_URL = "https://freakymonster.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // El código del panel de admin viaja en la URL — no debe indexarse.
      disallow: "/turnos/",
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
