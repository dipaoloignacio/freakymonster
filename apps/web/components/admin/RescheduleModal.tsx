"use client";

import { useState } from "react";
import { ApiError } from "@/lib/api";
import { rescheduleAdminAppointment, type AdminAppointment } from "@/lib/adminApi";
import { isoToMendozaHHmm } from "@/lib/mendozaTime";
import { DateStep } from "@/components/reservation/DateStep";
import { TimeStep } from "@/components/reservation/TimeStep";
import { ErrorBox } from "@/components/reservation/shared";

type RescheduleStep = "date" | "time";

export function RescheduleModal({
  code,
  appointment,
  onClose,
  onRescheduled,
}: {
  code: string;
  appointment: AdminAppointment;
  onClose: () => void;
  onRescheduled: () => void;
}) {
  const [step, setStep] = useState<RescheduleStep>("date");
  const [date, setDate] = useState<string | null>(null);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function selectDate(d: string) {
    setDate(d);
    setConflictMessage(null);
    setStep("time");
  }

  async function selectSlot(iso: string) {
    if (!date) return;
    setSubmitError(null);
    try {
      await rescheduleAdminAppointment(code, appointment.id, date, isoToMendozaHHmm(iso));
      onRescheduled();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setConflictMessage(err.message || "Ese horario se acaba de ocupar, elegí otro.");
        setRefreshKey((k) => k + 1);
        return;
      }
      setSubmitError("No pudimos reprogramar el turno. Probá de nuevo.");
    }
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 p-6"
      onClick={handleBackdropClick}
    >
      <div className="clip-notch w-full max-w-md border-2 border-plum bg-panel p-6">
        <h3 className="mb-1 font-display text-lg text-bone">Reprogramar turno</h3>
        <p className="mb-5 text-sm text-ashLight">
          {appointment.customerName} — {appointment.service.name} con {appointment.artist.name}
        </p>

        {submitError && (
          <div className="mb-4">
            <ErrorBox message={submitError} />
          </div>
        )}

        {step === "date" && (
          <DateStep
            onSelect={selectDate}
            onBack={onClose}
            title="Elegí una nueva fecha"
            backLabel="Cancelar"
            availabilityFor={{ artistId: appointment.artistId, serviceId: appointment.serviceId }}
          />
        )}

        {step === "time" && date && (
          <TimeStep
            artistId={appointment.artistId}
            serviceId={appointment.serviceId}
            date={date}
            conflictMessage={conflictMessage}
            refreshKey={refreshKey}
            onSelect={selectSlot}
            onBack={() => setStep("date")}
          />
        )}
      </div>
    </div>
  );
}
