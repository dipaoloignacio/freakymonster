"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ApiError,
  createAppointment,
  createPaymentPreference,
  fetchArtists,
  type Artist,
  type ArtistServiceOption,
} from "@/lib/api";
import { isoToMendozaHHmm } from "@/lib/mendozaTime";
import { whatsappPaymentIssueUrl } from "@/data/content";
import { ArtistStep } from "./ArtistStep";
import { ServiceStep } from "./ServiceStep";
import { DateStep } from "./DateStep";
import { TimeStep } from "./TimeStep";
import { CustomerStep, type CustomerFormData } from "./CustomerStep";
import { SuccessStep } from "./SuccessStep";
import { ErrorBox, PrimaryButton, Spinner } from "./shared";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

type WizardStep =
  | "artist"
  | "service"
  | "date"
  | "time"
  | "customer"
  | "success"
  | "redirecting"
  | "paymentError";

type ReservationModalContextValue = {
  openModal: () => void;
};

const ReservationModalContext = createContext<ReservationModalContextValue | null>(null);

export function useReservationModal() {
  const ctx = useContext(ReservationModalContext);
  if (!ctx) {
    throw new Error("useReservationModal debe usarse dentro de <ReservationModalProvider>");
  }
  return ctx;
}

export function ReservationModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  const [step, setStep] = useState<WizardStep>("artist");

  const [artists, setArtists] = useState<Artist[] | null>(null);
  const [artistsLoading, setArtistsLoading] = useState(true);
  const [artistsError, setArtistsError] = useState<string | null>(null);
  const [artistsAttempt, setArtistsAttempt] = useState(0);

  const [artist, setArtist] = useState<Artist | null>(null);
  const [service, setService] = useState<ArtistServiceOption | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [slotIso, setSlotIso] = useState<string | null>(null);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const [availabilityRefreshKey, setAvailabilityRefreshKey] = useState(0);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    triggerRef.current?.focus?.();
  }, []);

  const openModal = useCallback(() => {
    triggerRef.current = document.activeElement as HTMLElement | null;
    setStep("artist");
    setArtist(null);
    setService(null);
    setDate(null);
    setSlotIso(null);
    setConflictMessage(null);
    setIsOpen(true);
  }, []);

  // Trae la lista de tatuadores cada vez que se abre el modal.
  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setArtistsLoading(true);
    setArtistsError(null);
    fetchArtists()
      .then((data) => {
        if (active) setArtists(data);
      })
      .catch(() => {
        if (active) setArtistsError("No pudimos cargar los tatuadores.");
      })
      .finally(() => {
        if (active) setArtistsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isOpen, artistsAttempt]);

  // Bloquea el scroll del body mientras el modal está abierto.
  useEffect(() => {
    if (!isOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [isOpen]);

  // Foco inicial, trampa de foco y cierre con Escape.
  useEffect(() => {
    if (!isOpen) return;
    closeButtonRef.current?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        closeModal();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;

      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter((el) => el.offsetParent !== null);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeModal]);

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) {
      closeModal();
    }
  }

  function selectArtist(a: Artist) {
    setArtist(a);
    setService(null);
    setDate(null);
    setSlotIso(null);
    setStep("service");
  }

  function selectService(s: ArtistServiceOption) {
    setService(s);
    setDate(null);
    setSlotIso(null);
    setStep("date");
  }

  function selectDate(d: string) {
    setDate(d);
    setSlotIso(null);
    setConflictMessage(null);
    setStep("time");
  }

  function selectSlot(iso: string) {
    setSlotIso(iso);
    setStep("customer");
  }

  function goBack() {
    if (step === "service") setStep("artist");
    else if (step === "date") setStep("service");
    else if (step === "time") setStep("date");
    else if (step === "customer") setStep("time");
  }

  // Se llama desde CustomerStep. Si resuelve, CustomerStep no hace nada más
  // (la navegación de paso ya la hicimos acá). Si rechaza, CustomerStep
  // muestra el error inline y el usuario se queda en el formulario — por eso
  // el 409 NO se re-lanza (ya lo manejamos acá con la vuelta al paso 4), pero
  // cualquier otro error sí.
  async function handleSubmitCustomer(data: CustomerFormData) {
    if (!artist || !service || !date || !slotIso) return;

    let appointmentId: string;
    try {
      const appointment = await createAppointment({
        artistId: artist.id,
        serviceId: service.id,
        date,
        startTime: isoToMendozaHHmm(slotIso),
        ...data,
      });
      appointmentId = appointment.id;
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setConflictMessage("Ese horario se acaba de ocupar, elegí otro.");
        setSlotIso(null);
        setAvailabilityRefreshKey((k) => k + 1);
        setStep("time");
        return;
      }
      throw err;
    }

    // El turno ya está creado (PENDING) en este punto, pase lo que pase de
    // acá en adelante — un error de Mercado Pago no lo pierde, solo impide
    // el redirect automático al pago.
    if (!service.requiresDeposit) {
      setStep("success");
      return;
    }

    setStep("redirecting");
    try {
      const { initPoint } = await createPaymentPreference(appointmentId);
      window.location.href = initPoint;
    } catch {
      setStep("paymentError");
    }
  }

  return (
    <ReservationModalContext.Provider value={{ openModal }}>
      {children}
      {isOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm sm:p-6"
          onClick={handleBackdropClick}
        >
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Reservar turno"
            className="clip-notch flex h-dvh w-full flex-col overflow-hidden border-2 border-plum bg-panel shadow-[8px_8px_0_rgba(0,0,0,0.5)] sm:h-auto sm:max-h-[90vh] sm:w-[640px]"
          >
            <div className="flex flex-shrink-0 items-center justify-between border-b-2 border-plum bg-panel px-5 py-4">
              <h2 className="font-heading text-lg uppercase tracking-wide text-bone">
                Reservar turno
              </h2>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={closeModal}
                aria-label="Cerrar"
                className="clip-notch-sm flex h-9 w-9 items-center justify-center border-2 border-ash text-ash transition-colors hover:border-gore hover:text-gore"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain touch-pan-y p-5">
              {step === "artist" && (
                <ArtistStep
                  artists={artists}
                  loading={artistsLoading}
                  error={artistsError}
                  onRetry={() => setArtistsAttempt((n) => n + 1)}
                  onSelect={selectArtist}
                />
              )}
              {step === "service" && artist && (
                <ServiceStep artist={artist} onSelect={selectService} onBack={goBack} />
              )}
              {step === "date" && artist && service && (
                <DateStep
                  onSelect={selectDate}
                  onBack={goBack}
                  stepInfo={{ step: 3, total: 5 }}
                  availabilityFor={{ artistId: artist.id, serviceId: service.id }}
                />
              )}
              {step === "time" && artist && service && date && (
                <TimeStep
                  artistId={artist.id}
                  serviceId={service.id}
                  date={date}
                  conflictMessage={conflictMessage}
                  refreshKey={availabilityRefreshKey}
                  onSelect={selectSlot}
                  onBack={goBack}
                  stepInfo={{ step: 4, total: 5 }}
                />
              )}
              {step === "customer" && artist && service && date && slotIso && (
                <CustomerStep
                  artist={artist}
                  service={service}
                  date={date}
                  slotIso={slotIso}
                  onSubmit={handleSubmitCustomer}
                  onBack={goBack}
                  stepInfo={{ step: 5, total: 5 }}
                />
              )}
              {step === "success" && artist && service && date && slotIso && (
                <SuccessStep
                  artist={artist}
                  service={service}
                  date={date}
                  slotIso={slotIso}
                  onClose={closeModal}
                />
              )}
              {step === "redirecting" && <Spinner label="Redirigiendo a Mercado Pago…" />}
              {step === "paymentError" && (
                <div>
                  <ErrorBox message="Tu reserva se creó, pero no pudimos iniciar el pago de la seña. Contactanos por WhatsApp para coordinarlo." />
                  <div className="mt-5 flex justify-center gap-3">
                    <a
                      href={whatsappPaymentIssueUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="clip-notch-sm bg-gore px-6 py-3 text-sm font-bold uppercase tracking-wide text-ink no-underline"
                    >
                      Escribinos por WhatsApp
                    </a>
                    <PrimaryButton onClick={closeModal}>Cerrar</PrimaryButton>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </ReservationModalContext.Provider>
  );
}
