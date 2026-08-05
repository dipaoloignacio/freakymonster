"use client";

import { useEffect, useState } from "react";
import { fetchArtists, type Artist } from "@/lib/api";
import {
  createAdminAvailabilityBlock,
  deleteAdminAvailabilityBlock,
  fetchAdminAvailabilityBlocks,
  type AdminAvailabilityBlock,
} from "@/lib/adminApi";
import { formatDateLong } from "@/lib/mendozaTime";
import { DateStep } from "@/components/reservation/DateStep";
import { ErrorBox, Spinner } from "@/components/reservation/shared";

// Valor del <select> para "todos": el backend interpreta la ausencia de
// artistId como "todos los activos", así que acá se manda null.
const ALL_ARTISTS = "__all__";

export function BlockDayTab({ code }: { code: string }) {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [artistId, setArtistId] = useState(ALL_ARTISTS);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [blocks, setBlocks] = useState<AdminAvailabilityBlock[] | null>(null);
  const [blocksError, setBlocksError] = useState<string | null>(null);

  async function loadBlocks() {
    setBlocksError(null);
    try {
      setBlocks(await fetchAdminAvailabilityBlocks(code));
    } catch {
      setBlocksError("No pudimos cargar los días bloqueados.");
    }
  }

  useEffect(() => {
    fetchArtists()
      .then(setArtists)
      .catch(() => setError("No pudimos cargar los tatuadores."));
    loadBlocks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSelectDate(date: string) {
    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      const target = artistId === ALL_ARTISTS ? null : artistId;
      const result = await createAdminAvailabilityBlock(code, target, date, reason.trim() || undefined);
      const who = target ? artists.find((a) => a.id === target)?.name : "todos los tatuadores";
      setNotice(
        result.created === 0
          ? `${formatDateLong(date)} ya estaba bloqueado para ${who}.`
          : `${formatDateLong(date)} bloqueado para ${who}.` +
              (result.alreadyBlocked > 0 ? ` (${result.alreadyBlocked} ya estaban bloqueados)` : "")
      );
      setReason("");
      await loadBlocks();
    } catch {
      setError("No pudimos bloquear ese día. Probá de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(block: AdminAvailabilityBlock) {
    setError(null);
    setNotice(null);
    try {
      await deleteAdminAvailabilityBlock(code, block.id);
      await loadBlocks();
    } catch {
      setError("No pudimos desbloquear ese día. Probá de nuevo.");
    }
  }

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
      <div className="max-w-md lg:flex-1">
        <div className="mb-5 flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-ash">
            Tatuador
            <select
              value={artistId}
              onChange={(e) => setArtistId(e.target.value)}
              className="border-2 border-plum bg-ink px-3 py-2 text-sm text-bone"
            >
              <option value={ALL_ARTISTS}>Todos los tatuadores (feriado / cierre)</option>
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

        {notice && (
          <div className="clip-notch-sm mb-4 border-2 border-toxic bg-toxic/10 p-4 text-sm font-semibold text-bone">
            {notice}
          </div>
        )}

        <fieldset disabled={submitting}>
          <DateStep onSelect={handleSelectDate} title="Elegí el día a bloquear" />
        </fieldset>
      </div>

      <div className="lg:flex-1">
        <h3 className="mb-3 font-display text-lg text-bone">Días bloqueados</h3>

        {blocksError && <ErrorBox message={blocksError} onRetry={loadBlocks} />}
        {!blocksError && blocks === null && <Spinner label="Cargando bloqueos…" />}
        {!blocksError && blocks && blocks.length === 0 && (
          <p className="border-2 border-plum bg-panel p-5 text-center text-sm text-ashLight">
            No hay días bloqueados de hoy en adelante.
          </p>
        )}

        {!blocksError && blocks && blocks.length > 0 && (
          <ul className="flex flex-col gap-2">
            {blocks.map((block) => (
              <li
                key={block.id}
                className="clip-notch-sm flex items-center justify-between gap-3 border-2 border-plum bg-panel px-4 py-2.5"
              >
                <div className="min-w-0">
                  <div className="text-sm text-bone">{formatDateLong(block.date.slice(0, 10))}</div>
                  <div className="truncate text-xs text-ashLight">
                    {block.artist.name}
                    {block.reason ? ` — ${block.reason}` : ""}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(block)}
                  className="shrink-0 border border-gore px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-gore transition-colors hover:bg-gore hover:text-ink"
                >
                  Desbloquear
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
