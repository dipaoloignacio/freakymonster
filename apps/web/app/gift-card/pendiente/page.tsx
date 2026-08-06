import type { Metadata } from "next";
import { StatusPage } from "@/components/reservation/StatusPage";

export const metadata: Metadata = {
  title: "Pago pendiente",
};

export default function GiftCardPendientePage() {
  return (
    <StatusPage
      variant="pending"
      title="Pago en proceso"
      message="Mercado Pago todavía está procesando el pago. Cuando se acredite te mandamos el código por mail, sin que tengas que hacer nada."
    />
  );
}
