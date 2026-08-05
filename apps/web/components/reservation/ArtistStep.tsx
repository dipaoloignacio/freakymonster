import Image from "next/image";
import type { Artist } from "@/lib/api";
import { EmptyState, ErrorBox, Spinner, StepEyebrow } from "./shared";

export function ArtistStep({
  artists,
  loading,
  error,
  onRetry,
  onSelect,
}: {
  artists: Artist[] | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onSelect: (artist: Artist) => void;
}) {
  return (
    <div>
      <StepEyebrow step={1} total={5} label="Elegí tu tatuador" />

      {loading && <Spinner label="Cargando tatuadores…" />}
      {!loading && error && <ErrorBox message={error} onRetry={onRetry} />}
      {!loading && !error && artists && artists.length === 0 && (
        <EmptyState message="No hay tatuadores disponibles en este momento." />
      )}
      {!loading && !error && artists && artists.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {artists.map((artist) => (
            <button
              key={artist.id}
              type="button"
              onClick={() => onSelect(artist)}
              className="clip-notch-sm border-2 border-plum bg-panel p-4 text-center transition-colors hover:border-gore"
            >
              <div className="relative mb-3 aspect-square overflow-hidden border-2 border-plum">
                {artist.imageUrl ? (
                  <Image
                    src={artist.imageUrl}
                    alt={artist.name}
                    fill
                    sizes="(min-width: 640px) 280px, 45vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="texture-panel h-full w-full" />
                )}
              </div>
              <div className="mb-1 font-display text-base text-bone">{artist.name}</div>
              {artist.specialties.length > 0 && (
                <div className="text-[11px] font-semibold uppercase tracking-[1.5px] text-toxic">
                  {artist.specialties.join(" / ")}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
