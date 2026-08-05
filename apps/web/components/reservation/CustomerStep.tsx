"use client";

import { useState, type FormEvent } from "react";
import type { Artist, ArtistServiceOption } from "@/lib/api";
import { ApiError } from "@/lib/api";
import { formatDateLong, formatSlotTime } from "@/lib/mendozaTime";
import { BackLink, ErrorBox, PrimaryButton, StepEyebrow } from "./shared";

const PHONE_PATTERN = /^[+\d][\d\s-]{6,19}$/;

export interface CustomerFormData {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  notes?: string;
}

export function CustomerStep({
  artist,
  service,
  date,
  slotIso,
  onSubmit,
  onBack,
  stepInfo,
  title = "Tus datos",
}: {
  artist: Artist;
  service: ArtistServiceOption;
  date: string;
  slotIso: string;
  onSubmit: (data: CustomerFormData) => Promise<void>;
  onBack: () => void;
  /** Igual que en DateStep/TimeStep: sin esto no se numera el paso, para
   * poder reusarlo fuera del wizard (ver el alta manual del panel). */
  stepInfo?: { step: number; total: number };
  title?: string;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (!name.trim()) {
      setFieldError("Falta tu nombre.");
      return;
    }
    if (!PHONE_PATTERN.test(phone.trim())) {
      setFieldError("El teléfono no tiene un formato válido.");
      return;
    }
    setFieldError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        customerName: name.trim(),
        customerPhone: phone.trim(),
        customerEmail: email.trim() || undefined,
        notes: notes.trim() || undefined,
      });
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "No pudimos crear la reserva. Probá de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <StepEyebrow step={stepInfo?.step} total={stepInfo?.total} label={title} />

      <div className="clip-notch-sm mb-5 border-2 border-plum bg-panel p-4 text-sm text-ashLight">
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

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-ash">Nombre *</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            required
            className="clip-notch-sm border-2 border-plum bg-ink px-4 py-2.5 text-sm text-bone outline-none focus:border-gore"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-ash">Teléfono *</span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+54 9 261 555-0000"
            required
            className="clip-notch-sm border-2 border-plum bg-ink px-4 py-2.5 text-sm text-bone outline-none focus:border-gore"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-ash">Email (opcional)</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="clip-notch-sm border-2 border-plum bg-ink px-4 py-2.5 text-sm text-bone outline-none focus:border-gore"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-ash">Notas (opcional)</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Contanos algo sobre la idea, tamaño, zona del cuerpo…"
            className="clip-notch-sm border-2 border-plum bg-ink px-4 py-2.5 text-sm text-bone outline-none focus:border-gore"
          />
        </label>

        {fieldError && <p className="text-sm font-semibold text-gore">{fieldError}</p>}
        {submitError && <ErrorBox message={submitError} />}

        <PrimaryButton type="submit" disabled={submitting}>
          {submitting ? "Reservando…" : "Confirmar reserva"}
        </PrimaryButton>
      </form>

      <div className="mt-6">
        <BackLink onClick={onBack}>Cambiar horario</BackLink>
      </div>
    </div>
  );
}
