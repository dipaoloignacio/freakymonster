"use client";

import { useEffect, useState } from "react";
import { ApiError, resolveAssetUrl } from "@/lib/api";
import {
  createAdminArtist,
  deactivateAdminArtist,
  fetchAdminArtists,
  updateAdminArtist,
  type AdminArtist,
} from "@/lib/adminApi";
import { ErrorBox, Spinner } from "@/components/reservation/shared";

type FormTarget = "new" | AdminArtist;

export function ArtistsTab({ code }: { code: string }) {
  const [artists, setArtists] = useState<AdminArtist[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formTarget, setFormTarget] = useState<FormTarget | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<AdminArtist | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

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
    try {
      await deactivateAdminArtist(code, deactivateTarget.id);
      setDeactivateTarget(null);
      await loadArtists();
    } catch {
      setActionError("No pudimos desactivar al tatuador. Probá de nuevo.");
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
                    className="border border-gore px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-gore transition-colors hover:bg-gore hover:text-ink"
                  >
                    Desactivar
                  </button>
                )}
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
    setSubmitting(true);
    setError(null);
    try {
      if (isNew) {
        await createAdminArtist(code, {
          name: name.trim(),
          bio: bio.trim() || undefined,
          specialties,
          image: imageFile,
        });
      } else {
        await updateAdminArtist(code, target.id, {
          name: name.trim(),
          bio: bio.trim(),
          specialties,
          active,
          image: imageFile,
        });
      }
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
        className="clip-notch max-h-[90vh] w-full max-w-md overflow-y-auto border-2 border-plum bg-panel p-6"
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
