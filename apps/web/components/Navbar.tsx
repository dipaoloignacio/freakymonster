"use client";

import { useState } from "react";
import Image from "next/image";
import { useReservationModal } from "@/components/reservation/ReservationModal";
import GiftBox from "@/components/doodles/GiftBox";
import { CTA_SOLID_COMPACT } from "@/lib/buttonStyles";

/**
 * El ícono con su saltito. `motion-reduce:animate-none` apaga la animación
 * cuando el sistema pide menos movimiento — se resuelve con la variante de
 * Tailwind (que compila a una media query) y no con JavaScript, así que no hay
 * estado, ni hidratación, ni un primer frame animado antes de saber la
 * preferencia.
 */
function GiftCardIcon() {
  return (
    <GiftBox className="h-4 w-4 shrink-0 animate-giftNudge motion-reduce:animate-none" />
  );
}

const links = [
  { href: "#sobre", label: "Sobre" },
  { href: "#galeria", label: "Galería" },
  { href: "#artistas", label: "Artistas" },
  { href: "#estilos", label: "Estilos" },
  { href: "#contacto", label: "Contacto" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { openModal } = useReservationModal();

  return (
    <nav className="sticky top-0 z-[100] border-b-2 border-plum bg-ink/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-[18px] sm:px-10">
        <Image
          src="/nav-logo.jpg"
          alt="Freaky Monster Tattoo Studio"
          width={54}
          height={54}
          className="h-10 w-auto sm:h-[54px]"
          priority
        />
        <div className="hidden items-center gap-7 sm:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-semibold uppercase tracking-[1.5px] text-ash no-underline transition-colors hover:text-toxic"
            >
              {link.label}
            </a>
          ))}
          {/* Ruta real, no ancla como el resto del menú, pero <a> igual que
              ellos y no next/link: importar Link acá metía el router de Next en
              el bundle de la home (+9 KB de First Load JS) a cambio de un
              prefetch que no vale la pena para una página que casi nadie abre.
              Se muestra como link y no como segundo botón para no competir con
              el CTA de reservar. */}
          {/* Pill y no texto suelto: entre cinco links del mismo peso, el de
              gift card se perdía. El fondo tenue y el borde lo sacan de la fila
              y lo leen como algo en lo que se hace click, sin llegar a competir
              con el CTA de reservar, que sigue siendo el único sólido.

              rounded-full es deliberado en un sitio que corta esquinas en todos
              lados (clip-notch): justamente por ser la única forma redondeada
              de la barra, el ojo la encuentra sola. */}
          <a
            href="/gift-card"
            className="flex items-center gap-2 rounded-full border border-toxic/50 bg-toxic/10 py-1.5 pl-3 pr-4 text-sm font-semibold uppercase tracking-[1.5px] text-toxic no-underline transition-colors duration-150 hover:bg-toxic hover:text-ink"
          >
            <GiftCardIcon />
            Gift card
          </a>
          <button
            type="button"
            onClick={openModal}
            className={`clip-notch-sm bg-gore px-[22px] py-[10px] text-[13px] font-bold uppercase tracking-wide text-ink no-underline ${CTA_SOLID_COMPACT}`}
          >
            Reservar turno
          </button>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={open}
          className="flex h-9 w-9 flex-col items-center justify-center gap-[5px] sm:hidden"
        >
          <span
            className={`h-0.5 w-6 bg-bone transition-transform ${
              open ? "translate-y-[7px] rotate-45" : ""
            }`}
          />
          <span
            className={`h-0.5 w-6 bg-bone transition-opacity ${
              open ? "opacity-0" : ""
            }`}
          />
          <span
            className={`h-0.5 w-6 bg-bone transition-transform ${
              open ? "-translate-y-[7px] -rotate-45" : ""
            }`}
          />
        </button>
      </div>
      {open && (
        <div className="flex flex-col gap-1 border-t-2 border-plum px-5 pb-6 pt-4 sm:hidden">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="py-2 text-sm font-semibold uppercase tracking-[1.5px] text-ash no-underline transition-colors hover:text-toxic"
            >
              {link.label}
            </a>
          ))}
          <a
            href="/gift-card"
            onClick={() => setOpen(false)}
            className="mt-2 flex w-fit items-center gap-2 rounded-full border border-toxic/50 bg-toxic/10 py-1.5 pl-3 pr-4 text-sm font-semibold uppercase tracking-[1.5px] text-toxic no-underline transition-colors duration-150 hover:bg-toxic hover:text-ink"
          >
            <GiftCardIcon />
            Gift card
          </a>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              openModal();
            }}
            className={`clip-notch-sm mt-3 bg-gore px-[22px] py-[14px] text-center text-[13px] font-bold uppercase tracking-wide text-ink no-underline ${CTA_SOLID_COMPACT}`}
          >
            Reservar turno
          </button>
        </div>
      )}
    </nav>
  );
}
