"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import {
  assignServiceToArtist,
  createAdminService,
  deleteAdminService,
  fetchAdminArtists,
  fetchAdminServices,
  unassignServiceFromArtist,
  updateAdminService,
  type AdminArtist,
  type AdminService,
} from "@/lib/adminApi";
import { ErrorBox, Spinner } from "@/components/reservation/shared";

type FormTarget = "new" | AdminService;

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  if (rest === 0) return `${hours} h`;
  return `${hours} h ${rest} min`;
}

function formatMoney(amount: string): string {
  const value = Number(amount);
  if (Number.isNaN(value)) return amount;
  return value.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
}

export function ServicesTab({ code }: { code: string }) {
  const [services, setServices] = useState<AdminService[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formTarget, setFormTarget] = useState<FormTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminService | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function loadServices() {
    setLoading(true);
    setError(null);
    try {
      setServices(await fetchAdminServices(code));
    } catch {
      setError("No pudimos cargar los servicios.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadServices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setActionError(null);
    setNotice(null);
    try {
      const result = await deleteAdminService(code, deleteTarget.id);
      setDeleteTarget(null);
      setNotice(
        result.deleted
          ? `"${deleteTarget.name}" se eliminó.`
          : `"${deleteTarget.name}" ya tiene ${result.appointmentCount} turno(s) asociado(s), así que se desactivó en vez de eliminarse.`
      );
      await loadServices();
    } catch {
      setActionError("No pudimos eliminar el servicio. Probá de nuevo.");
    }
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-md text-sm text-ashLight">
          Los servicios inactivos no aparecen en el wizard de reserva. Para elegir qué tatuador ofrece cada
          servicio, editá al tatuador en la pestaña Tatuadores.
        </p>
        <button
          type="button"
          onClick={() => setFormTarget("new")}
          className="clip-notch-sm shrink-0 bg-gore px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-ink"
        >
          + Nuevo servicio
        </button>
      </div>

      {actionError && (
        <div className="mb-4">
          <ErrorBox message={actionError} />
        </div>
      )}

      {notice && (
        <div className="clip-notch-sm mb-4 flex items-start justify-between gap-4 border-2 border-toxic bg-toxic/10 p-4 text-sm text-bone">
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="shrink-0 text-xs font-bold uppercase tracking-wide text-toxic"
          >
            Cerrar
          </button>
        </div>
      )}

      {loading && <Spinner label="Cargando servicios…" />}
      {!loading && error && <ErrorBox message={error} onRetry={loadServices} />}

      {!loading && !error && services && services.length === 0 && (
        <p className="border-2 border-plum bg-panel p-5 text-center text-sm text-ashLight">
          Todavía no hay servicios cargados.
        </p>
      )}

      {!loading && !error && services && services.length > 0 && (
        <div className="overflow-x-auto border-2 border-plum">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b-2 border-plum bg-panel text-xs font-semibold uppercase tracking-wide text-ash">
                <th className="px-3 py-2.5">Servicio</th>
                <th className="px-3 py-2.5">Duración</th>
                <th className="px-3 py-2.5">Seña</th>
                <th className="px-3 py-2.5">Lo ofrecen</th>
                <th className="px-3 py-2.5">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {services.map((service) => (
                <tr
                  key={service.id}
                  className={`border-b border-plum/40 ${service.active ? "text-bone" : "text-ash opacity-60"}`}
                >
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{service.name}</span>
                      {!service.active && (
                        <span className="border border-ash px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ash">
                          Inactivo
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">{formatDuration(service.durationMinutes)}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {service.requiresDeposit && service.depositAmount ? (
                      <span className="border border-toxic px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-toxic">
                        {formatMoney(service.depositAmount)}
                      </span>
                    ) : (
                      <span className="text-xs text-ashLight">Sin seña</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-ashLight">
                    {service.artists.length > 0 ? (
                      service.artists.map((a) => a.name).join(", ")
                    ) : (
                      <span className="text-gore">Ningún tatuador</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setFormTarget(service)}
                        className="border border-toxic px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-toxic transition-colors hover:bg-toxic hover:text-ink"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(service)}
                        className="border border-gore px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-gore transition-colors hover:bg-gore hover:text-ink"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {formTarget && (
        <ServiceForm
          code={code}
          target={formTarget}
          onClose={() => setFormTarget(null)}
          onSaved={() => {
            setFormTarget(null);
            loadServices();
          }}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 p-6">
          <div className="w-full max-w-sm border-2 border-plum bg-panel p-6">
            <h3 className="mb-3 font-display text-lg text-bone">¿Eliminar {deleteTarget.name}?</h3>
            <p className="mb-5 text-sm text-ashLight">
              Si el servicio ya tiene turnos asociados no se puede borrar (esos turnos dejarían de tener sentido):
              en ese caso se desactiva y deja de aparecer en el wizard de reserva.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="border-2 border-ash px-4 py-2 text-xs font-bold uppercase tracking-wide text-bone"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="bg-gore px-4 py-2 text-xs font-bold uppercase tracking-wide text-ink"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ServiceForm({
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
  const [name, setName] = useState(isNew ? "" : target.name);
  // La duración se guarda en minutos, pero se carga en horas + minutos: es
  // más fácil pensar "2 h 30" que "150".
  const [hours, setHours] = useState(isNew ? 1 : Math.floor(target.durationMinutes / 60));
  const [minutes, setMinutes] = useState(isNew ? 0 : target.durationMinutes % 60);
  const [requiresDeposit, setRequiresDeposit] = useState(isNew ? false : target.requiresDeposit);
  const [depositAmount, setDepositAmount] = useState(
    isNew || target.depositAmount === null ? "" : String(Number(target.depositAmount))
  );
  const [active, setActive] = useState(isNew ? true : target.active);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const durationMinutes = hours * 60 + minutes;

  // Qué tatuadores ofrecen este servicio. Es el mismo vínculo ArtistService
  // que se edita desde el formulario del tatuador (ArtistsTab), visto desde
  // el otro lado: los dos caminos pegan a los mismos endpoints, así que
  // quedan sincronizados solos.
  const [artists, setArtists] = useState<AdminArtist[] | null>(null);
  const [selectedArtistIds, setSelectedArtistIds] = useState<Set<string>>(
    () => new Set(isNew ? [] : target.artists.map((a) => a.id))
  );
  // Snapshot de cómo estaba al abrir, para diferenciar altas de bajas al
  // guardar. `useState` sin setter = valor inicial congelado.
  const [initialArtistIds] = useState<Set<string>>(
    () => new Set(isNew ? [] : target.artists.map((a) => a.id))
  );

  useEffect(() => {
    // `alive`, no `active`: ese nombre ya lo usa el toggle de activo del
    // servicio y lo estaría tapando dentro de este efecto.
    let alive = true;
    fetchAdminArtists(code)
      .then((data) => {
        if (alive) setArtists(data);
      })
      .catch(() => {
        // El resto del formulario sigue siendo usable; se avisa en el lugar
        // donde iría la lista.
        if (alive) setArtists([]);
      });
    return () => {
      alive = false;
    };
  }, [code]);

  function toggleArtist(artistId: string) {
    setSelectedArtistIds((current) => {
      const next = new Set(current);
      if (next.has(artistId)) next.delete(artistId);
      else next.add(artistId);
      return next;
    });
  }

  async function syncServiceArtists(id: string) {
    const toAssign = [...selectedArtistIds].filter((artistId) => !initialArtistIds.has(artistId));
    const toUnassign = [...initialArtistIds].filter((artistId) => !selectedArtistIds.has(artistId));
    await Promise.all([
      ...toAssign.map((artistId) => assignServiceToArtist(code, artistId, id)),
      ...toUnassign.map((artistId) => unassignServiceFromArtist(code, artistId, id)),
    ]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    if (durationMinutes < 5) {
      setError("La duración tiene que ser de al menos 5 minutos.");
      return;
    }
    const parsedDeposit = Number(depositAmount);
    if (requiresDeposit && (!depositAmount.trim() || Number.isNaN(parsedDeposit) || parsedDeposit <= 0)) {
      setError("Un servicio que requiere seña necesita un monto mayor a cero.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      // depositAmount solo se manda si aplica — el backend lo pone en null
      // cuando requiresDeposit es false, no hace falta mandarlo vacío.
      const depositFields = requiresDeposit ? { depositAmount: parsedDeposit } : {};
      // El alta va primero: asignar tatuadores necesita el id del servicio,
      // que recién existe después de crearlo.
      let savedId: string;
      if (isNew) {
        const created = await createAdminService(code, {
          name: name.trim(),
          durationMinutes,
          requiresDeposit,
          ...depositFields,
        });
        savedId = created.id;
      } else {
        await updateAdminService(code, target.id, {
          name: name.trim(),
          durationMinutes,
          requiresDeposit,
          active,
          ...depositFields,
        });
        savedId = target.id;
      }
      await syncServiceArtists(savedId);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos guardar el servicio. Probá de nuevo.");
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
          {isNew ? "Nuevo servicio" : `Editar ${target.name}`}
        </h3>

        {error && (
          <div className="mb-4">
            <ErrorBox message={error} />
          </div>
        )}

        <div className="mb-5 flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-ash">
            Nombre
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border-2 border-plum bg-ink px-3 py-2 text-sm text-bone"
              required
            />
          </label>

          <div className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-ash">
            Duración
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 normal-case tracking-normal">
                <input
                  type="number"
                  min={0}
                  max={12}
                  value={hours}
                  onChange={(e) => setHours(Math.max(0, Number(e.target.value) || 0))}
                  className="w-20 border-2 border-plum bg-ink px-3 py-2 text-sm text-bone"
                  aria-label="Horas"
                />
                <span className="text-sm text-ashLight">h</span>
              </label>
              <label className="flex items-center gap-2 normal-case tracking-normal">
                {/* step=1, no 5: un step más grande haría que el navegador
                    rechace valores fuera de esa grilla con un mensaje
                    críptico, y el backend acepta cualquier entero. */}
                <input
                  type="number"
                  min={0}
                  max={59}
                  step={1}
                  value={minutes}
                  onChange={(e) => setMinutes(Math.min(59, Math.max(0, Number(e.target.value) || 0)))}
                  className="w-20 border-2 border-plum bg-ink px-3 py-2 text-sm text-bone"
                  aria-label="Minutos"
                />
                <span className="text-sm text-ashLight">min</span>
              </label>
              <span className="ml-auto text-sm normal-case tracking-normal text-toxic">
                = {formatDuration(durationMinutes)}
              </span>
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ash">
            <input
              type="checkbox"
              checked={requiresDeposit}
              onChange={(e) => setRequiresDeposit(e.target.checked)}
              className="h-4 w-4 accent-gore"
            />
            Requiere seña
          </label>

          {requiresDeposit && (
            <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-ash">
              Monto de la seña (ARS)
              {/*
                step="any" a propósito: con un step numérico el navegador
                valida contra la grilla min + n*step, así que un monto redondo
                como 20000 quedaba rechazado ("los valores más próximos son
                19901 y 20001") por tener min=1. Además el backend acepta
                hasta 2 decimales, que un step entero también bloquearía.
              */}
              <input
                type="number"
                min={1}
                step="any"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="border-2 border-plum bg-ink px-3 py-2 text-sm text-bone"
                placeholder="Ej: 15000"
                required
              />
            </label>
          )}

          <div className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-ash">
            Tatuadores que lo ofrecen
            {artists === null ? (
              <p className="border-2 border-plum bg-ink px-3 py-2 text-sm normal-case tracking-normal text-ashLight">
                Cargando tatuadores…
              </p>
            ) : artists.length === 0 ? (
              <p className="border-2 border-plum bg-ink px-3 py-2 text-sm normal-case tracking-normal text-ashLight">
                No hay tatuadores cargados todavía.
              </p>
            ) : (
              <div className="flex flex-col gap-2 border-2 border-plum bg-ink p-3">
                {artists.map((artist) => (
                  <label
                    key={artist.id}
                    className="flex items-center gap-2 text-sm normal-case tracking-normal text-bone"
                  >
                    <input
                      type="checkbox"
                      checked={selectedArtistIds.has(artist.id)}
                      onChange={() => toggleArtist(artist.id)}
                      className="h-4 w-4 accent-gore"
                    />
                    <span>{artist.name}</span>
                    {!artist.active && (
                      <span className="border border-ash px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ash">
                        Inactivo
                      </span>
                    )}
                  </label>
                ))}
              </div>
            )}
            <span className="normal-case tracking-normal text-ashLight">
              Lo mismo se puede editar desde el formulario del tatuador.
            </span>
          </div>

          {!isNew && (
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ash">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="h-4 w-4 accent-gore"
              />
              Activo (visible en el wizard de reserva)
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
