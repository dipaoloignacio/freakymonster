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
import Cal, { getCalApi } from "@calcom/embed-react";

const CAL_NAMESPACE = "tattoo-turno";
const CAL_LINK = "ignacio-di-paolo-kizshi/tattoo-turno";
// gore = oklch(0.65 0.24 350) en tailwind.config.ts, convertido a hex (Cal.com no acepta oklch).
const CAL_BRAND_COLOR = "#f034a3";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

type BookingModalContextValue = {
  openModal: () => void;
};

const BookingModalContext = createContext<BookingModalContextValue | null>(null);

export function useBookingModal() {
  const ctx = useContext(BookingModalContext);
  if (!ctx) {
    throw new Error("useBookingModal debe usarse dentro de <BookingModalProvider>");
  }
  return ctx;
}

export function BookingModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  const openModal = useCallback(() => {
    triggerRef.current = document.activeElement as HTMLElement | null;
    setIsLoading(true);
    setIsOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    triggerRef.current?.focus?.();
  }, []);

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

  // Tema de Cal.com (dark + brand color del sitio) y detección de fin de carga del iframe.
  useEffect(() => {
    if (!isOpen) return;
    let active = true;

    (async () => {
      const cal = await getCalApi({ namespace: CAL_NAMESPACE });
      if (!active) return;
      cal("ui", {
        theme: "dark",
        styles: { branding: { brandColor: CAL_BRAND_COLOR } },
        hideEventTypeDetails: false,
        layout: "month_view",
      });
      cal("on", {
        action: "linkReady",
        callback: () => {
          if (active) setIsLoading(false);
        },
      });
    })();

    // Red lenta o bloqueo del iframe: no dejamos el spinner girando para siempre.
    const fallback = window.setTimeout(() => {
      if (active) setIsLoading(false);
    }, 10000);

    return () => {
      active = false;
      window.clearTimeout(fallback);
    };
  }, [isOpen]);

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) {
      closeModal();
    }
  }

  return (
    <BookingModalContext.Provider value={{ openModal }}>
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
            {/* El header vive fuera del contenedor con scroll (hermano flex fijo),
                así queda siempre visible sin importar cuánto se scrollee el
                calendario/horarios de abajo, y el panel nunca crece más allá del viewport. */}
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

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain touch-pan-y">
              <div className="relative min-h-[420px]">
                {isLoading && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-panel">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-plum border-t-gore" />
                    <p className="text-xs font-semibold uppercase tracking-[2px] text-ash">
                      Cargando disponibilidad…
                    </p>
                  </div>
                )}
                <Cal
                  namespace={CAL_NAMESPACE}
                  calLink={CAL_LINK}
                  style={{ width: "100%", minHeight: "420px" }}
                  config={{ theme: "dark", layout: "month_view" }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </BookingModalContext.Provider>
  );
}