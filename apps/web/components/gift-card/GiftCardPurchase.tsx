"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ApiError,
  createGiftCard,
  createGiftCardPaymentPreference,
  fetchGiftCardTiers,
  type GiftCardTier,
} from "@/lib/api";
import { whatsappConsultaUrl } from "@/data/content";
import { ErrorBox, PrimaryButton, Spinner, StepEyebrow } from "@/components/reservation/shared";

type Step = "amount" | "data" | "redirecting";

function formatMoney(amount: string): string {
  const value = Number(amount);
  if (Number.isNaN(value)) return amount;
  return value.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
}

/**
 * Compra de gift card: elegir monto → cargar datos → pagar en Mercado Pago.
 *
 * Mismo flujo por pasos que el wizard de reserva y con sus mismos componentes
 * (StepEyebrow, PrimaryButton, ErrorBox), pero en una página propia en vez de
 * un modal: a diferencia de reservar, esto es algo que se comparte por link.
 */
export function GiftCardPurchase() {
  const [step, setStep] = useState<Step>("amount");
  const [tiers, setTiers] = useState<GiftCardTier[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [tierId, setTierId] = useState<string | null>(null);

  const [purchaserName, setPurchaserName] = useState("");
  const [purchaserEmail, setPurchaserEmail] = useState("");
  const [isGift, setIsGift] = useState(false);
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [message, setMessage] = useState("");

  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const selectedTier = tiers?.find((tier) => tier.id === tierId) ?? null;

  useEffect(() => {
    let alive = true;
    fetchGiftCardTiers()
      .then((data) => {
        if (alive) setTiers(data);
      })
      .catch(() => {
        if (alive) setLoadError(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tierId) return;

    if (!purchaserName.trim()) {
      setFieldError("Falta tu nombre.");
      return;
    }
    if (!purchaserEmail.trim()) {
      setFieldError("Falta tu email.");
      return;
    }
    // Si es un regalo, hace falta a dónde mandarlo: sin email del
    // destinatario el código le llegaría al comprador y el regalo pierde la
    // sorpresa (o directamente no llega).
    if (isGift && !recipientEmail.trim()) {
      setFieldError("Falta el email de quien recibe el regalo.");
      return;
    }
    setFieldError(null);

    setSubmitting(true);
    setSubmitError(null);
    try {
      const giftCard = await createGiftCard({
        tierId,
        purchaserName: purchaserName.trim(),
        purchaserEmail: purchaserEmail.trim(),
        ...(isGift
          ? {
              recipientName: recipientName.trim() || undefined,
              recipientEmail: recipientEmail.trim(),
              message: message.trim() || undefined,
            }
          : {}),
      });

      setStep("redirecting");
      const { initPoint } = await createGiftCardPaymentPreference(giftCard.id);
      window.location.href = initPoint;
    } catch (err) {
      setStep("data");
      setSubmitError(
        err instanceof ApiError ? err.message : "No pudimos iniciar el pago. Probá de nuevo."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-ink px-5 py-16 sm:px-10">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/"
          className="mb-8 inline-block text-xs font-semibold uppercase tracking-[2px] text-ash no-underline transition-colors hover:text-toxic"
        >
          ← Freaky Monster Tattoo Studio
        </Link>

        <h1 className="mb-2 font-display text-[clamp(28px,5vw,42px)] text-bone">Gift card</h1>
        <p className="mb-10 max-w-lg text-[15px] text-ashLight">
          Regalá un tatuaje. Elegís el monto, lo pagás online y el código llega por mail — lo puede usar para
          el diseño que quiera, con el tatuador que quiera.
        </p>

        {step === "redirecting" && <Spinner label="Te llevamos a Mercado Pago…" />}

        {step !== "redirecting" && (
          <>
            <section className="mb-10">
              <StepEyebrow step={1} total={2} label="Elegí el monto" />

              {loadError && (
                <ErrorBox message="No pudimos cargar los montos disponibles. Probá recargar la página." />
              )}
              {!loadError && tiers === null && <Spinner label="Cargando montos…" />}
              {!loadError && tiers?.length === 0 && (
                <p className="border-2 border-plum bg-panel p-5 text-center text-sm text-ashLight">
                  Por ahora no hay gift cards a la venta. Escribinos por WhatsApp y lo vemos.
                </p>
              )}

              {tiers && tiers.length > 0 && (
                <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-4">
                  {tiers.map((tier) => {
                    const selected = tier.id === tierId;
                    return (
                      <button
                        key={tier.id}
                        type="button"
                        onClick={() => {
                          setTierId(tier.id);
                          setStep("data");
                        }}
                        className={`clip-notch-sm border-2 p-5 text-center transition-colors ${
                          selected
                            ? "border-gore bg-gore/10"
                            : "border-plum bg-panel hover:border-toxic"
                        }`}
                      >
                        <div
                          className={`font-display text-2xl ${selected ? "text-gore" : "text-bone"}`}
                        >
                          {formatMoney(tier.amount)}
                        </div>
                        {tier.label && (
                          <div className="mt-1 text-xs font-semibold uppercase tracking-[1.5px] text-toxic">
                            {tier.label}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            {step === "data" && selectedTier && (
              <section>
                <StepEyebrow step={2} total={2} label="Tus datos" />

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wide text-ash">
                      Tu nombre *
                    </span>
                    <input
                      type="text"
                      value={purchaserName}
                      onChange={(e) => setPurchaserName(e.target.value)}
                      maxLength={120}
                      required
                      className="clip-notch-sm border-2 border-plum bg-ink px-4 py-2.5 text-sm text-bone outline-none focus:border-gore"
                    />
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wide text-ash">
                      Tu email *
                    </span>
                    <input
                      type="email"
                      value={purchaserEmail}
                      onChange={(e) => setPurchaserEmail(e.target.value)}
                      required
                      className="clip-notch-sm border-2 border-plum bg-ink px-4 py-2.5 text-sm text-bone outline-none focus:border-gore"
                    />
                  </label>

                  <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ash">
                    <input
                      type="checkbox"
                      checked={isGift}
                      onChange={(e) => setIsGift(e.target.checked)}
                      className="h-4 w-4 accent-gore"
                    />
                    Es para regalar a otra persona
                  </label>

                  {isGift && (
                    <div className="clip-notch-sm flex flex-col gap-4 border-2 border-plum bg-panel p-4">
                      <label className="flex flex-col gap-1.5">
                        <span className="text-xs font-semibold uppercase tracking-wide text-ash">
                          Nombre de quien lo recibe
                        </span>
                        <input
                          type="text"
                          value={recipientName}
                          onChange={(e) => setRecipientName(e.target.value)}
                          maxLength={120}
                          className="clip-notch-sm border-2 border-plum bg-ink px-4 py-2.5 text-sm text-bone outline-none focus:border-gore"
                        />
                      </label>

                      <label className="flex flex-col gap-1.5">
                        <span className="text-xs font-semibold uppercase tracking-wide text-ash">
                          Su email *
                        </span>
                        <input
                          type="email"
                          value={recipientEmail}
                          onChange={(e) => setRecipientEmail(e.target.value)}
                          className="clip-notch-sm border-2 border-plum bg-ink px-4 py-2.5 text-sm text-bone outline-none focus:border-gore"
                        />
                        <span className="text-xs text-ashLight">Ahí le mandamos el código.</span>
                      </label>

                      <label className="flex flex-col gap-1.5">
                        <span className="text-xs font-semibold uppercase tracking-wide text-ash">
                          Dedicatoria (opcional)
                        </span>
                        <textarea
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          maxLength={500}
                          rows={3}
                          placeholder="Feliz cumple! Elegí el que más te guste."
                          className="clip-notch-sm border-2 border-plum bg-ink px-4 py-2.5 text-sm text-bone outline-none focus:border-gore"
                        />
                      </label>
                    </div>
                  )}

                  {fieldError && <p className="text-sm font-semibold text-gore">{fieldError}</p>}
                  {submitError && <ErrorBox message={submitError} />}

                  <div className="clip-notch-sm border-2 border-plum bg-panel p-4 text-sm text-ashLight">
                    Total a pagar:{" "}
                    <strong className="text-bone">{formatMoney(selectedTier.amount)}</strong>
                  </div>

                  <PrimaryButton type="submit" disabled={submitting}>
                    {submitting ? "Preparando el pago…" : "Pagar con Mercado Pago"}
                  </PrimaryButton>
                </form>
              </section>
            )}

            <p className="mt-10 text-sm text-ashLight">
              ¿Dudas?{" "}
              <a
                href={whatsappConsultaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-toxic underline decoration-dotted underline-offset-2"
              >
                Escribinos por WhatsApp
              </a>
              .
            </p>
          </>
        )}
      </div>
    </main>
  );
}
