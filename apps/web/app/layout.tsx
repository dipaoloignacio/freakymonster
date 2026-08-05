import type { Metadata } from "next";
import { Anton, Cinzel, Oswald, UnifrakturMaguntia } from "next/font/google";
import { ReservationModalProvider } from "@/components/reservation/ReservationModal";
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

const SITE_URL = "https://freakymonster.vercel.app";

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
  openGraph: {
    type: "website",
    locale: "es_AR",
    url: SITE_URL,
    siteName: "Freaky Monster Tattoo Studio",
    title: "Freaky Monster Tattoo Studio — Tatuajes en Mendoza",
    description:
      "Estudio de tatuajes en el microcentro de Mendoza (km0). Blackwork, realismo y old school hechos con precisión quirúrgica.",
    images: ["/hero.jpg"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Freaky Monster Tattoo Studio — Tatuajes en Mendoza",
    description:
      "Estudio de tatuajes en el microcentro de Mendoza (km0). Blackwork, realismo y old school.",
    images: ["/hero.jpg"],
  },
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
