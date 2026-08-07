"use client";

import Image from "next/image";
import FourPointStar from "@/components/doodles/FourPointStar";
import type { GiftCardTier } from "@/lib/api";

/**
 * Un monto de gift card, dibujado como la tarjeta que el estudio entrega.
 *
 * La versión anterior eran botones cuadrados con un número adentro: se leían
 * como una lista de precios, que es exactamente lo que uno NO quiere sentir
 * cuando está por regalar algo. Con la proporción de una tarjeta de crédito
 * (8:5), el fondo con textura y el logo, la elección pasa a ser "cuál de estas
 * le doy" en vez de "cuánto gasto".
 *
 * La proporción se fija con aspect-ratio y no con un alto en píxeles: así se
 * mantiene igual cuando las tarjetas se apilan en mobile y ocupan todo el
 * ancho, que es donde un alto fijo las dejaría achatadas o estiradas.
 */
export default function GiftCardTile({
  tier,
  selected,
  onSelect,
  formatMoney,
}: {
  tier: GiftCardTier;
  selected: boolean;
  onSelect: () => void;
  formatMoney: (amount: string) => string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`clip-notch texture-panel group relative flex aspect-[8/5] w-full flex-col justify-between overflow-hidden border-2 p-4 text-left transition-all duration-200 ease-out sm:p-5 ${
        selected
          ? // Borde toxic + un escalado apenas perceptible. El escalado solo no
            // alcanza para confirmar una elección —es demasiado sutil— y el
            // borde solo se pierde entre las otras tarjetas, que también tienen
            // borde. Juntos no hay duda de cuál quedó elegida.
            "scale-[1.03] border-toxic shadow-[0_0_0_1px_rgba(129,193,72,0.35)]"
          : "border-plum hover:border-ash"
      }`}
    >
      {/* Estrella decorativa, detrás de todo y recortada por el overflow. Es uno
          de los doodles que ya existían en el sitio y que había quedado sin uso.
          Va en opacidad baja: tiene que sentirse como textura impresa, no como
          un elemento más que compita con el monto. */}
      <FourPointStar
        className={`pointer-events-none absolute -right-6 -top-6 h-28 w-28 transition-colors duration-200 ${
          selected ? "text-toxic/25" : "text-plum/40"
        }`}
      />

      <div className="relative flex items-start justify-between gap-3">
        <Image
          src="/email-logo.png"
          alt=""
          width={440}
          height={246}
          sizes="120px"
          className="h-auto w-[92px] shrink-0 sm:w-[110px]"
        />
        {tier.label && (
          <span className="clip-notch-sm shrink-0 border border-toxic px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-toxic">
            {tier.label}
          </span>
        )}
      </div>

      <div className="relative">
        <div
          className={`font-heading text-[clamp(30px,7vw,44px)] uppercase leading-none tracking-wide transition-colors duration-200 ${
            selected ? "text-toxic" : "text-bone"
          }`}
        >
          {formatMoney(tier.amount)}
        </div>
        <div className="mt-1.5 text-[10px] font-semibold uppercase tracking-[2px] text-ash">
          Freaky Monster Tattoo Studio
        </div>
      </div>

      {/* Marca de elegida. Ocupa lugar siempre (invisible cuando no aplica) para
          que la tarjeta no cambie de alto al seleccionarla. */}
      <span
        className={`absolute bottom-3 right-4 text-[10px] font-bold uppercase tracking-[1.5px] text-toxic transition-opacity duration-200 sm:bottom-4 sm:right-5 ${
          selected ? "opacity-100" : "opacity-0"
        }`}
      >
        Elegida
      </span>
    </button>
  );
}
