"use client";

import { useEffect, useState } from "react";
import { fetchAvailability } from "@/lib/api";
import { formatDateLong, formatSlotTime } from "@/lib/mendozaTime";
import { BackLink, EmptyState, ErrorBox, Spinner, StepEyebrow } from "./shared";

export function TimeStep({
  artistId,
  serviceId,
  date,
  conflictMessage,
  refreshKey,
  onSelect,
  onBack,
}: {
  artistId: string;
  serviceId: string;
  date: string;
  conflictMessage: string | null;
  refreshKey: number;
  onSelect: (iso: string) => void;
  onBack: () => void;
}) {
  const [slots, setSlots] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetchAvailability(artistId, serviceId, date)
      .then((data) => {
        if (active) setSlots(data);
      })
      .catch(() => {
        if (active) setError("No pudimos cargar los horarios disponibles.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artistId, serviceId, date, refreshKey, attempt]);

  return (
    <div>
      <StepEyebrow step={4} total={5} label={`Horarios para el ${formatDateLong(date)}`} />

      {conflictMessage && (
        <div className="clip-notch-sm mb-4 border-2 border-gore bg-gore/10 p-4 text-center text-sm font-semibold text-bone">
          {conflictMessage}
        </div>
      )}

      {loading && <Spinner label="Buscando horarios…" />}
      {!loading && error && <ErrorBox message={error} onRetry={() => setAttempt((n) => n + 1)} />}
      {!loading && !error && slots && slots.length === 0 && (
        <EmptyState message="Sin horarios disponibles este día. Probá con otra fecha." />
      )}
      {!loading && !error && slots && slots.length > 0 && (
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
          {slots.map((iso) => (
            <button
              key={iso}
              type="button"
              onClick={() => onSelect(iso)}
              className="clip-notch-sm border-2 border-plum bg-panel py-3 text-sm font-semibold text-bone transition-colors hover:border-gore hover:text-gore"
            >
              {formatSlotTime(iso)}
            </button>
          ))}
        </div>
      )}

      <div className="mt-6">
        <BackLink onClick={onBack}>Cambiar fecha</BackLink>
      </div>
    </div>
  );
}
