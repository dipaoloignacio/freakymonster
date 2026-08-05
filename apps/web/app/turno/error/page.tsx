import type { Metadata } from "next";
import { StatusPage } from "@/components/reservation/StatusPage";
import { whatsappPaymentIssueUrl } from "@/data/content";

export const metadata: Metadata = {
  title: "Problema con el pago",
};

export default function TurnoErrorPage() {
  return (
    <StatusPage
      variant="error"
      title="Hubo un problema"
      message="Algo falló con el pago de tu seña. Tu turno todavía no está confirmado — contactanos por WhatsApp y lo resolvemos."
      cta={
        <a
          href={whatsappPaymentIssueUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="clip-notch-sm bg-gore px-6 py-3 text-sm font-bold uppercase tracking-wide text-ink no-underline"
        >
          Escribinos por WhatsApp
        </a>
      }
    />
  );
}
