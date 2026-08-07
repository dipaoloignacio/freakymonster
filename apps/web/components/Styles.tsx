import { styles } from "@/data/content";
import NoiseHeading from "./NoiseHeading";
import { CTA_OUTLINE_ASH } from "@/lib/buttonStyles";

export default function Styles() {
  return (
    <section
      id="estilos"
      className="border-b-2 border-plum bg-panel2 px-5 py-16 sm:px-10 md:py-24"
    >
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 text-center sm:mb-14">
          <div className="mb-[14px] text-xs font-semibold uppercase tracking-[4px] text-toxic">
            Especialidades
          </div>
          <NoiseHeading color="toxic" className="text-[clamp(30px,4vw,46px)]">
            Estilos que trabajamos
          </NoiseHeading>
        </div>
        <div className="flex flex-wrap justify-center gap-3.5">
          {styles.map((style) => (
            <div
              key={style.name}
              className={`clip-notch-sm border-2 border-ash px-6 py-3 text-sm font-semibold uppercase tracking-wide text-bone ${CTA_OUTLINE_ASH}`}
            >
              {style.name}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
