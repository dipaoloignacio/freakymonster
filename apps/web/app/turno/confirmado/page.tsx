import type { Metadata } from "next";
import { StatusPage } from "@/components/reservation/StatusPage";

export const metadata: Metadata = {
  title: "Seña confirmada",
};

export default function TurnoConfirmadoPage() {
  return (
    <StatusPage
      variant="success"
      title="¡Gracias!"
      message="Tu seña fue recibida. En breve te contactamos para coordinar los últimos detalles de tu turno."
    />
  );
}
