"use client";

import { useEffect, useState } from "react";
import { ApiError, resolveAssetUrl } from "@/lib/api";
import {
  createAdminGalleryImage,
  deactivateAdminGalleryImage,
  deleteAdminGalleryImage,
  fetchAdminArtists,
  fetchAdminGalleryImages,
  updateAdminGalleryImage,
  type AdminArtist,
  type AdminGalleryImage,
} from "@/lib/adminApi";
import { ErrorBox, Spinner, BUTTON_SPINNER, SpinnerCircle } from "@/components/reservation/shared";

type FormTarget = "new" | AdminGalleryImage;

export function GalleryTab({ code }: { code: string }) {
  const [images, setImages] = useState<AdminGalleryImage[] | null>(null);
  const [artists, setArtists] = useState<AdminArtist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formTarget, setFormTarget] = useState<FormTarget | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminGalleryImage | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      // Los tatuadores se piden junto con las fotos porque el formulario los
      // necesita para el desplegable: sin ellos el alta no se puede completar.
      const [galleryImages, allArtists] = await Promise.all([
        fetchAdminGalleryImages(code),
        fetchAdminArtists(code),
      ]);
      setImages(galleryImages);
      setArtists(allArtists);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos cargar la galería");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  async function handleToggleActive(image: AdminGalleryImage) {
    setBusyId(image.id);
    setActionError(null);
    try {
      if (image.active) {
        await deactivateAdminGalleryImage(code, image.id);
      } else {
        await updateAdminGalleryImage(code, image.id, { active: true });
      }
      await load();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "No pudimos actualizar la foto");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(image: AdminGalleryImage) {
    setBusyId(image.id);
    setActionError(null);
    try {
      await deleteAdminGalleryImage(code, image.id);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "No pudimos borrar la foto");
    } finally {
      setBusyId(null);
    }
  }

  if (formTarget) {
    return (
      <GalleryImageForm
        code={code}
        target={formTarget}
        artists={artists}
        onDone={async () => {
          setFormTarget(null);
          await load();
        }}
        onCancel={() => setFormTarget(null)}
      />
    );
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-4">
        <p className="text-sm text-ashLight">
          Fotos de trabajos. Las activas se ven en{" "}
          <span className="font-mono text-toxic">/galeria</span>.
        </p>
        <button
          type="button"
          onClick={() => setFormTarget("new")}
          className="clip-notch-sm shrink-0 bg-gore px-4 py-2 text-xs font-bold uppercase tracking-wide text-ink"
        >
          Subir foto
        </button>
      </div>

      {actionError && (
        <div className="mb-4">
          <ErrorBox message={actionError} />
        </div>
      )}

      {loading && <Spinner label="Cargando galería…" />}
      {!loading && error && <ErrorBox message={error} onRetry={load} />}

      {!loading && !error && images && images.length === 0 && (
        <p className="border-2 border-plum bg-panel p-5 text-center text-sm text-ashLight">
          Todavía no hay fotos cargadas.
        </p>
      )}

      {!loading && !error && images && images.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((image) => (
            <div
              key={image.id}
              className={`clip-notch-sm border-2 p-4 ${
                image.active ? "border-plum bg-panel" : "border-plum/40 bg-panel/40 opacity-60"
              }`}
            >
              <div className="relative mb-3 aspect-square overflow-hidden border-2 border-plum">
                {/* <img> y no next/image, igual que ArtistsTab: el panel no es
                    público, no compite por métricas de carga, y así no hay que
                    declarar el host de la API en next.config para el admin. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={resolveAssetUrl(image.imageUrl)!}
                  alt={image.caption ?? "Trabajo del estudio"}
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="mb-1 flex items-center gap-2">
                <span className="font-display text-base text-bone">
                  {image.artist?.name ?? "Sin tatuador"}
                </span>
                {!image.active && (
                  <span className="border border-ash px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ash">
                    Inactiva
                  </span>
                )}
              </div>

              {image.styles.length > 0 && (
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-[1.5px] text-toxic">
                  {image.styles.join(" / ")}
                </div>
              )}
              {image.caption && (
                <p className="mb-3 text-xs text-ashLight">{image.caption}</p>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setFormTarget(image)}
                  className="border border-toxic px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-toxic transition-colors hover:bg-toxic hover:text-ink"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleActive(image)}
                  disabled={busyId === image.id}
                  className="flex items-center gap-1.5 border border-ash px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-ash transition-colors hover:bg-ash hover:text-ink disabled:opacity-50"
                >
                  {busyId === image.id && <SpinnerCircle className={BUTTON_SPINNER} />}
                  {image.active ? "Desactivar" : "Activar"}
                </button>
                {/* Destructivo de verdad: relleno sólido, no contorno, para que
                    no se confunda con "Desactivar", que es reversible. Acá el
                    borrado ES definitivo — a diferencia de tatuadores, no hay
                    nada que obligue a degradarlo a desactivación. */}
                <button
                  type="button"
                  onClick={() => setDeleteTarget(image)}
                  className="bg-gore px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-ink transition-opacity hover:opacity-80"
                >
                  Borrar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-ink/80 p-5">
          <div className="clip-notch w-full max-w-md border-2 border-gore bg-panel p-5">
            <h3 className="mb-2 font-display text-lg text-bone">Borrar esta foto</h3>
            <p className="mb-5 text-sm text-ashLight">
              Se borra para siempre y no se puede deshacer. Si solo querés sacarla del sitio,
              usá <strong className="text-bone">Desactivar</strong>.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleDelete(deleteTarget)}
                disabled={busyId === deleteTarget.id}
                className="flex items-center gap-2 bg-gore px-4 py-2 text-xs font-bold uppercase tracking-wide text-ink disabled:opacity-50"
              >
                {busyId === deleteTarget.id && <SpinnerCircle className={BUTTON_SPINNER} />}
                Borrar
              </button>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="border-2 border-ash px-4 py-2 text-xs font-bold uppercase tracking-wide text-ash"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GalleryImageForm({
  code,
  target,
  artists,
  onDone,
  onCancel,
}: {
  code: string;
  target: FormTarget;
  artists: AdminArtist[];
  onDone: () => void | Promise<void>;
  onCancel: () => void;
}) {
  const isNew = target === "new";

  const [styles, setStyles] = useState<string[]>(isNew ? [] : target.styles);
  const [tagInput, setTagInput] = useState("");
  const [artistId, setArtistId] = useState<string>(isNew ? "" : (target.artistId ?? ""));
  const [caption, setCaption] = useState(isNew ? "" : (target.caption ?? ""));
  const [active, setActive] = useState(isNew ? true : target.active);
  const [imageFile, setImageFile] = useState<File | null>(null);
  // Medidas del archivo elegido. El masonry de /galeria las usa para reservar
  // el alto antes de que la foto cargue; medirlas acá sale gratis porque el
  // navegador ya decodifica la imagen para la vista previa.
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    isNew ? null : resolveAssetUrl(target.imageUrl)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Solo se ofrecen los activos para elegir. Pero si esta foto ya estaba
  // asignada a uno que después se desactivó, ese tiene que seguir apareciendo
  // en la lista o el <select> se quedaría sin la opción elegida y el formulario
  // le cambiaría el tatuador solo al guardar.
  const selectable = artists.filter(
    (a) => a.active || (!isNew && a.id === target.artistId)
  );

  // Las URLs de blob de la preview se liberan al desmontar; el previewUrl
  // inicial, si viene de target.imageUrl, no es un blob y no hay que tocarlo.
  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setImageFile(file);
    setDimensions(null);
    if (!file) return;

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    const probe = new window.Image();
    probe.onload = () => setDimensions({ width: probe.naturalWidth, height: probe.naturalHeight });
    // Si la medición falla se sube igual sin medidas: es un dato para mejorar
    // la carga, no un requisito. La página cae a proporción 1:1.
    probe.onerror = () => setDimensions(null);
    probe.src = url;
  }

  function addTag() {
    const value = tagInput.trim();
    if (value && !styles.includes(value)) {
      setStyles([...styles, value]);
    }
    setTagInput("");
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // El tag que quedó escrito sin confirmar cuenta igual: nadie espera perder
    // lo que tipeó por no haber apretado Enter antes de guardar.
    const pendingTag = tagInput.trim();
    const finalStyles = pendingTag && !styles.includes(pendingTag) ? [...styles, pendingTag] : styles;

    if (isNew && !imageFile) {
      setError("Elegí una imagen para subir");
      return;
    }

    setSaving(true);
    try {
      if (isNew) {
        await createAdminGalleryImage(code, {
          image: imageFile!,
          styles: finalStyles,
          artistId: artistId || null,
          caption: caption.trim() || null,
          ...(dimensions ?? {}),
        });
      } else {
        await updateAdminGalleryImage(code, target.id, {
          styles: finalStyles,
          artistId: artistId || null,
          caption: caption.trim() || null,
          active,
          image: imageFile,
          ...(imageFile && dimensions ? dimensions : {}),
        });
      }
      await onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos guardar la foto");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h3 className="mb-5 font-display text-lg text-bone">
        {isNew ? "Subir foto de trabajo" : "Editar foto"}
      </h3>

      {error && (
        <div className="mb-4">
          <ErrorBox message={error} />
        </div>
      )}

      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-ash">
          Foto {isNew && <span className="text-gore">(obligatoria)</span>}
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="border-2 border-plum bg-ink px-3 py-2 text-sm text-bone file:mr-3 file:border-0 file:bg-plum file:px-3 file:py-1.5 file:text-xs file:font-bold file:uppercase file:text-bone"
          />
        </label>

        {previewUrl && (
          <div className="relative aspect-square w-40 overflow-hidden border-2 border-plum">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="Vista previa" className="h-full w-full object-cover" />
          </div>
        )}

        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-ash">
          Tatuador
          <select
            value={artistId}
            onChange={(e) => setArtistId(e.target.value)}
            className="border-2 border-plum bg-ink px-3 py-2 text-sm normal-case tracking-normal text-bone"
          >
            <option value="">— Sin tatuador —</option>
            {selectable.map((artist) => (
              <option key={artist.id} value={artist.id}>
                {artist.name}
                {!artist.active ? " (inactivo)" : ""}
              </option>
            ))}
          </select>
          <span className="text-[10px] font-normal normal-case tracking-normal text-ash">
            Sin tatuador la foto no aparece cuando alguien filtra por tatuador.
          </span>
        </label>

        <div className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-ash">
          Estilos
          <div className="flex flex-wrap gap-2 border-2 border-plum bg-ink p-2">
            {styles.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1.5 border border-toxic px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-toxic"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => setStyles(styles.filter((t) => t !== tag))}
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
          <span className="text-[10px] font-normal normal-case tracking-normal text-ash">
            Los filtros de la página pública salen de acá — escribilos igual que en otras fotos.
          </span>
        </div>

        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-ash">
          Epígrafe (opcional)
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            maxLength={300}
            className="border-2 border-plum bg-ink px-3 py-2 text-sm normal-case tracking-normal text-bone"
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
            Activa (visible en /galeria)
          </label>
        )}
      </div>

      <div className="mt-6 flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="clip-notch-sm flex items-center gap-2 bg-gore px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-ink disabled:opacity-50"
        >
          {saving && <SpinnerCircle className={BUTTON_SPINNER} />}
          {isNew ? "Subir" : "Guardar"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="border-2 border-ash px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-ash"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
