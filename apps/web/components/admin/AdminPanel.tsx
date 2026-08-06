"use client";

import { useEffect, useState } from "react";
import { fetchAdminAppointments } from "@/lib/adminApi";
import { Spinner } from "@/components/reservation/shared";
import { AccessDenied } from "./AccessDenied";
import { AppointmentsTab } from "./AppointmentsTab";
import { BlockDayTab } from "./BlockDayTab";
import { ArtistsTab } from "./ArtistsTab";
import { ServicesTab } from "./ServicesTab";
import { GiftCardsTab } from "./GiftCardsTab";

type AuthState = "checking" | "denied" | "ok";
type PanelTab = "appointments" | "block" | "artists" | "services" | "giftCards";

export function AdminPanel({ code }: { code: string }) {
  const [authState, setAuthState] = useState<AuthState>("checking");
  const [tab, setTab] = useState<PanelTab>("appointments");

  useEffect(() => {
    let active = true;
    fetchAdminAppointments(code)
      .then(() => {
        if (active) setAuthState("ok");
      })
      .catch(() => {
        // Un 401 es el caso esperado con un código inválido; cualquier otro
        // error (red, 500) tampoco nos deja entrar, así que el resultado es
        // el mismo: no mostramos el panel.
        if (active) setAuthState("denied");
      });
    return () => {
      active = false;
    };
  }, [code]);

  if (authState === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink">
        <Spinner label="Verificando acceso…" />
      </div>
    );
  }

  if (authState === "denied") {
    return <AccessDenied />;
  }

  return (
    <div className="min-h-screen bg-ink px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-6 font-heading text-2xl uppercase tracking-wide text-bone">
          Panel de administración
        </h1>

        <div className="mb-6 flex gap-2 border-b-2 border-plum">
          <button
            type="button"
            onClick={() => setTab("appointments")}
            className={`px-4 py-2.5 text-sm font-bold uppercase tracking-wide transition-colors ${
              tab === "appointments"
                ? "border-b-2 border-gore text-gore"
                : "text-ash hover:text-ashLight"
            }`}
          >
            Turnos
          </button>
          <button
            type="button"
            onClick={() => setTab("block")}
            className={`px-4 py-2.5 text-sm font-bold uppercase tracking-wide transition-colors ${
              tab === "block" ? "border-b-2 border-gore text-gore" : "text-ash hover:text-ashLight"
            }`}
          >
            Bloquear día
          </button>
          <button
            type="button"
            onClick={() => setTab("artists")}
            className={`px-4 py-2.5 text-sm font-bold uppercase tracking-wide transition-colors ${
              tab === "artists" ? "border-b-2 border-gore text-gore" : "text-ash hover:text-ashLight"
            }`}
          >
            Tatuadores
          </button>
          <button
            type="button"
            onClick={() => setTab("services")}
            className={`px-4 py-2.5 text-sm font-bold uppercase tracking-wide transition-colors ${
              tab === "services" ? "border-b-2 border-gore text-gore" : "text-ash hover:text-ashLight"
            }`}
          >
            Servicios
          </button>
          <button
            type="button"
            onClick={() => setTab("giftCards")}
            className={`px-4 py-2.5 text-sm font-bold uppercase tracking-wide transition-colors ${
              tab === "giftCards" ? "border-b-2 border-gore text-gore" : "text-ash hover:text-ashLight"
            }`}
          >
            Gift Cards
          </button>
        </div>

        {tab === "appointments" && <AppointmentsTab code={code} />}
        {tab === "block" && <BlockDayTab code={code} />}
        {tab === "artists" && <ArtistsTab code={code} />}
        {tab === "services" && <ServicesTab code={code} />}
        {tab === "giftCards" && <GiftCardsTab code={code} />}
      </div>
    </div>
  );
}
