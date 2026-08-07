import type { Metadata } from "next";
import Link from "next/link";
import { StatusPage } from "@/components/reservation/StatusPage";
import { CTA_SOLID_COMPACT } from "@/lib/buttonStyles";

export const metadata: Metadata = {
  title: "No pudimos cobrar la gift card",
};

export default function GiftCardErrorPage() {
  return (
    <StatusPage
      variant="error"
      title="El pago no se completó"
      message="No se cobró nada. Podés intentarlo de nuevo; si te vuelve a pasar, escribinos y lo resolvemos por WhatsApp."
      cta={
        <Link
          href="/gift-card"
          className={`clip-notch-sm bg-gore px-6 py-3 text-sm font-bold uppercase tracking-wide text-ink no-underline ${CTA_SOLID_COMPACT}`}
        >
          Probar de nuevo
        </Link>
      }
    />
  );
}
