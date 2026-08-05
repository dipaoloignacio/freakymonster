import Image from "next/image";
import { resolveAssetUrl, type Artist } from "@/lib/api";
import NoiseHeading from "./NoiseHeading";

/**
 * El markup de la sección #artistas. Está separado del componente que trae
 * los datos (Artists.tsx) porque lo renderizan dos caminos distintos: el
 * servidor con los datos de la generación, y el fallback de cliente cuando
 * esa generación no consiguió ninguno. El diseño tiene que ser idéntico en
 * los dos, así que vive en un solo lugar.
 */
export default function ArtistsSection({ artists }: { artists: Artist[] }) {
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
          {artists.map((artist) => {
            const imageUrl = resolveAssetUrl(artist.imageUrl);

            return (
              <div
                key={artist.id}
                className="border-2 border-plum bg-panel p-5 text-center"
              >
                <div className="relative mb-4 aspect-square overflow-hidden border-2 border-plum">
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt={artist.name}
                      fill
                      sizes="(min-width: 640px) 230px, 45vw"
                      className="object-cover"
                    />
                  ) : (
                    // La foto es opcional en la base: un tatuador cargado desde
                    // el panel sin imagen no puede dejar un hueco roto.
                    <div className="texture-panel h-full w-full" />
                  )}
                </div>
                <div className="mb-1.5 font-display text-[19px] text-bone">
                  {artist.name}
                </div>
                <div className="text-xs font-semibold uppercase tracking-[1.5px] text-toxic">
                  {artist.specialties.join(" / ")}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
