import type { Metadata } from "next";
import ModelProbe from "@/components/dev/ModelProbe";

/**
 * Ruta de trabajo para el previsualizador de tatuajes, no parte del sitio.
 * Va con noindex y además /dev/ está bloqueado en app/robots.ts.
 */
export const metadata: Metadata = {
  title: "Prueba de modelo 3D",
  robots: { index: false, follow: false },
};

export default function DevModeloPage() {
  return <ModelProbe />;
}
