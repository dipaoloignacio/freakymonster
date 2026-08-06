import type { Metadata } from "next";
import { StatusPage } from "@/components/reservation/StatusPage";

export const metadata: Metadata = {
  title: "Gift card confirmada",
};

// El código lo genera el webhook de Mercado Pago, que puede llegar unos
// segundos después del redirect — por eso el texto habla del mail y no muestra
// el código acá: mostrarlo implicaría esperar a que el webhook haya corrido.
export default function GiftCardConfirmadaPage() {
  return (
    <StatusPage
      variant="success"
      title="¡Listo!"
      message="El pago salió bien. En unos minutos llega el mail con el código de la gift card — si la compraste para regalar, le llega directo a esa persona."
    />
  );
}
