import Image from "next/image";
import { whatsappUrl } from "@/data/content";

export default function Footer() {
  return (
    <footer id="contacto" className="bg-panel2 px-5 pb-10 pt-14 sm:px-10 sm:pt-20">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-10">
          <div>
            <Image
              src="/nav-logo.jpg"
              alt="Freaky Monster Tattoo Studio"
              width={64}
              height={64}
              className="mb-[14px] h-16 w-auto"
            />
            <p className="max-w-[280px] text-sm leading-[1.7] text-ash">
              Tinta seria, actitud honesta. Con cita previa, todos los días
              laborables.
            </p>
          </div>
          <div>
            <div className="mb-[14px] text-[13px] font-bold uppercase tracking-[1.5px] text-toxic">
              Dirección
            </div>
            <p className="text-sm leading-[1.8] text-ash">
              Garibaldi 7
              <br />
              M5500 Mendoza, Argentina
            </p>
            <a
              href="tel:+542617199005"
              className="mt-2 block text-sm font-semibold text-bone no-underline"
            >
              0261 719-9005
            </a>
          </div>
          <div>
            <div className="mb-[14px] text-[13px] font-bold uppercase tracking-[1.5px] text-toxic">
              Horarios
            </div>
            <p className="text-sm leading-[1.8] text-ash">
              Con cita previa
              <br />
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-bone no-underline"
              >
                Consultanos por WhatsApp
              </a>
            </p>
          </div>
          <div>
            <div className="mb-[14px] text-[13px] font-bold uppercase tracking-[1.5px] text-toxic">
              Redes
            </div>
            <div className="flex flex-col gap-2">
              <a
                href="https://www.instagram.com/freakymonster.tattoostudio"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-bone no-underline"
              >
                Instagram
              </a>
            </div>
          </div>
        </div>
        <div className="border-t-2 border-plum pt-[22px] text-center text-xs uppercase tracking-wide text-ash">
          © {new Date().getFullYear()} Freaky Monster Tattoo Studio. Todos los
          derechos reservados.
        </div>
      </div>
    </footer>
  );
}
