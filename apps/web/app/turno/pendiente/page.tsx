import type { Metadata } from "next";
import { StatusPage } from "@/components/reservation/StatusPage";

export const metadata: Metadata = {
  title: "Pago pendiente",
};

export default function TurnoPendientePage() {
  return (
    <StatusPage
      variant="pending"
      title="Pago pendiente"
      message="Tu pago está pendiente de confirmación. Apenas se acredite vamos a confirmar tu turno — no hace falta que hagas nada más."
    />
  );
}
