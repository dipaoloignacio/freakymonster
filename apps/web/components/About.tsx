import Image from "next/image";
import NoiseHeading from "./NoiseHeading";

export default function About() {
  return (
    <section
      id="sobre"
      className="border-b-2 border-plum px-5 py-16 sm:px-10 md:py-24"
    >
      <div className="mx-auto grid max-w-5xl items-center gap-10 lg:grid-cols-2 lg:gap-[70px]">
        <div>
          <div className="mb-[14px] text-xs font-semibold uppercase tracking-[4px] text-toxic">
            Sobre nosotros
          </div>
          <NoiseHeading
            color="gore"
            className="mb-[22px] text-[clamp(30px,4vw,46px)] leading-[1.1]"
          >
            Filosofía de estudio, disciplina de gremio
          </NoiseHeading>
          <p className="mb-4 text-base leading-[1.8] text-ashLight">
            Somos un colectivo de tatuadores que entiende la aguja como
            herramienta de precisión, no de moda. Cada sesión es higiene
            estricta, diseño a medida y respeto absoluto por la piel de cada
            cliente.
          </p>
          <p className="text-base leading-[1.8] text-ashLight">
            Trabajamos con cita previa, sin apuros y sin catálogos genéricos.
            Si venís a Freaky Monster, salís con algo que nadie más va a
            llevar puesto.
          </p>
        </div>
        <div className="relative aspect-[4/3] overflow-hidden rotate-[-0.6deg] border-2 border-plum">
          <Image
            src="/about.jpg"
            alt="Interior del estudio"
            fill
            sizes="(min-width: 1024px) 45vw, 90vw"
            className="object-cover"
          />
        </div>
      </div>
    </section>
  );
}
