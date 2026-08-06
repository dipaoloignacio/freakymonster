/**
 * El círculo que gira, sin texto ni layout propio. Está separado para poder
 * meterlo dentro de un botón sin arrastrar los márgenes del Spinner con label.
 *
 * El color y el tamaño los pone quien lo usa, porque no hay uno que sirva en
 * los dos contextos: suelto va con los colores de la marca (plum/gore), pero
 * adentro de un botón de fondo gore ese mismo gore sería invisible — ahí se
 * usa BUTTON_SPINNER, que hereda el color del texto del botón.
 */
export function SpinnerCircle({ className }: { className: string }) {
  return <span aria-hidden="true" className={`inline-block shrink-0 animate-spin rounded-full ${className}`} />;
}

/**
 * El círculo para adentro de un botón: anillo transparente y solo el arco
 * superior en `currentColor`, así se ve tanto sobre el fondo gore de los
 * botones primarios como sobre el fondo oscuro de los secundarios, sin tener
 * que pasarle colores en cada lugar.
 */
export const BUTTON_SPINNER = "h-4 w-4 border-2 border-transparent border-t-current";

/**
 * Estado de carga con texto.
 *
 * `md` (por defecto) es el de pantalla completa: ocupa su bloque y se centra,
 * para cuando la vista entera está esperando datos.
 *
 * `sm` es para adentro de un formulario o una tarjeta, donde el de arriba
 * ocuparía media pantalla con su py-16: va en línea, chico, sin robarse el
 * layout de lo que lo rodea.
 */
export function Spinner({ label, size = "md" }: { label: string; size?: "sm" | "md" }) {
  if (size === "sm") {
    return (
      <div className="flex items-center gap-2">
        <SpinnerCircle className="h-4 w-4 border-2 border-plum border-t-gore" />
        <span className="text-sm normal-case tracking-normal text-ashLight">{label}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16">
      <SpinnerCircle className="h-10 w-10 border-4 border-plum border-t-gore" />
      <p className="text-xs font-semibold uppercase tracking-[2px] text-ash">{label}</p>
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="clip-notch-sm border-2 border-gore bg-gore/10 p-5 text-center">
      <p className="text-sm font-semibold text-bone">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="clip-notch-sm mt-4 border-2 border-gore px-5 py-2 text-xs font-bold uppercase tracking-wide text-gore transition-colors hover:bg-gore hover:text-ink"
        >
          Reintentar
        </button>
      )}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="clip-notch-sm border-2 border-plum bg-panel p-5 text-center">
      <p className="text-sm text-ashLight">{message}</p>
    </div>
  );
}

// step/total son opcionales para poder reusar DateStep/TimeStep fuera del
// wizard de reserva (ver panel de admin, RescheduleModal) sin mostrar un
// "Paso X de Y" que no tiene sentido ahí.
export function StepEyebrow({ step, total, label }: { step?: number; total?: number; label: string }) {
  return (
    <div className="mb-5">
      {step !== undefined && total !== undefined && (
        <div className="mb-1.5 text-xs font-semibold uppercase tracking-[3px] text-toxic">
          Paso {step} de {total}
        </div>
      )}
      <h3 className="font-display text-xl text-bone">{label}</h3>
    </div>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="clip-notch-sm inline-flex items-center justify-center gap-2 bg-gore px-6 py-3 text-sm font-bold uppercase tracking-wide text-ink transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

export function BackLink({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-xs font-semibold uppercase tracking-[1.5px] text-ash transition-colors hover:text-toxic"
    >
      ← {children}
    </button>
  );
}
