import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import Grain from "@/components/Grain";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import NoiseHeading from "@/components/NoiseHeading";
import GalleryGrid from "@/components/gallery/GalleryGrid";
import { fetchGalleryImagesForRender } from "@/lib/serverApi";
import { resolveAssetUrl } from "@/lib/api";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Galería de trabajos",
  description:
    "Trabajos del estudio Freaky Monster Tattoo, en el microcentro de Mendoza. Filtrá por estilo o por tatuador y mirá el portfolio de cada uno antes de reservar.",
  alternates: { canonical: `${SITE_URL}/galeria` },
};

type SearchParams = { artistId?: string; style?: string };

/**
 * Los filtros son LINKS y no estado de cliente. Tres cosas salen gratis de eso:
 * la URL siempre refleja lo que se está mirando (se puede compartir "los
 * trabajos de Renzo"), el filtrado lo hace la base y no el navegador, y el
 * grid llega renderizado desde el servidor en vez de aparecer después de una
 * request. Es también lo que hace que /galeria?artistId=xxx funcione entrando
 * de una, que es lo que necesita el link desde la tarjeta del tatuador.
 */
function buildHref(current: SearchParams, patch: Partial<SearchParams>): string {
  const next = { ...current, ...patch };
  const params = new URLSearchParams();
  if (next.artistId) params.set("artistId", next.artistId);
  if (next.style) params.set("style", next.style);
  const query = params.toString();
  return query ? `/galeria?${query}` : "/galeria";
}

export default async function GaleriaPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const artistId = params.artistId || undefined;
  const style = params.style || undefined;

  // Dos consultas con propósitos distintos: `all` es de dónde salen las
  // opciones de filtro, y `visible` es lo que se muestra.
  //
  // Las opciones NO pueden salir del subconjunto filtrado: si lo hicieran,
  // elegir un tatuador dejaría a la vista solo los estilos de ese tatuador y
  // no habría forma de volver a los otros — el filtro se cerraría sobre sí
  // mismo. Cuando no hay filtro activo las dos consultas piden lo mismo, así
  // que se reutiliza una sola.
  const all = await fetchGalleryImagesForRender();
  const visible = artistId || style ? await fetchGalleryImagesForRender({ artistId, style }) : all;

  if (all === null || visible === null) {
    return (
      <Shell>
        <p className="border-2 border-plum bg-panel p-8 text-center text-sm text-ashLight">
          No pudimos cargar la galería en este momento. Probá de nuevo en un rato.
        </p>
      </Shell>
    );
  }

  // Opciones derivadas de lo que hay cargado, nunca escritas a mano: un estilo
  // nuevo aparece solo cuando alguien lo usa por primera vez desde el panel.
  const styles = [...new Set(all.flatMap((image) => image.styles))].sort((a, b) =>
    a.localeCompare(b, "es")
  );

  const artists = [...new Map(all.filter((i) => i.artist).map((i) => [i.artist!.id, i.artist!])).values()]
    .map((artist) => ({
      ...artist,
      // Se toma la foto de un trabajo suyo como miniatura del filtro: la
      // galería no trae el avatar del tatuador y pedir /artists solo para eso
      // sería una request de más.
      thumb: all.find((i) => i.artistId === artist.id)?.imageUrl ?? null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));

  const activeArtist = artists.find((a) => a.id === artistId) ?? null;

  return (
    <Shell>
      {styles.length > 0 && (
        <FilterRow label="Estilo">
          <Chip href={buildHref(params, { style: undefined })} active={!style}>
            Todos
          </Chip>
          {styles.map((option) => (
            <Chip
              key={option}
              href={buildHref(params, { style: option })}
              active={style === option}
            >
              {option}
            </Chip>
          ))}
        </FilterRow>
      )}

      {artists.length > 0 && (
        <FilterRow label="Tatuador">
          <Chip href={buildHref(params, { artistId: undefined })} active={!artistId}>
            Todos
          </Chip>
          {artists.map((artist) => {
            const thumb = resolveAssetUrl(artist.thumb);
            return (
              <Chip
                key={artist.id}
                href={buildHref(params, { artistId: artist.id })}
                active={artistId === artist.id}
              >
                {thumb && (
                  <span className="relative mr-2 inline-block h-5 w-5 shrink-0 overflow-hidden rounded-full align-middle">
                    <Image src={thumb} alt="" fill sizes="20px" className="object-cover" />
                  </span>
                )}
                {artist.name}
              </Chip>
            );
          })}
        </FilterRow>
      )}

      <div className="mb-5 flex items-baseline justify-between gap-4">
        <p className="text-xs uppercase tracking-[2px] text-ash">
          {visible.length} {visible.length === 1 ? "trabajo" : "trabajos"}
          {activeArtist ? ` de ${activeArtist.name}` : ""}
          {style ? ` · ${style}` : ""}
        </p>
        {(artistId || style) && (
          <Link
            href="/galeria"
            className="shrink-0 text-xs font-bold uppercase tracking-wide text-gore no-underline hover:underline"
          >
            Limpiar filtros
          </Link>
        )}
      </div>

      <GalleryGrid images={visible} />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-full overflow-hidden bg-ink text-bone">
      <Grain />
      <Navbar />
      <main className="mx-auto max-w-6xl px-5 py-14 sm:px-10 md:py-20">
        <div className="mb-10 text-center">
          <div className="mb-[14px] text-xs font-semibold uppercase tracking-[4px] text-toxic">
            El portfolio
          </div>
          <NoiseHeading color="gore" className="text-[clamp(30px,4vw,46px)]">
            Galería
          </NoiseHeading>
        </div>
        {children}
      </main>
      <Footer />
    </div>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-[2px] text-ash">
        {label}
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Chip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      // scroll={false}: al cambiar de filtro la página salta arriba de todo y
      // se pierde de vista la fila de filtros que se acaba de tocar.
      scroll={false}
      aria-current={active ? "true" : undefined}
      className={`clip-notch-sm flex items-center px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide no-underline transition-colors ${
        active
          ? "bg-gore text-ink"
          : "border-2 border-plum text-ashLight hover:border-ash hover:text-bone"
      }`}
    >
      {children}
    </Link>
  );
}
