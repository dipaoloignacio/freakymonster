"use client";

import { useMemo, useState } from "react";
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
}: {
  onSelect: (date: string) => void;
  onBack: () => void;
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

  return (
    <div>
      <StepEyebrow step={3} total={5} label="Elegí una fecha" />

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
          return (
            <button
              key={dateStr}
              type="button"
              disabled={isPast}
              onClick={() => onSelect(dateStr)}
              className="clip-notch-sm aspect-square border-2 border-plum text-sm text-ashLight transition-colors hover:border-gore hover:text-bone disabled:cursor-not-allowed disabled:border-plum/40 disabled:text-ash/40"
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        <BackLink onClick={onBack}>Cambiar servicio</BackLink>
      </div>
    </div>
  );
}
