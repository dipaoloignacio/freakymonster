import type { Metadata } from "next";
import { GiftCardPurchase } from "@/components/gift-card/GiftCardPurchase";

export const metadata: Metadata = {
  title: "Gift card — Freaky Monster Tattoo Studio",
  description:
    "Regalá un tatuaje: elegí el monto, pagalo online y el código llega por mail para usarlo con el tatuador y el diseño que quiera.",
};

export default function GiftCardPage() {
  return <GiftCardPurchase />;
}
