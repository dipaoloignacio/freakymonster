"use client";

import { useState } from "react";
import { ApiError } from "@/lib/api";
import { fetchAdminGiftCardByCode, type AdminGiftCardLookup } from "@/lib/adminApi";

function formatMoney(amount: string): string {
  const value = Number(amount);
  if (Number.isNaN(value)) return amount;
  return value.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
}

/**
 * Campo opcional de gift card con verificación explícita.
 *
 * El canje NO se intenta a ciegas al confirmar el turno: el admin escribe el
 * código, aprieta Verificar y ve qué pasó ANTES de cargar los datos del
 * cliente. Con el cliente enfrente, enterarse de que la card estaba vencida
 * recién al final —después de tipear nombre, teléfono y mail— es el peor
 * momento posible.
 *
 * El código verificado se comunica hacia arriba solo si es canjeable; si no,
 * el turno se crea sin gift card (o el admin corrige el código).
 */
export function GiftCardRedeemField({
  adminCode,
  verified,
  onVerified,
}: {
  /** La clave del panel (el "code" de la URL), no el código de la gift card. */
  adminCode: string;
  verified: AdminGiftCardLookup | null;
  onVerified: (result: AdminGiftCardLookup | null, rawCode: string) => void;
}) {
  const [input, setInput] = useState("");
  const [checking, setChecking] = useState(false);
  const [notFound, setNotFound] = useState<string | null>(null);

  async function handleVerify() {
    const raw = input.trim();
    if (!raw) return;

    setChecking(true);
    setNotFound(null);
    onVerified(null, raw);
    try {
      const result = await fetchAdminGiftCardByCode(raw, adminCode);
      onVerified(result, raw);
    } catch (err) {
      // El 404 es el caso corriente (typo o código de otro estudio), así que
      // se muestra como un resultado más y no como un error del sistema.
      setNotFound(
        err instanceof ApiError && err.status === 404
          ? err.message
          : "No pudimos verificar el código. Probá de nuevo."
      );
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="clip-notch-sm mb-5 border-2 border-plum bg-ink p-4">
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-ash">
        Gift card (opcional)
      </div>
      <p className="mb-3 text-xs text-ashLight">
        Si el cliente paga con una gift card, verificá el código antes de confirmar el turno.
      </p>

      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            // Cambiar el código invalida la verificación anterior: si no, se
            // podría verificar una card y canjear otra.
            setNotFound(null);
            onVerified(null, e.target.value);
          }}
          placeholder="FM-XXXX-XXXX"
          className="min-w-[160px] flex-1 border-2 border-plum bg-ink px-3 py-2 font-mono text-sm uppercase text-bone"
        />
        <button
          type="button"
          onClick={handleVerify}
          disabled={checking || !input.trim()}
          className="border-2 border-toxic px-4 py-2 text-xs font-bold uppercase tracking-wide text-toxic transition-colors hover:bg-toxic hover:text-ink disabled:opacity-40"
        >
          {checking ? "Verificando…" : "Verificar"}
        </button>
      </div>

      {notFound && (
        <p className="mt-3 border-2 border-gore bg-gore/10 p-3 text-sm text-bone">{notFound}</p>
      )}

      {verified && verified.redeemable && (
        <div className="mt-3 border-2 border-toxic bg-toxic/10 p-3 text-sm text-bone">
          <div className="font-bold text-toxic">Válida — {formatMoney(verified.amount)}</div>
          <div className="mt-1 text-xs text-ashLight">
            {verified.code} · a nombre de {verified.recipientName ?? verified.purchaserName}
            {verified.expiresAt && ` · vence el ${new Date(verified.expiresAt).toLocaleDateString("es-AR")}`}
          </div>
          <div className="mt-1 text-xs text-ashLight">
            Se canjea al confirmar el turno, que va a quedar con la seña saldada.
          </div>
        </div>
      )}

      {verified && !verified.redeemable && (
        <div className="mt-3 border-2 border-gore bg-gore/10 p-3 text-sm text-bone">
          <div className="font-bold text-gore">No se puede usar</div>
          <div className="mt-1">{verified.rejectionReason}</div>
          <div className="mt-1 text-xs text-ashLight">
            {verified.code} · {formatMoney(verified.amount)}
          </div>
        </div>
      )}
    </div>
  );
}
