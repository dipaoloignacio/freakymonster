import type { Metadata } from "next";
import TattooPreview from "@/components/dev/TattooPreview";

/**
 * Ruta de trabajo del previsualizador. Va con noindex y además /dev/ está
 * bloqueado en app/robots.ts.
 */
export const metadata: Metadata = {
  title: "Previsualizador de tatuajes",
  robots: { index: false, follow: false },
};

export default function DevPrevisualizadorPage() {
  return <TattooPreview />;
}
