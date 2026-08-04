import { testimonials } from "@/data/content";
import NoiseHeading from "./NoiseHeading";

export default function Testimonials() {
  return (
    <section className="border-b-2 border-plum px-5 py-16 sm:px-10 md:py-24">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 text-center sm:mb-14">
          <div className="mb-[14px] text-xs font-semibold uppercase tracking-[4px] text-toxic">
            Voces de piel marcada
          </div>
          <NoiseHeading color="toxic" className="text-[clamp(30px,4vw,46px)]">
            Testimonios
          </NoiseHeading>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="relative border-2 border-plum bg-panel p-7"
            >
              <div className="mb-1 font-display text-[42px] leading-none text-toxic">
                &ldquo;
              </div>
              <p className="mb-[18px] text-[15px] italic leading-[1.7] text-ashLight">
                {t.quote}
              </p>
              <div className="text-[13px] font-bold uppercase tracking-wide text-bone">
                {t.name}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
