"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchMonthAvailability } from "@/lib/api";
import { BackLink, StepEyebrow } from "./shared";

const WEEKDAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTH_LABELS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const MAX_MONTHS_AHEAD = 3;

function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildMonthGrid(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1);
  const startWeekday = (firstDay.getDay() + 6) % 7; // Lun=0 ... Dom=6
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = new Array(startWeekday).fill(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(new Date(year, month, day));
  }
  return cells;
}

export function DateStep({
  onSelect,
  onBack,
  title = "Elegí una fecha",
  backLabel = "Cambiar servicio",
  stepInfo,
  availabilityFor,
}: {
  onSelect: (date: string) => void;
  /** Sin onBack no se muestra el link de "volver" (ver BlockDayTab, que es un
   * tab suelto sin paso anterior al que volver). */
  onBack?: () => void;
  /** Default pensado para el wizard de reserva. El panel de admin
   * (RescheduleModal) pasa un título/label propios, sin numerar pasos. */
  title?: string;
  backLabel?: string;
  stepInfo?: { step: number; total: number };
  /**
   * Con esto el calendario consulta la disponibilidad del mes visible y
   * deshabilita los días sin lugar. Va junto (los dos ids o ninguno) porque
   * la disponibilidad solo existe para un par tatuador+servicio concreto.
   *
   * Se omite en BlockDayTab: ahí se elige qué día bloquear, y justamente
   * interesa poder elegir días que hoy están libres.
   */
  availabilityFor?: { artistId: string; serviceId: string };
}) {
  const today = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }, []);

  const [viewDate, setViewDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));

  const maxViewDate = useMemo(
    () => new Date(today.getFullYear(), today.getMonth() + MAX_MONTHS_AHEAD, 1),
    [today]
  );

  const cells = useMemo(
    () => buildMonthGrid(viewDate.getFullYear(), viewDate.getMonth()),
    [viewDate]
  );

  const canGoBack = viewDate.getFullYear() > today.getFullYear() || viewDate.getMonth() > today.getMonth();
  const canGoForward = viewDate < maxViewDate;

  const visibleMonth = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, "0")}`;

  // null = todavía no sabemos (cargando, sin availabilityFor, o falló la
  // consulta). En ese caso NO se deshabilita nada: es preferible dejar
  // clickear un día que quizás esté lleno (el paso siguiente lo dice) antes
  // que bloquear un calendario entero por un error de red.
  const [availableDates, setAvailableDates] = useState<Set<string> | null>(null);
  const [loadingMonth, setLoadingMonth] = useState(false);

  const artistId = availabilityFor?.artistId;
  const serviceId = availabilityFor?.serviceId;

  useEffect(() => {
    if (!artistId || !serviceId) return;
    let alive = true;
    setLoadingMonth(true);
    setAvailableDates(null);
    fetchMonthAvailability(artistId, serviceId, visibleMonth)
      .then((dates) => {
        if (alive) setAvailableDates(new Set(dates));
      })
      .catch(() => {
        if (alive) setAvailableDates(null);
      })
      .finally(() => {
        if (alive) setLoadingMonth(false);
      });
    return () => {
      alive = false;
    };
  }, [artistId, serviceId, visibleMonth]);

  return (
    <div>
      <StepEyebrow step={stepInfo?.step} total={stepInfo?.total} label={title} />

      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          disabled={!canGoBack}
          onClick={() => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
          className="clip-notch-sm border-2 border-plum px-3 py-2 text-ash transition-colors hover:border-gore hover:text-gore disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Mes anterior"
        >
          ←
        </button>
        <div className="font-display text-base text-bone">
          {MONTH_LABELS[viewDate.getMonth()]} {viewDate.getFullYear()}
        </div>
        <button
          type="button"
          disabled={!canGoForward}
          onClick={() => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
          className="clip-notch-sm border-2 border-plum px-3 py-2 text-ash transition-colors hover:border-gore hover:text-gore disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Mes siguiente"
        >
          →
        </button>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1.5">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="py-1 text-center text-[10px] font-semibold uppercase tracking-wide text-ash">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((date, idx) => {
          if (!date) return <div key={`empty-${idx}`} />;
          const isPast = date < today;
          const dateStr = toDateString(date);
          // Solo se marca como completo si ya tenemos la respuesta del mes.
          const isFull = !isPast && availableDates !== null && !availableDates.has(dateStr);
          // Tres estados con peso visual distinto a propósito: lo que hay que
          // poder escanear de un golpe es "cuáles puedo tocar". Los pasados y
          // los completos se hunden; el tachado distingue "ya pasó" (no me
          // importa) de "está lleno" (sí me importa, es información).
          const stateClasses = isPast
            ? "border-plum/30 text-ash/25"
            : isFull
              ? "border-plum/30 text-ash/30 line-through"
              : "border-plum text-bone hover:border-gore hover:text-gore";
          return (
            <button
              key={dateStr}
              type="button"
              disabled={isPast || isFull}
              onClick={() => onSelect(dateStr)}
              title={isFull ? "Sin turnos disponibles" : undefined}
              className={`clip-notch-sm aspect-square border-2 text-sm transition-colors disabled:cursor-not-allowed ${stateClasses}`}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

      {availabilityFor && (
        <p className="mt-3 text-xs text-ash">
          {loadingMonth
            ? "Buscando días disponibles…"
            : availableDates === null
              ? "No pudimos verificar qué días tienen lugar; probá eligiendo una fecha."
              : availableDates.size === 0
                ? "Este mes no tiene días disponibles. Probá con el mes siguiente."
                : "Los días tachados no tienen turnos disponibles."}
        </p>
      )}

      {onBack && (
        <div className="mt-6">
          <BackLink onClick={onBack}>{backLabel}</BackLink>
        </div>
      )}
    </div>
  );
}
