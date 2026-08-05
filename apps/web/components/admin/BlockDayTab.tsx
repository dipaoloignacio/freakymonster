"use client";

import { useEffect, useState } from "react";
import { fetchArtists, type Artist } from "@/lib/api";
import { createAdminAvailabilityBlock } from "@/lib/adminApi";
import { formatDateLong } from "@/lib/mendozaTime";
import { DateStep } from "@/components/reservation/DateStep";
import { ErrorBox } from "@/components/reservation/shared";

export function BlockDayTab({ code }: { code: string }) {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [artistId, setArtistId] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blockedDate, setBlockedDate] = useState<string | null>(null);

  useEffect(() => {
    fetchArtists()
      .then((data) => {
        setArtists(data);
        setArtistId((current) => current || data[0]?.id || "");
      })
      .catch(() => setError("No pudimos cargar los tatuadores."));
  }, []);

  async function handleSelectDate(date: string) {
    // TEMPORAL: instrumentación para diagnosticar el parpadeo reportado.
    // Sacar una vez confirmada la causa.
    console.log("[DIAG] handleSelectDate: date=", date, "artistId=", artistId, "code=", code);
    if (!artistId) {
      console.log("[DIAG] artistId vacío, no se llama a la API");
      return;
    }
    setSubmitting(true);
    setError(null);
    setBlockedDate(null);
    try {
      const result = await createAdminAvailabilityBlock(code, artistId, date, reason.trim() || undefined);
      console.log("[DIAG] createAdminAvailabilityBlock OK, result=", result);
      setBlockedDate(date);
      setReason("");
    } catch (err) {
      console.error("[DIAG] createAdminAvailabilityBlock FALLÓ:", err);
      setError("No pudimos bloquear ese día. Probá de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  const selectedArtistName = artists.find((a) => a.id === artistId)?.name;

  return (
    <div className="max-w-md">
      <div className="mb-5 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-ash">
          Tatuador
          <select
            value={artistId}
            onChange={(e) => setArtistId(e.target.value)}
            className="border-2 border-plum bg-ink px-3 py-2 text-sm text-bone"
          >
            {artists.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-ash">
          Motivo (opcional)
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={200}
            rows={2}
            className="border-2 border-plum bg-ink px-3 py-2 text-sm text-bone"
            placeholder="Ej: vacaciones, feriado, turno médico…"
          />
        </label>
      </div>

      {error && (
        <div className="mb-4">
          <ErrorBox message={error} />
        </div>
      )}

      {blockedDate && (
        <div className="clip-notch-sm mb-4 border-2 border-toxic bg-toxic/10 p-4 text-sm font-semibold text-bone">
          Día bloqueado: {formatDateLong(blockedDate)}
          {selectedArtistName ? ` para ${selectedArtistName}` : ""}.
        </div>
      )}

      {!artistId ? (
        <p className="text-sm text-ashLight">Cargando tatuadores…</p>
      ) : (
        <fieldset disabled={submitting}>
          <DateStep onSelect={handleSelectDate} title="Elegí el día a bloquear" />
        </fieldset>
      )}
    </div>
  );
}
