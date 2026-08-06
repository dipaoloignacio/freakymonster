"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import {
  createAdminGiftCardTier,
  fetchAdminGiftCardTiers,
  updateAdminGiftCardTier,
  type AdminGiftCardTier,
} from "@/lib/adminApi";
import { ErrorBox, Spinner } from "@/components/reservation/shared";

type FormTarget = "new" | AdminGiftCardTier;

function formatMoney(amount: string): string {
  const value = Number(amount);
  if (Number.isNaN(value)) return amount;
  return value.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
}

/**
 * Gestión de los montos de gift card que ofrece el estudio.
 *
 * Por ahora la pestaña es solo eso: las gift cards emitidas (compra y canje)
 * son fases siguientes y van a sumar sus propias secciones acá.
 */
export function GiftCardsTab({ code }: { code: string }) {
  const [tiers, setTiers] = useState<AdminGiftCardTier[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formTarget, setFormTarget] = useState<FormTarget | null>(null);

  async function loadTiers() {
    setLoading(true);
    setError(null);
    try {
      setTiers(await fetchAdminGiftCardTiers(code));
    } catch {
      setError("No pudimos cargar los montos de gift card.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTiers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-md text-sm text-ashLight">
          Los montos que el estudio ofrece para regalar. Los inactivos dejan de ofrecerse, pero las gift cards
          ya vendidas con ese monto siguen valiendo lo que se pagó por ellas.
        </p>
        <button
          type="button"
          onClick={() => setFormTarget("new")}
          className="clip-notch-sm shrink-0 bg-gore px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-ink"
        >
          + Nuevo monto
        </button>
      </div>

      {loading && <Spinner label="Cargando montos…" />}
      {!loading && error && <ErrorBox message={error} onRetry={loadTiers} />}

      {!loading && !error && tiers && tiers.length === 0 && (
        <p className="border-2 border-plum bg-panel p-5 text-center text-sm text-ashLight">
          Todavía no hay montos cargados.
        </p>
      )}

      {!loading && !error && tiers && tiers.length > 0 && (
        <div className="overflow-x-auto border-2 border-plum">
          <table className="w-full min-w-[520px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b-2 border-plum bg-panel text-xs font-semibold uppercase tracking-wide text-ash">
                <th className="px-3 py-2.5">Monto</th>
                <th className="px-3 py-2.5">Nombre</th>
                <th className="px-3 py-2.5">Estado</th>
                <th className="px-3 py-2.5">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {tiers.map((tier) => (
                <tr
                  key={tier.id}
                  className={`border-b border-plum/40 ${tier.active ? "text-bone" : "text-ash opacity-60"}`}
                >
                  <td className="px-3 py-2.5 font-semibold whitespace-nowrap">{formatMoney(tier.amount)}</td>
                  <td className="px-3 py-2.5 text-xs text-ashLight">
                    {tier.label ?? <span className="text-ash">Sin nombre</span>}
                  </td>
                  <td className="px-3 py-2.5">
                    {tier.active ? (
                      <span className="border border-toxic px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-toxic">
                        Activo
                      </span>
                    ) : (
                      <span className="border border-ash px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-ash">
                        Inactivo
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      type="button"
                      onClick={() => setFormTarget(tier)}
                      className="border border-toxic px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-toxic transition-colors hover:bg-toxic hover:text-ink"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {formTarget && (
        <GiftCardTierForm
          code={code}
          target={formTarget}
          onClose={() => setFormTarget(null)}
          onSaved={() => {
            setFormTarget(null);
            loadTiers();
          }}
        />
      )}
    </div>
  );
}

function GiftCardTierForm({
  code,
  target,
  onClose,
  onSaved,
}: {
  code: string;
  target: FormTarget;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = target === "new";
  const [amount, setAmount] = useState(isNew ? "" : String(Number(target.amount)));
  const [label, setLabel] = useState(isNew ? "" : (target.label ?? ""));
  const [active, setActive] = useState(isNew ? true : target.active);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsedAmount = Number(amount);
    if (!amount.trim() || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("El monto tiene que ser mayor a cero.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      // El label vacío se manda como null, no como "": el backend distingue
      // "sin nombre" de una cadena vacía, y en la tabla se lee distinto.
      const trimmedLabel = label.trim() || null;
      if (isNew) {
        await createAdminGiftCardTier(code, { amount: parsedAmount, label: trimmedLabel });
      } else {
        await updateAdminGiftCardTier(code, target.id, {
          amount: parsedAmount,
          label: trimmedLabel,
          active,
        });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos guardar el monto. Probá de nuevo.");
    } finally {
      setSubmitting(false);
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
      <form
        onSubmit={handleSubmit}
        className="clip-notch max-h-[90vh] w-full max-w-md overflow-y-auto border-2 border-plum bg-panel p-6"
      >
        <h3 className="mb-5 font-display text-lg text-bone">
          {isNew ? "Nuevo monto de gift card" : `Editar ${formatMoney(target.amount)}`}
        </h3>

        {error && (
          <div className="mb-4">
            <ErrorBox message={error} />
          </div>
        )}

        <div className="mb-5 flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-ash">
            Monto (ARS)
            {/* step="any" por el mismo motivo que en ServiceForm: con un step
                numérico el navegador rechaza montos redondos por no caer en la
                grilla min + n*step, y el backend acepta 2 decimales. */}
            <input
              type="number"
              min={1}
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="border-2 border-plum bg-ink px-3 py-2 text-sm text-bone"
              placeholder="Ej: 60000"
              required
            />
          </label>

          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-ash">
            Nombre (opcional)
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={60}
              className="border-2 border-plum bg-ink px-3 py-2 text-sm text-bone"
              placeholder="Ej: Regalo chico"
            />
          </label>

          {!isNew && (
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ash">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="h-4 w-4 accent-gore"
              />
              Activo (se ofrece para comprar)
            </label>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="border-2 border-ash px-4 py-2 text-xs font-bold uppercase tracking-wide text-bone"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="clip-notch-sm bg-gore px-4 py-2 text-xs font-bold uppercase tracking-wide text-ink disabled:opacity-40"
          >
            {submitting ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}
