"use client";

import { useState } from "react";
import Image from "next/image";
import { useReservationModal } from "@/components/reservation/ReservationModal";

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
          <button
            type="button"
            onClick={openModal}
            className="clip-notch-sm bg-gore px-[22px] py-[10px] text-[13px] font-bold uppercase tracking-wide text-ink no-underline"
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
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              openModal();
            }}
            className="clip-notch-sm mt-3 bg-gore px-[22px] py-[14px] text-center text-[13px] font-bold uppercase tracking-wide text-ink no-underline"
          >
            Reservar turno
          </button>
        </div>
      )}
    </nav>
  );
}
