"use client";

import { useEffect, useState } from "react";
import {
  ApiError,
  fetchArtistServices,
  fetchArtists,
  type Artist,
  type ArtistServiceOption,
} from "@/lib/api";
import { createAdminAppointment, type AdminGiftCardLookup } from "@/lib/adminApi";
import { GiftCardRedeemField } from "./GiftCardRedeemField";
import { isoToMendozaHHmm } from "@/lib/mendozaTime";
import { DateStep } from "@/components/reservation/DateStep";
import { TimeStep } from "@/components/reservation/TimeStep";
import { CustomerStep, type CustomerFormData } from "@/components/reservation/CustomerStep";
import { BackLink, ErrorBox, PrimaryButton, Spinner, StepEyebrow } from "@/components/reservation/shared";

type Step = "who" | "date" | "time" | "customer";

/**
 * Alta manual de un turno desde el panel. Reusa los mismos pasos que el
 * wizard del cliente (DateStep/TimeStep/CustomerStep) para que la
 * disponibilidad que ve el estudio sea exactamente la misma que ve la web —
 * si se armara un calendario aparte, tarde o temprano mostraría otra cosa.
 *
 * El primer paso sí es propio: el cliente elige tatuador y servicio de a uno
 * con fotos, pero desde el panel conviene resolverlo con dos selects.
 */
export function NewAppointmentModal({
  code,
  onClose,
  onCreated,
}: {
  code: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [step, setStep] = useState<Step>("who");

  const [artists, setArtists] = useState<Artist[] | null>(null);
  const [artistId, setArtistId] = useState("");
  const [services, setServices] = useState<ArtistServiceOption[] | null>(null);
  const [serviceId, setServiceId] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);

  const [date, setDate] = useState<string | null>(null);
  const [slotIso, setSlotIso] = useState<string | null>(null);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Código tipeado y resultado de la verificación. Solo se manda al backend si
  // la card resultó canjeable: mandar una rechazada haría fallar el alta
  // entera, y el admin ya vio el motivo en pantalla.
  const [giftCardCode, setGiftCardCode] = useState("");
  const [giftCard, setGiftCard] = useState<AdminGiftCardLookup | null>(null);

  const artist = artists?.find((a) => a.id === artistId) ?? null;
  const service = services?.find((s) => s.id === serviceId) ?? null;

  // A propósito el endpoint público, no el del panel: solo lista tatuadores
  // activos. Un tatuador desactivado no se puede reservar desde la web y
  // tampoco tiene que poder recibir turnos cargados a mano — desactivarlo
  // significa que no está tomando trabajo, no solo que se lo esconde del
  // sitio. Para volver a cargarle turnos hay que reactivarlo en Tatuadores.
  useEffect(() => {
    let alive = true;
    fetchArtists()
      .then((data) => {
        if (!alive) return;
        setArtists(data);
        setArtistId((current) => current || data[0]?.id || "");
      })
      .catch(() => {
        if (alive) setLoadError("No pudimos cargar los tatuadores.");
      });
    return () => {
      alive = false;
    };
  }, []);

  // Los servicios dependen del tatuador: cambiar de tatuador invalida el que
  // estuviera elegido (puede no ofrecerlo).
  useEffect(() => {
    if (!artistId) return;
    let alive = true;
    setServices(null);
    setServiceId("");
    fetchArtistServices(artistId)
      .then((data) => {
        if (!alive) return;
        setServices(data);
        setServiceId(data[0]?.id ?? "");
      })
      .catch(() => {
        if (alive) setLoadError("No pudimos cargar los servicios de ese tatuador.");
      });
    return () => {
      alive = false;
    };
  }, [artistId]);

  async function handleSubmit(data: CustomerFormData) {
    if (!artistId || !serviceId || !date || !slotIso) return;
    try {
      await createAdminAppointment(code, {
        artistId,
        serviceId,
        date,
        startTime: isoToMendozaHHmm(slotIso),
        ...data,
        ...(giftCard?.redeemable ? { giftCardCode } : {}),
      });
      onCreated();
    } catch (err) {
      // Si el slot se ocupó mientras se cargaban los datos, volvemos al paso
      // de horarios con la grilla refrescada — mismo criterio que el wizard.
      if (err instanceof ApiError && err.status === 409) {
        setConflictMessage("Ese horario se acaba de ocupar, elegí otro.");
        setSlotIso(null);
        setRefreshKey((k) => k + 1);
        setStep("time");
        return;
      }
      throw err;
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
      <div className="custom-scrollbar clip-notch max-h-[90vh] w-full max-w-md overflow-y-auto border-2 border-plum bg-panel p-6">
        <h3 className="mb-1 font-display text-lg text-bone">Nuevo turno</h3>
        <p className="mb-5 text-xs text-ashLight">
          Para reservas tomadas por teléfono o WhatsApp. Queda confirmado directamente.
        </p>

        {loadError && (
          <div className="mb-4">
            <ErrorBox message={loadError} />
          </div>
        )}

        {step === "who" && (
          <div>
            <StepEyebrow label="Tatuador y servicio" />

            {artists === null ? (
              <Spinner label="Cargando…" />
            ) : (
              <div className="flex flex-col gap-4">
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
                  Servicio
                  <select
                    value={serviceId}
                    onChange={(e) => setServiceId(e.target.value)}
                    disabled={services === null || services.length === 0}
                    className="border-2 border-plum bg-ink px-3 py-2 text-sm text-bone disabled:opacity-40"
                  >
                    {services === null && <option>Cargando…</option>}
                    {services?.length === 0 && <option>Este tatuador no tiene servicios</option>}
                    {services?.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.durationMinutes} min)
                      </option>
                    ))}
                  </select>
                </label>

                <div className="mt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="border-2 border-ash px-4 py-2 text-xs font-bold uppercase tracking-wide text-bone"
                  >
                    Cancelar
                  </button>
                  <PrimaryButton onClick={() => setStep("date")} disabled={!artistId || !serviceId}>
                    Siguiente
                  </PrimaryButton>
                </div>
              </div>
            )}
          </div>
        )}

        {step === "date" && artistId && serviceId && (
          <DateStep
            onSelect={(d) => {
              setDate(d);
              setSlotIso(null);
              setConflictMessage(null);
              setStep("time");
            }}
            onBack={() => setStep("who")}
            title="Elegí la fecha"
            backLabel="Cambiar tatuador o servicio"
            availabilityFor={{ artistId, serviceId }}
          />
        )}

        {step === "time" && date && (
          <TimeStep
            artistId={artistId}
            serviceId={serviceId}
            date={date}
            conflictMessage={conflictMessage}
            refreshKey={refreshKey}
            onSelect={(iso) => {
              setSlotIso(iso);
              setStep("customer");
            }}
            onBack={() => setStep("date")}
          />
        )}

        {step === "customer" && artist && service && date && slotIso && (
          <>
            <GiftCardRedeemField
              adminCode={code}
              verified={giftCard}
              onVerified={(result, rawCode) => {
                setGiftCard(result);
                setGiftCardCode(rawCode);
              }}
            />
            <CustomerStep
              artist={artist}
              service={service}
              date={date}
              slotIso={slotIso}
              onSubmit={handleSubmit}
              onBack={() => setStep("time")}
              title="Datos del cliente"
              // El estudio toma reservas por teléfono: el mail puede no estar.
              emailRequired={false}
              // El alta del panel nunca cobra: el turno se crea confirmado y la
              // seña, si el servicio la pide, la coordina el estudio aparte.
              continuesToPayment={false}
            />
          </>
        )}

        {step !== "who" && (
          <div className="mt-6 border-t-2 border-plum pt-4">
            <BackLink onClick={onClose}>Cancelar y cerrar</BackLink>
          </div>
        )}
      </div>
    </div>
  );
}
