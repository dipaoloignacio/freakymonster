"use client";

import Image from "next/image";
import { Reveal } from "@/components/motion/Reveal";
import { useReservationModal } from "@/components/reservation/ReservationModal";
import { whatsappConsultaUrl } from "@/data/content";

export default function Hero() {
  const { openModal } = useReservationModal();

  return (
    <section
      className="relative flex min-h-[88vh] flex-col items-center justify-center border-b-2 border-plum bg-cover bg-center px-6 py-20 text-center"
      style={{
        backgroundImage:
          "linear-gradient(180deg, rgba(13,11,10,0.55), rgba(13,11,10,0.88)), url('/hero.jpg')",
      }}
    >

      <div className="mb-[18px] text-xs font-semibold uppercase tracking-[4px] text-toxic">
        Tinta que no se olvida
      </div>
      {/* El fade de Motion corre una sola vez sobre este wrapper; el
          animate-flicker sigue en la <img> de adentro con su loop propio. Van
          en elementos distintos a propósito: los dos animan opacity, y en el
          mismo nodo el keyframe del flicker pisaría el fade a mitad de camino. */}
      <Reveal>
        <Image
          src="/logo.png"
          alt="Freaky Monster Tattoo Studio"
          width={1080}
          height={605}
          className="h-auto w-[clamp(260px,38vw,560px)] animate-flicker drop-shadow-[0_0_40px_rgba(0,0,0,0.6)]"
          priority
        />
      </Reveal>
      <p className="mx-auto mt-[26px] max-w-[620px] text-[clamp(16px,2vw,20px)] font-medium tracking-[0.3px] text-ashLight">
        No venimos a decorar piel. Venimos a marcarla para siempre. Blackwork,
        realismo y old school hechos con precisión quirúrgica y actitud de
        barrio.
      </p>
      <div className="mt-9 flex flex-wrap justify-center gap-4">
        <button
          type="button"
          onClick={openModal}
          className="clip-notch bg-gore px-10 py-4 text-[15px] font-bold uppercase tracking-[1.5px] text-ink no-underline shadow-[6px_6px_0_rgba(0,0,0,0.5)]"
        >
          Reservar turno
        </button>
        <a
          href={whatsappConsultaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="clip-notch flex items-center gap-2 border-2 border-ash px-9 py-[14px] text-[15px] font-bold uppercase tracking-[1.5px] text-bone no-underline"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-[18px] w-[18px] shrink-0"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.86 11.86 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413" />
          </svg>
          WhatsApp
        </a>
      </div>
    </section>
  );
}
