"use client";

import { useEffect, useState } from "react";
import { fetchArtistServices, type Artist, type ArtistServiceOption } from "@/lib/api";
import { BackLink, EmptyState, ErrorBox, Spinner, StepEyebrow } from "./shared";

export function ServiceStep({
  artist,
  onSelect,
  onBack,
}: {
  artist: Artist;
  onSelect: (service: ArtistServiceOption) => void;
  onBack: () => void;
}) {
  const [services, setServices] = useState<ArtistServiceOption[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetchArtistServices(artist.id)
      .then((data) => {
        if (active) setServices(data);
      })
      .catch(() => {
        if (active) setError("No pudimos cargar los servicios de este tatuador.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [artist.id, attempt]);

  return (
    <div>
      <StepEyebrow step={2} total={5} label={`¿Qué te vas a hacer con ${artist.name}?`} />

      {loading && <Spinner label="Cargando servicios…" />}
      {!loading && error && <ErrorBox message={error} onRetry={() => setAttempt((n) => n + 1)} />}
      {!loading && !error && services && services.length === 0 && (
        <EmptyState message="Este tatuador todavía no tiene servicios cargados." />
      )}
      {!loading && !error && services && services.length > 0 && (
        <div className="flex flex-col gap-3">
          {services.map((service) => (
            <button
              key={service.id}
              type="button"
              onClick={() => onSelect(service)}
              className="clip-notch-sm flex items-center justify-between border-2 border-plum bg-panel px-5 py-4 text-left transition-colors hover:border-gore"
            >
              <div>
                <div className="font-display text-base text-bone">{service.name}</div>
                <div className="text-xs text-ashLight">{service.durationMinutes} minutos</div>
              </div>
              {service.requiresDeposit && (
                <div className="clip-notch-sm border border-toxic px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-toxic">
                  Requiere seña
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      <div className="mt-6">
        <BackLink onClick={onBack}>Cambiar tatuador</BackLink>
      </div>
    </div>
  );
}
