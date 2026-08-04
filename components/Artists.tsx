import Image from "next/image";
import { artists } from "@/data/content";
import NoiseHeading from "./NoiseHeading";

export default function Artists() {
  return (
    <section
      id="artistas"
      className="border-b-2 border-plum px-5 py-16 sm:px-10 md:py-24"
    >
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 text-center sm:mb-14">
          <div className="mb-[14px] text-xs font-semibold uppercase tracking-[4px] text-toxic">
            El gremio
          </div>
          <NoiseHeading color="toxic" className="text-[clamp(30px,4vw,46px)]">
            Artistas
          </NoiseHeading>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-6">
          {artists.map((artist) => (
            <div
              key={artist.name}
              className="border-2 border-plum bg-panel p-5 text-center"
            >
              <div className="relative mb-4 aspect-square overflow-hidden border-2 border-plum">
                <Image
                  src={artist.image}
                  alt={artist.name}
                  fill
                  sizes="(min-width: 640px) 230px, 45vw"
                  className="object-cover"
                />
              </div>
              <div className="mb-1.5 font-display text-[19px] text-bone">
                {artist.name}
              </div>
              <div className="text-xs font-semibold uppercase tracking-[1.5px] text-toxic">
                {artist.specialty}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
