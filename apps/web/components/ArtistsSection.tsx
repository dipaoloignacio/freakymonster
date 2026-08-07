import Image from "next/image";
import { resolveAssetUrl, type Artist } from "@/lib/api";
import NoiseHeading from "./NoiseHeading";
import { Reveal, STAGGER_STEP } from "@/components/motion/Reveal";

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
          {artists.map((artist, index) => {
            const imageUrl = resolveAssetUrl(artist.imageUrl);

            return (
              // La cascada va por índice de tarjeta: entran una atrás de otra
              // en vez de todas juntas.
              <Reveal
                key={artist.id}
                delay={index * STAGGER_STEP}
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
                {/* Lleva a la galería con el filtro ya puesto. El artistId va
                    en la URL y no en estado de cliente justamente para que un
                    link como este funcione entrando de una — ver el comentario
                    de buildHref() en app/galeria/page.tsx.

                    <a> y NO next/link, por el mismo motivo que la Navbar (ver
                    el comentario ahí): importar Link en un componente de la
                    home mete el router de Next en su bundle, +9 KB de First
                    Load JS medidos. La home es la página más visitada del
                    sitio; el prefetch de /galeria no paga eso. Adentro de
                    /galeria sí se usa Link, porque ahí el router ya está y los
                    filtros lo necesitan para no recargar la página entera. */}
                <a
                  href={`/galeria?artistId=${artist.id}`}
                  className="clip-notch-sm mt-4 inline-block border-2 border-plum px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-ashLight no-underline transition-colors hover:border-gore hover:text-bone"
                >
                  Ver trabajos de {artist.name.split(" ")[0]}
                </a>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
