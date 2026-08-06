"use client";

import { Fragment, useEffect, useState } from "react";
import { fetchArtists, type Artist } from "@/lib/api";
import {
  cancelAdminAppointment,
  fetchAdminAppointments,
  type AdminAppointment,
} from "@/lib/adminApi";
import {
  addDaysToDateString,
  formatDateLong,
  formatDateTimeShort,
  formatSlotTime,
  isoToMendozaDateString,
  todayDateString,
} from "@/lib/mendozaTime";
import { formatPhoneForDisplay, whatsAppUrl } from "@/lib/phone";
import { ErrorBox, Spinner } from "@/components/reservation/shared";
import { RescheduleModal } from "./RescheduleModal";
import { NewAppointmentModal } from "./NewAppointmentModal";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmado",
  CANCELLED: "Cancelado",
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: "text-ash border-ash",
  CONFIRMED: "text-toxic border-toxic",
  CANCELLED: "text-gore border-gore",
};

const DEPOSIT_LABEL: Record<string, string> = {
  NONE: "—",
  PENDING: "Seña pendiente",
  PAID: "Seña pagada",
};

/**
 * Los teléfonos se guardan en E.164 (+5492617199005), que es correcto pero
 * ilegible de un vistazo: se muestra formateado. El link a WhatsApp solo se
 * ofrece si el número se puede usar — mandar a un número mal armado es peor
 * que no ofrecer el link. Ver lib/phone.ts.
 */
function CustomerPhone({ phone }: { phone: string }) {
  const url = whatsAppUrl(phone);
  const display = formatPhoneForDisplay(phone);

  if (!url) {
    return <div className="text-xs text-ashLight">{display}</div>;
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title="Abrir chat de WhatsApp"
      className="text-xs text-toxic underline decoration-dotted underline-offset-2 transition-colors hover:text-bone"
    >
      {display}
    </a>
  );
}

/**
 * Parte la lista (que ya viene ordenada por startTime asc del backend) en
 * bloques de un día calendario Mendoza, conservando ese orden. Sin esto la
 * tabla es una pared de filas donde no se ve dónde termina un día.
 */
function groupByDay(appointments: AdminAppointment[]): { date: string; items: AdminAppointment[] }[] {
  const groups: { date: string; items: AdminAppointment[] }[] = [];
  for (const appointment of appointments) {
    const date = isoToMendozaDateString(appointment.startTime);
    const last = groups[groups.length - 1];
    if (last && last.date === date) last.items.push(appointment);
    else groups.push({ date, items: [appointment] });
  }
  return groups;
}

export function AppointmentsTab({ code }: { code: string }) {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [appointments, setAppointments] = useState<AdminAppointment[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState("");
  const [artistFilter, setArtistFilter] = useState("");
  const [fromFilter, setFromFilter] = useState(todayDateString());
  const [toFilter, setToFilter] = useState(() => addDaysToDateString(todayDateString(), 30));

  const [cancelTarget, setCancelTarget] = useState<AdminAppointment | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<AdminAppointment | null>(null);
  const [creating, setCreating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    fetchArtists()
      .then(setArtists)
      .catch(() => {
        /* el filtro de tatuador simplemente queda vacío si esto falla */
      });
  }, []);

  async function loadAppointments() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminAppointments(code, {
        status: statusFilter || undefined,
        artistId: artistFilter || undefined,
        from: fromFilter || undefined,
        to: toFilter || undefined,
      });
      setAppointments(data);
    } catch {
      setError("No pudimos cargar los turnos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, artistFilter, fromFilter, toFilter]);

  async function handleConfirmCancel() {
    if (!cancelTarget) return;
    setActionError(null);
    try {
      await cancelAdminAppointment(code, cancelTarget.id);
      setCancelTarget(null);
      await loadAppointments();
    } catch {
      setActionError("No pudimos cancelar el turno. Probá de nuevo.");
    }
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end gap-4">
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="clip-notch-sm order-last ml-auto bg-gore px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-ink"
        >
          + Nuevo turno
        </button>

        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-ash">
          Tatuador
          <select
            value={artistFilter}
            onChange={(e) => setArtistFilter(e.target.value)}
            className="border-2 border-plum bg-ink px-3 py-2 text-sm text-bone"
          >
            <option value="">Todos</option>
            {artists.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-ash">
          Estado
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border-2 border-plum bg-ink px-3 py-2 text-sm text-bone"
          >
            <option value="">Todos</option>
            <option value="PENDING">Pendiente</option>
            <option value="CONFIRMED">Confirmado</option>
            <option value="CANCELLED">Cancelado</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-ash">
          Desde
          <input
            type="date"
            value={fromFilter}
            onChange={(e) => setFromFilter(e.target.value)}
            className="border-2 border-plum bg-ink px-3 py-2 text-sm text-bone"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-ash">
          Hasta
          <input
            type="date"
            value={toFilter}
            onChange={(e) => setToFilter(e.target.value)}
            className="border-2 border-plum bg-ink px-3 py-2 text-sm text-bone"
          />
        </label>
      </div>

      {actionError && (
        <div className="mb-4">
          <ErrorBox message={actionError} />
        </div>
      )}

      {loading && <Spinner label="Cargando turnos…" />}
      {!loading && error && <ErrorBox message={error} onRetry={loadAppointments} />}
      {!loading && !error && appointments && appointments.length === 0 && (
        <p className="border-2 border-plum bg-panel p-5 text-center text-sm text-ashLight">
          No hay turnos en este rango con estos filtros.
        </p>
      )}

      {!loading && !error && appointments && appointments.length > 0 && (
        <div className="overflow-x-auto border-2 border-plum">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b-2 border-plum bg-panel text-xs font-semibold uppercase tracking-wide text-ash">
                <th className="px-3 py-2.5">Hora</th>
                <th className="px-3 py-2.5">Tatuador</th>
                <th className="px-3 py-2.5">Servicio</th>
                <th className="px-3 py-2.5">Cliente</th>
                <th className="px-3 py-2.5">Estado</th>
                <th className="px-3 py-2.5">Seña</th>
                <th className="px-3 py-2.5">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {groupByDay(appointments).map((group) => (
                <Fragment key={group.date}>
                  <tr>
                    <th
                      colSpan={7}
                      className="border-y-2 border-plum bg-plum/30 px-3 py-2 text-left font-display text-sm text-bone"
                    >
                      {formatDateLong(group.date)}
                      <span className="ml-2 text-xs font-semibold uppercase tracking-wide text-toxic">
                        {group.items.length} {group.items.length === 1 ? "turno" : "turnos"}
                      </span>
                    </th>
                  </tr>
                  {group.items.map((appointment) => (
                <tr key={appointment.id} className="border-b border-plum/40 text-bone">
                  <td className="px-3 py-2.5 whitespace-nowrap font-semibold">
                    {formatSlotTime(appointment.startTime)}
                  </td>
                  <td className="px-3 py-2.5">{appointment.artist.name}</td>
                  <td className="px-3 py-2.5">{appointment.service.name}</td>
                  <td className="px-3 py-2.5">
                    <div>{appointment.customerName}</div>
                    <CustomerPhone phone={appointment.customerPhone} />
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${STATUS_COLOR[appointment.status]}`}
                    >
                      {STATUS_LABEL[appointment.status]}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-ashLight">
                    {/* Con gift card el badge reemplaza al texto de la seña en
                        vez de sumarse: "Seña pagada" a secas no dice con qué se
                        pagó, y esa es justamente la trazabilidad que hace falta
                        cuando no hay un pago de Mercado Pago detrás. */}
                    {appointment.redeemedGiftCards.length > 0 ? (
                      <span
                        title={`Pagado con la gift card ${appointment.redeemedGiftCards[0].code}`}
                        className="inline-block border border-toxic px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-toxic"
                      >
                        Gift card · {appointment.redeemedGiftCards[0].code}
                      </span>
                    ) : (
                      DEPOSIT_LABEL[appointment.depositStatus]
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {appointment.status !== "CANCELLED" && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setRescheduleTarget(appointment)}
                          className="border border-toxic px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-toxic transition-colors hover:bg-toxic hover:text-ink"
                        >
                          Reprogramar
                        </button>
                        <button
                          type="button"
                          onClick={() => setCancelTarget(appointment)}
                          className="border border-gore px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-gore transition-colors hover:bg-gore hover:text-ink"
                        >
                          Cancelar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {cancelTarget && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 p-6">
          <div className="w-full max-w-sm border-2 border-plum bg-panel p-6">
            <h3 className="mb-3 font-display text-lg text-bone">¿Cancelar este turno?</h3>
            <p className="mb-5 text-sm text-ashLight">
              {cancelTarget.customerName} — {cancelTarget.service.name} con {cancelTarget.artist.name},{" "}
              {formatDateTimeShort(cancelTarget.startTime)}. Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setCancelTarget(null)}
                className="border-2 border-ash px-4 py-2 text-xs font-bold uppercase tracking-wide text-bone"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="bg-gore px-4 py-2 text-xs font-bold uppercase tracking-wide text-ink"
              >
                Sí, cancelar turno
              </button>
            </div>
          </div>
        </div>
      )}

      {creating && (
        <NewAppointmentModal
          code={code}
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            loadAppointments();
          }}
        />
      )}

      {rescheduleTarget && (
        <RescheduleModal
          code={code}
          appointment={rescheduleTarget}
          onClose={() => setRescheduleTarget(null)}
          onRescheduled={() => {
            setRescheduleTarget(null);
            loadAppointments();
          }}
        />
      )}
    </div>
  );
}
