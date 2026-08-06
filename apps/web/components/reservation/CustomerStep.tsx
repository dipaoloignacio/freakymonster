"use client";

import { useState, type FormEvent } from "react";
import type { CountryCode } from "libphonenumber-js/max";
import type { Artist, ArtistServiceOption } from "@/lib/api";
import { ApiError } from "@/lib/api";
import { formatDateLong, formatSlotTime } from "@/lib/mendozaTime";
import { DEFAULT_COUNTRY, phoneToE164 } from "@/lib/phone";
import { BackLink, ErrorBox, PrimaryButton, StepEyebrow } from "./shared";
import { PhoneField, phoneValidationError } from "./PhoneField";

// Mismo criterio que el @IsEmail del backend: algo@algo.algo. No se busca
// validar el estándar completo —eso solo lo confirma mandar un mail— sino
// atajar el typo obvio antes de crear el turno.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function formatMoney(amount: string): string {
  const value = Number(amount);
  if (Number.isNaN(value)) return amount;
  return value.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
}

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
  emailRequired = true,
  continuesToPayment = true,
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
  /**
   * El wizard público exige el mail: es por donde sale la confirmación y el
   * único canal por escrito que queda con ese cliente. El alta del panel lo
   * deja opcional, porque el estudio toma reservas por teléfono donde muchas
   * veces no se da — y el backend acompaña esa diferencia con dos DTOs
   * distintos (CreateAppointmentDto vs CreateAdminAppointmentDto).
   */
  emailRequired?: boolean;
  /**
   * Si después de confirmar viene el checkout de Mercado Pago. Es true en el
   * wizard público y false en el alta del panel, donde el turno se crea
   * directo sin cobrar nada — aun cuando el servicio tenga seña, que ahí la
   * coordina el estudio por su cuenta.
   */
  continuesToPayment?: boolean;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneCountry, setPhoneCountry] = useState<CountryCode>(DEFAULT_COUNTRY);
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // El botón tiene que anticipar lo que pasa al tocarlo: en el wizard público,
  // un servicio con seña sale a Mercado Pago en vez de terminar acá. Depende
  // de las dos condiciones, no solo de la seña: el mismo formulario lo usa el
  // panel, donde nunca hay checkout.
  const goesToPayment = continuesToPayment && service.requiresDeposit;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (!name.trim()) {
      setFieldError("Falta tu nombre completo.");
      return;
    }

    // El número viaja en E.164; el backend lo vuelve a normalizar y validar
    // por su cuenta (ver CreateAppointmentDto), esto es para no dejar que se
    // mande siquiera un turno con un teléfono que ya sabemos que no sirve.
    const e164Phone = phoneToE164(phone, phoneCountry);
    if (!e164Phone) {
      setFieldError(
        phone.trim()
          ? "Ese número no parece válido para el país elegido."
          : "Falta tu teléfono."
      );
      return;
    }

    // Cuando es obligatorio, se valida antes de mandar para no crear una
    // reserva que ya sabemos que el backend va a rechazar. Cuando es opcional
    // igual se valida el formato si escribieron algo: un mail con un typo no
    // sirve para nada y es mejor avisarlo acá.
    const trimmedEmail = email.trim();
    if (emailRequired && !trimmedEmail) {
      setFieldError("Falta tu email.");
      return;
    }
    if (trimmedEmail && !EMAIL_PATTERN.test(trimmedEmail)) {
      setFieldError("Ese email no parece válido.");
      return;
    }

    setFieldError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        customerName: name.trim(),
        customerPhone: e164Phone,
        customerEmail: trimmedEmail || undefined,
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
          <span className="text-xs font-semibold uppercase tracking-wide text-ash">
            Nombre completo *
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            required
            className="clip-notch-sm border-2 border-plum bg-ink px-4 py-2.5 text-sm text-bone outline-none focus:border-gore"
          />
        </label>

        <PhoneField
          value={phone}
          onChange={setPhone}
          country={phoneCountry}
          onCountryChange={setPhoneCountry}
          error={phoneValidationError(phone, phoneCountry)}
        />

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-ash">
            {emailRequired ? "Email *" : "Email (opcional)"}
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required={emailRequired}
            className="clip-notch-sm border-2 border-plum bg-ink px-4 py-2.5 text-sm text-bone outline-none focus:border-gore"
          />
          {emailRequired && (
            <span className="text-xs text-ashLight">Ahí te mandamos la confirmación del turno.</span>
          )}
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
          {submitting ? "Reservando…" : goesToPayment ? "Continuar al pago" : "Confirmar reserva"}
        </PrimaryButton>

        {goesToPayment && (
          <p className="-mt-1 text-center text-xs text-ashLight">
            Te llevamos a Mercado Pago para pagar la seña
            {service.depositAmount ? ` de ${formatMoney(service.depositAmount)}` : ""}. El turno queda
            reservado mientras tanto.
          </p>
        )}
      </form>

      <div className="mt-6">
        <BackLink onClick={onBack}>Cambiar horario</BackLink>
      </div>
    </div>
  );
}
