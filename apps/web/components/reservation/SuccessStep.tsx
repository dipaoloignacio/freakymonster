import type { Artist, ArtistServiceOption } from "@/lib/api";
import { formatDateLong, formatSlotTime } from "@/lib/mendozaTime";
import { PrimaryButton } from "./shared";

export function SuccessStep({
  artist,
  service,
  date,
  slotIso,
  onClose,
}: {
  artist: Artist;
  service: ArtistServiceOption;
  date: string;
  slotIso: string;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col items-center py-6 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full border-2 border-toxic text-3xl text-toxic">
        ✓
      </div>
      <h3 className="mb-2 font-display text-2xl text-bone">¡Reserva creada!</h3>
      <p className="mb-6 max-w-sm text-sm text-ashLight">
        Te vamos a contactar para coordinar los últimos detalles. Guardá esta info:
      </p>
      <div className="clip-notch-sm mb-8 w-full max-w-sm border-2 border-plum bg-panel p-4 text-left text-sm text-ashLight">
        <div>
          <span className="text-toxic">Tatuador:</span> {artist.name}
        </div>
        <div>
          <span className="text-toxic">Servicio:</span> {service.name}
        </div>
        <div>
          <span className="text-toxic">Cuándo:</span> {formatDateLong(date)}, {formatSlotTime(slotIso)} hs
        </div>
      </div>
      <PrimaryButton onClick={onClose}>Listo</PrimaryButton>
    </div>
  );
}
