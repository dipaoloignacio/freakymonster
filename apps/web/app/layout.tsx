import type { Metadata, Viewport } from "next";
import { Anton, Cinzel, Oswald, UnifrakturMaguntia } from "next/font/google";
import { ReservationModalProvider } from "@/components/reservation/ReservationModal";
import { OG_IMAGE, SITE_URL } from "@/lib/site";
import "./globals.css";

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-cinzel",
});

const oswald = Oswald({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-oswald",
});

const unifraktur = UnifrakturMaguntia({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-unifraktur",
});

const anton = Anton({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-anton",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Freaky Monster Tattoo Studio — Tatuajes en Mendoza",
    template: "%s | Freaky Monster Tattoo Studio",
  },
  description:
    "Estudio de tatuajes en el microcentro de Mendoza (km0). Blackwork, realismo y old school hechos con precisión quirúrgica. Reservá tu turno en Garibaldi 7.",
  keywords: [
    "tattoo mendoza",
    "tatuajes mendoza",
    "estudio de tatuajes mendoza",
    "tatuador mendoza",
    "blackwork mendoza",
    "realismo tatuaje mendoza",
  ],
  alternates: {
    canonical: SITE_URL,
  },
  /**
   * Los íconos van declarados acá y los archivos viven en public/, en vez de
   * usar la convención app/icon.png + app/apple-icon.png. Dos razones:
   *
   * 1. La convención de archivos gana sobre metadata.icons — con icon.png en
   *    app/ este bloque se ignoraría entero y no habría forma de agregar el
   *    SVG ni el 32x32.
   * 2. Un solo PNG de 512 no alcanza: el navegador lo reduce a 16px y la
   *    ilustración queda ilegible. Por eso favicon.svg y los PNG chicos son
   *    una marca simplificada (ver public/favicon.svg) y la ilustración
   *    completa queda para los tamaños donde sí se lee — apple-touch e
   *    íconos del manifest.
   *
   * El orden importa: los navegadores modernos toman el último rel="icon"
   * que entienden, así que el SVG va al final para que gane sobre los PNG.
   */
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    type: "website",
    locale: "es_AR",
    url: SITE_URL,
    siteName: "Freaky Monster Tattoo Studio",
    title: "Freaky Monster Tattoo Studio — Tatuajes en Mendoza",
    description:
      "Estudio de tatuajes en el microcentro de Mendoza (km0). Blackwork, realismo y old school hechos con precisión quirúrgica.",
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "Freaky Monster Tattoo Studio — Tatuajes en Mendoza",
    description:
      "Estudio de tatuajes en el microcentro de Mendoza (km0). Blackwork, realismo y old school.",
    images: [OG_IMAGE],
  },
};

/**
 * `themeColor` pinta la barra del navegador en mobile (Chrome Android, Safari
 * 15+) del mismo ink que el fondo del sitio, así la barra se funde con la
 * página en vez de cortarla con una franja blanca. Es el mismo valor que
 * `background` en globals.css y que `theme_color` en app/manifest.ts — si
 * cambia uno, cambian los tres.
 *
 * Un solo color y no un par light/dark porque el sitio no tiene modo claro:
 * el fondo es ink siempre, mire como mire el sistema operativo.
 *
 * Va en su propio export y no adentro de `metadata` porque desde Next 14
 * themeColor/viewport ahí tiran warning de deprecación y se ignoran.
 */
export const viewport: Viewport = {
  themeColor: "#0d0b0a",
};

const localBusinessJsonLd = {
  "@context": "https://schema.org",
  "@type": "TattooParlor",
  name: "Freaky Monster Tattoo Studio",
  image: `${SITE_URL}/hero.jpg`,
  url: SITE_URL,
  telephone: "+542617199005",
  priceRange: "$$",
  sameAs: ["https://www.instagram.com/freakymonster.tattoostudio"],
  address: {
    "@type": "PostalAddress",
    streetAddress: "Garibaldi 7",
    addressLocality: "Mendoza",
    addressRegion: "Mendoza",
    postalCode: "M5500",
    addressCountry: "AR",
  },
  areaServed: {
    "@type": "City",
    name: "Mendoza",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${cinzel.variable} ${oswald.variable} ${unifraktur.variable} ${anton.variable} font-body`}
      >
        <ReservationModalProvider>{children}</ReservationModalProvider>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }}
        />
      </body>
    </html>
  );
}
