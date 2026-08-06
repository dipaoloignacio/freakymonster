"use client";

import { useEffect, useState } from "react";
import { ApiError, resolveAssetUrl } from "@/lib/api";
import {
  assignServiceToArtist,
  createAdminArtist,
  deactivateAdminArtist,
  deleteAdminArtist,
  fetchAdminArtists,
  fetchAdminServices,
  fetchArtistAvailability,
  setArtistAvailability,
  unassignServiceFromArtist,
  updateAdminArtist,
  type AdminArtist,
  type AdminService,
  type WeeklyAvailabilityWindow,
} from "@/lib/adminApi";
import { ErrorBox, Spinner } from "@/components/reservation/shared";
import { formatDuration } from "./ServicesTab";

type FormTarget = "new" | AdminArtist;

type DaySchedule = { enabled: boolean; startTime: string; endTime: string };

// Orden de visualización lunes→domingo (como el calendario del wizard),
// pero el valor guardado sigue la convención del backend: 0 = domingo.
const WEEKDAYS: { value: number; label: string }[] = [
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
  { value: 0, label: "Domingo" },
];

// Espeja DEFAULT_WEEKLY_AVAILABILITY del backend, para que el formulario de
// alta muestre exactamente lo que se va a guardar en vez de una semana vacía
// que no se corresponde con la realidad.
function defaultSchedule(): Record<number, DaySchedule> {
  const schedule: Record<number, DaySchedule> = {};
  for (const { value } of WEEKDAYS) {
    schedule[value] = {
      enabled: value >= 2 && value <= 6,
      startTime: "12:00",
      endTime: "20:00",
    };
  }
  return schedule;
}

function scheduleFromWindows(windows: WeeklyAvailabilityWindow[]): Record<number, DaySchedule> {
  const schedule: Record<number, DaySchedule> = {};
  for (const { value } of WEEKDAYS) {
    schedule[value] = { enabled: false, startTime: "12:00", endTime: "20:00" };
  }
  // Si un día tuviera más de una franja (el backend lo permite), la UI
  // muestra la primera — al guardar quedaría solo esa. Hoy no se da porque
  // nada crea franjas partidas, pero conviene saberlo antes de agregarlas.
  for (const window of windows) {
    const current = schedule[window.dayOfWeek];
    if (current && !current.enabled) {
      schedule[window.dayOfWeek] = {
        enabled: true,
        startTime: window.startTime,
        endTime: window.endTime,
      };
    }
  }
  return schedule;
}

export function ArtistsTab({ code }: { code: string }) {
  const [artists, setArtists] = useState<AdminArtist[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formTarget, setFormTarget] = useState<FormTarget | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<AdminArtist | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminArtist | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function loadArtists() {
    setLoading(true);
    setError(null);
    try {
      setArtists(await fetchAdminArtists(code));
    } catch {
      setError("No pudimos cargar los tatuadores.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadArtists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleConfirmDeactivate() {
    if (!deactivateTarget) return;
    setActionError(null);
    setNotice(null);
    try {
      await deactivateAdminArtist(code, deactivateTarget.id);
      setDeactivateTarget(null);
      await loadArtists();
    } catch {
      setActionError("No pudimos desactivar al tatuador. Probá de nuevo.");
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setActionError(null);
    setNotice(null);
    try {
      const result = await deleteAdminArtist(code, deleteTarget.id);
      setDeleteTarget(null);
      setNotice(
        result.deleted
          ? `"${deleteTarget.name}" se eliminó.`
          : `No se puede eliminar a "${deleteTarget.name}": tiene ${result.appointmentCount} turno(s) asociado(s). Se desactivó en su lugar.`
      );
      await loadArtists();
    } catch {
      setActionError("No pudimos eliminar al tatuador. Probá de nuevo.");
    }
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-md text-sm text-ashLight">
          Los tatuadores inactivos no aparecen como opción en el wizard de reserva, pero sus turnos ya agendados
          siguen intactos.
        </p>
        <button
          type="button"
          onClick={() => setFormTarget("new")}
          className="clip-notch-sm shrink-0 bg-gore px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-ink"
        >
          + Nuevo tatuador
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

      {loading && <Spinner label="Cargando tatuadores…" />}
      {!loading && error && <ErrorBox message={error} onRetry={loadArtists} />}

      {!loading && !error && artists && artists.length === 0 && (
        <p className="border-2 border-plum bg-panel p-5 text-center text-sm text-ashLight">
          Todavía no hay tatuadores cargados.
        </p>
      )}

      {!loading && !error && artists && artists.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {artists.map((artist) => (
            <div
              key={artist.id}
              className={`clip-notch-sm border-2 p-4 ${
                artist.active ? "border-plum bg-panel" : "border-plum/40 bg-panel/40 opacity-60"
              }`}
            >
              <div className="relative mb-3 aspect-square overflow-hidden border-2 border-plum">
                {artist.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={resolveAssetUrl(artist.imageUrl)!} alt={artist.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="texture-panel h-full w-full" />
                )}
              </div>
              <div className="mb-1 flex items-center gap-2">
                <span className="font-display text-base text-bone">{artist.name}</span>
                {!artist.active && (
                  <span className="border border-ash px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ash">
                    Inactivo
                  </span>
                )}
              </div>
              {artist.specialties.length > 0 && (
                <div className="mb-3 text-[11px] font-semibold uppercase tracking-[1.5px] text-toxic">
                  {artist.specialties.join(" / ")}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormTarget(artist)}
                  className="border border-toxic px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-toxic transition-colors hover:bg-toxic hover:text-ink"
                >
                  Editar
                </button>
                {artist.active && (
                  <button
                    type="button"
                    onClick={() => setDeactivateTarget(artist)}
                    className="border border-ash px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-ash transition-colors hover:bg-ash hover:text-ink"
                  >
                    Desactivar
                  </button>
                )}
                {/* Destructivo de verdad: relleno sólido, no contorno, para
                    que no se confunda con "Desactivar", que es reversible. */}
                <button
                  type="button"
                  onClick={() => setDeleteTarget(artist)}
                  className="bg-gore px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-ink transition-opacity hover:opacity-80"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {formTarget && (
        <ArtistForm
          code={code}
          target={formTarget}
          onClose={() => setFormTarget(null)}
          onSaved={() => {
            setFormTarget(null);
            loadArtists();
          }}
        />
      )}

      {deactivateTarget && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 p-6">
          <div className="w-full max-w-sm border-2 border-plum bg-panel p-6">
            <h3 className="mb-3 font-display text-lg text-bone">¿Desactivar a {deactivateTarget.name}?</h3>
            <p className="mb-5 text-sm text-ashLight">
              Dejará de aparecer como opción en el wizard de reserva. Sus turnos ya agendados no se ven afectados.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeactivateTarget(null)}
                className="border-2 border-ash px-4 py-2 text-xs font-bold uppercase tracking-wide text-bone"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={handleConfirmDeactivate}
                className="bg-gore px-4 py-2 text-xs font-bold uppercase tracking-wide text-ink"
              >
                Sí, desactivar
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 p-6">
          <div className="w-full max-w-sm border-2 border-gore bg-panel p-6">
            <h3 className="mb-3 font-display text-lg text-bone">¿Eliminar a {deleteTarget.name}?</h3>
            <p className="mb-3 text-sm text-ashLight">
              Se borra el tatuador junto con sus horarios, días bloqueados y servicios asignados.{" "}
              <strong className="text-bone">Esta acción no se puede deshacer.</strong>
            </p>
            <p className="mb-5 text-sm text-ashLight">
              Si ya tiene turnos asociados no se puede borrar (esos turnos dejarían de tener sentido): en ese
              caso se desactiva y te avisamos.
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

function ArtistForm({
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
  const [bio, setBio] = useState(isNew ? "" : target.bio ?? "");
  const [specialties, setSpecialties] = useState<string[]>(isNew ? [] : target.specialties);
  const [tagInput, setTagInput] = useState("");
  const [active, setActive] = useState(isNew ? true : target.active);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(isNew ? null : resolveAssetUrl(target.imageUrl));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Qué servicios ofrece este tatuador (tabla ArtistService). La relación se
  // edita acá y no en la pestaña Servicios: ver el comentario de
  // ServicesSelector más abajo.
  const artistId = isNew ? null : target.id;
  const [services, setServices] = useState<AdminService[] | null>(null);
  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<string>>(new Set());
  // Snapshot de cómo estaba al abrir el formulario, para calcular al guardar
  // qué se agregó y qué se sacó (la API asigna/desasigna de a un par).
  const [initialServiceIds, setInitialServiceIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let active = true;
    fetchAdminServices(code)
      .then((data) => {
        if (!active) return;
        setServices(data);
        if (artistId) {
          const assigned = new Set(
            data.filter((s) => s.artists.some((a) => a.id === artistId)).map((s) => s.id)
          );
          setSelectedServiceIds(assigned);
          setInitialServiceIds(assigned);
        }
      })
      .catch(() => {
        // El resto del formulario sigue siendo usable sin la lista de
        // servicios; se avisa donde iría el selector.
        if (active) setServices([]);
      });
    return () => {
      active = false;
    };
  }, [code, artistId]);

  // Horario laboral semanal. En alta arranca con el default del backend; en
  // edición se carga lo que ya tiene. Ver DEFAULT_WEEKLY_AVAILABILITY.
  const [schedule, setSchedule] = useState<Record<number, DaySchedule>>(defaultSchedule);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  useEffect(() => {
    if (!artistId) return;
    let active = true;
    fetchArtistAvailability(code, artistId)
      .then((windows) => {
        if (active) setSchedule(scheduleFromWindows(windows));
      })
      .catch(() => {
        if (active) setScheduleError("No pudimos cargar los horarios de este tatuador.");
      });
    return () => {
      active = false;
    };
  }, [code, artistId]);

  function updateDay(dayOfWeek: number, patch: Partial<DaySchedule>) {
    setSchedule((current) => ({ ...current, [dayOfWeek]: { ...current[dayOfWeek], ...patch } }));
  }

  function scheduleToWindows(): WeeklyAvailabilityWindow[] {
    return WEEKDAYS.filter(({ value }) => schedule[value].enabled).map(({ value }) => ({
      dayOfWeek: value,
      startTime: schedule[value].startTime,
      endTime: schedule[value].endTime,
    }));
  }

  function toggleService(serviceId: string) {
    setSelectedServiceIds((current) => {
      const next = new Set(current);
      if (next.has(serviceId)) next.delete(serviceId);
      else next.add(serviceId);
      return next;
    });
  }

  async function syncArtistServices(id: string) {
    const toAssign = [...selectedServiceIds].filter((serviceId) => !initialServiceIds.has(serviceId));
    const toUnassign = [...initialServiceIds].filter((serviceId) => !selectedServiceIds.has(serviceId));
    await Promise.all([
      ...toAssign.map((serviceId) => assignServiceToArtist(code, id, serviceId)),
      ...toUnassign.map((serviceId) => unassignServiceFromArtist(code, id, serviceId)),
    ]);
  }

  // Solo el blob local (creado acá al elegir un archivo) necesita
  // revocarse — el previewUrl inicial, si viene de target.imageUrl, es una
  // URL del backend y no nos pertenece.
  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setImageFile(file);
    if (file) setPreviewUrl(URL.createObjectURL(file));
  }

  function addTag() {
    const value = tagInput.trim();
    if (value && !specialties.includes(value)) {
      setSpecialties([...specialties, value]);
    }
    setTagInput("");
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    }
  }

  function removeTag(tag: string) {
    setSpecialties(specialties.filter((t) => t !== tag));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    const invalidDay = WEEKDAYS.find(
      ({ value }) => schedule[value].enabled && schedule[value].endTime <= schedule[value].startTime
    );
    if (invalidDay) {
      // Comparar "HH:mm" como string alcanza: con cero a la izquierda el
      // orden lexicográfico coincide con el cronológico.
      setError(`El horario del ${invalidDay.label.toLowerCase()} termina antes de empezar.`);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      // El alta tiene que ir primero: las asignaciones necesitan el id que
      // recién existe después de crear al tatuador.
      let savedId: string;
      if (isNew) {
        const created = await createAdminArtist(code, {
          name: name.trim(),
          bio: bio.trim() || undefined,
          specialties,
          image: imageFile,
        });
        savedId = created.id;
      } else {
        await updateAdminArtist(code, target.id, {
          name: name.trim(),
          bio: bio.trim(),
          specialties,
          active,
          image: imageFile,
        });
        savedId = target.id;
      }
      await Promise.all([syncArtistServices(savedId), setArtistAvailability(code, savedId, scheduleToWindows())]);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos guardar al tatuador. Probá de nuevo.");
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
        className="custom-scrollbar clip-notch max-h-[90vh] w-full max-w-md overflow-y-auto border-2 border-plum bg-panel p-6"
      >
        <h3 className="mb-5 font-display text-lg text-bone">
          {isNew ? "Nuevo tatuador" : `Editar a ${target.name}`}
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

          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-ash">
            Bio
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={1000}
              rows={3}
              className="border-2 border-plum bg-ink px-3 py-2 text-sm text-bone"
            />
          </label>

          <div className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-ash">
            Especialidades
            <div className="flex flex-wrap gap-2 border-2 border-plum bg-ink p-2">
              {specialties.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1.5 border border-toxic px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-toxic"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="text-toxic hover:text-gore"
                    aria-label={`Quitar ${tag}`}
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                onBlur={addTag}
                placeholder="Escribí y presioná Enter"
                className="min-w-[140px] flex-1 bg-transparent px-1 py-1 text-sm normal-case tracking-normal text-bone outline-none"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-ash">
            Horario semanal
            {scheduleError ? (
              <p className="border-2 border-gore bg-ink px-3 py-2 text-sm normal-case tracking-normal text-bone">
                {scheduleError}
              </p>
            ) : (
              <div className="flex flex-col gap-1.5 border-2 border-plum bg-ink p-3">
                {WEEKDAYS.map(({ value, label }) => (
                  <div key={value} className="flex items-center gap-2">
                    <label className="flex w-32 shrink-0 items-center gap-2 text-sm normal-case tracking-normal text-bone">
                      <input
                        type="checkbox"
                        checked={schedule[value].enabled}
                        onChange={(e) => updateDay(value, { enabled: e.target.checked })}
                        className="h-4 w-4 accent-gore"
                      />
                      {label}
                    </label>
                    <input
                      type="time"
                      value={schedule[value].startTime}
                      disabled={!schedule[value].enabled}
                      onChange={(e) => updateDay(value, { startTime: e.target.value })}
                      aria-label={`${label}: hora de inicio`}
                      className="border-2 border-plum bg-ink px-2 py-1 text-sm text-bone disabled:opacity-30"
                    />
                    <span className="text-sm text-ashLight">a</span>
                    <input
                      type="time"
                      value={schedule[value].endTime}
                      disabled={!schedule[value].enabled}
                      onChange={(e) => updateDay(value, { endTime: e.target.value })}
                      aria-label={`${label}: hora de fin`}
                      className="border-2 border-plum bg-ink px-2 py-1 text-sm text-bone disabled:opacity-30"
                    />
                  </div>
                ))}
              </div>
            )}
            <span className="normal-case tracking-normal text-ashLight">
              Sin ningún día tildado el tatuador no tiene turnos disponibles.
            </span>
          </div>

          {/*
            La asignación tatuador↔servicio vive acá y no en la pestaña
            Servicios porque "qué hago" es parte del perfil del tatuador —
            queda al lado de sus especialidades, y espeja el orden del wizard
            de reserva (primero elegís tatuador, después ves sus servicios).
            La pestaña Servicios queda para definir el servicio en sí
            (duración, seña), que no depende de quién lo haga.
          */}
          <div className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-ash">
            Servicios que ofrece
            {services === null ? (
              <p className="border-2 border-plum bg-ink px-3 py-2 text-sm normal-case tracking-normal text-ashLight">
                Cargando servicios…
              </p>
            ) : services.length === 0 ? (
              <p className="border-2 border-plum bg-ink px-3 py-2 text-sm normal-case tracking-normal text-ashLight">
                No hay servicios cargados todavía. Creá alguno en la pestaña Servicios.
              </p>
            ) : (
              <div className="flex flex-col gap-2 border-2 border-plum bg-ink p-3">
                {services.map((service) => (
                  <label
                    key={service.id}
                    className="flex items-center gap-2 text-sm normal-case tracking-normal text-bone"
                  >
                    <input
                      type="checkbox"
                      checked={selectedServiceIds.has(service.id)}
                      onChange={() => toggleService(service.id)}
                      className="h-4 w-4 accent-gore"
                    />
                    <span>{service.name}</span>
                    <span className="text-xs text-ashLight">({formatDuration(service.durationMinutes)})</span>
                    {service.requiresDeposit && (
                      <span className="border border-toxic px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-toxic">
                        Seña
                      </span>
                    )}
                    {!service.active && (
                      <span className="border border-ash px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ash">
                        Inactivo
                      </span>
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>

          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-ash">
            Foto
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="border-2 border-plum bg-ink px-3 py-2 text-sm text-bone file:mr-3 file:border-0 file:bg-plum file:px-3 file:py-1.5 file:text-xs file:font-bold file:uppercase file:text-bone"
            />
          </label>

          {previewUrl && (
            <div className="relative aspect-square w-32 overflow-hidden border-2 border-plum">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="Vista previa" className="h-full w-full object-cover" />
            </div>
          )}

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
