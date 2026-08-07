"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { resolveAssetUrl, type GalleryImage } from "@/lib/api";

/**
 * Cuántas fotos se cargan con prioridad. Las que entran en pantalla sin hacer
 * scroll tienen que estar; el resto va diferido, que es el default de
 * next/image. Cuatro columnas por dos filas cubre el peor caso (escritorio
 * ancho) sin pedir de más en un celular.
 */
const EAGER_COUNT = 8;

/** Proporción de reserva cuando la foto no tiene medidas guardadas. */
const FALLBACK_ASPECT = 1;

function aspectOf(image: GalleryImage): number {
  if (!image.width || !image.height) return FALLBACK_ASPECT;
  return image.width / image.height;
}

export default function GalleryGrid({ images }: { images: GalleryImage[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  // Si cambia el filtro, el índice abierto ya no apunta a la misma foto —
  // podría incluso quedar fuera de rango. El lightbox se cierra.
  useEffect(() => {
    setOpenIndex(null);
  }, [images]);

  if (images.length === 0) {
    return (
      <p className="border-2 border-plum bg-panel p-8 text-center text-sm text-ashLight">
        No hay trabajos que coincidan con este filtro.
      </p>
    );
  }

  return (
    <>
      {/* Masonry con columnas de CSS: el navegador reparte los hijos entre las
          columnas y cada foto conserva su alto natural. break-inside-avoid es
          lo que impide que una foto se parta al medio entre dos columnas. */}
      <div className="columns-2 gap-3 sm:columns-3 lg:columns-4">
        {images.map((image, index) => {
          const src = resolveAssetUrl(image.imageUrl)!;
          return (
            <button
              key={image.id}
              type="button"
              onClick={() => setOpenIndex(index)}
              className="group mb-3 block w-full break-inside-avoid overflow-hidden border-2 border-plum bg-panel text-left outline-none ring-gore focus-visible:ring-2"
              aria-label={`Ampliar${image.artist ? ` trabajo de ${image.artist.name}` : " trabajo"}`}
            >
              <div className="relative w-full" style={{ aspectRatio: String(aspectOf(image)) }}>
                <Image
                  src={src}
                  alt={image.caption ?? (image.artist ? `Trabajo de ${image.artist.name}` : "Trabajo del estudio")}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  // Las primeras entran en pantalla sin scroll: pedirlas
                  // diferidas las haría aparecer tarde justo donde más se nota.
                  priority={index < EAGER_COUNT}
                  loading={index < EAGER_COUNT ? "eager" : "lazy"}
                />
              </div>
              {(image.artist || image.caption) && (
                <div className="px-2.5 py-2">
                  {image.artist && (
                    <div className="text-[11px] font-semibold uppercase tracking-[1.5px] text-toxic">
                      {image.artist.name}
                    </div>
                  )}
                  {image.caption && (
                    <p className="mt-0.5 text-[11px] leading-snug text-ash">{image.caption}</p>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {openIndex !== null && (
        <Lightbox
          images={images}
          index={openIndex}
          onIndexChange={setOpenIndex}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </>
  );
}

/**
 * Mismo patrón que ReservationModal: foco inicial adentro, trampa de foco con
 * Tab, cierre con Escape, scroll del body bloqueado y foco devuelto al cerrar.
 * Se suma navegación con flechas, que acá es lo que uno espera de una galería.
 *
 * Recorre EXACTAMENTE la lista que recibe, que es la ya filtrada: si alguien
 * filtró por un tatuador, las flechas no lo sacan de ese subconjunto.
 */
function Lightbox({
  images,
  index,
  onIndexChange,
  onClose,
}: {
  images: GalleryImage[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  // Se guarda al montar para devolver el foco a la miniatura al cerrar; sin
  // esto el foco vuelve al <body> y quien navega con teclado pierde el lugar.
  const triggerRef = useRef<HTMLElement | null>(null);

  const image = images[index];

  const go = useCallback(
    (delta: number) => {
      // Da la vuelta a propósito: en una galería, seguir apretando la flecha
      // al llegar al final y que no pase nada se siente como algo roto.
      onIndexChange((index + delta + images.length) % images.length);
    },
    [index, images.length, onIndexChange]
  );

  useEffect(() => {
    triggerRef.current = document.activeElement as HTMLElement | null;
    return () => triggerRef.current?.focus?.();
  }, []);

  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  useEffect(() => {
    closeButtonRef.current?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        go(1);
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(-1);
        return;
      }

      if (e.key !== "Tab" || !panelRef.current) return;

      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute("disabled"));
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [go, onClose]);

  const src = resolveAssetUrl(image.imageUrl)!;
  const aspect = aspectOf(image);

  return (
    <div
      // z-[200] y no z-50: es la capa que el proyecto usa para los modales
      // públicos (misma que ReservationModal). Con z-50 el lightbox quedaba
      // POR DEBAJO de la navbar, que es sticky en z-[100], y la barra se veía
      // encima de la foto ampliada.
      className="fixed inset-0 z-[200] flex items-center justify-center bg-ink/95 p-4"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Trabajo ${index + 1} de ${images.length}`}
        // El click en la foto no cierra: solo el del fondo. Cerrar al tocar la
        // imagen que se está mirando es de las cosas más molestas que puede
        // hacer un lightbox.
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-full w-full max-w-4xl flex-col gap-3"
      >
        <div className="flex items-center justify-between gap-4">
          <span className="font-mono text-xs text-ash">
            {index + 1} / {images.length}
          </span>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="border-2 border-ash px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-bone outline-none ring-gore focus-visible:ring-2"
          >
            Cerrar
          </button>
        </div>

        <div className="relative min-h-0 flex-1">
          <div
            className="relative mx-auto max-h-[70vh] w-full"
            style={{ aspectRatio: String(aspect) }}
          >
            <Image
              src={src}
              alt={image.caption ?? (image.artist ? `Trabajo de ${image.artist.name}` : "Trabajo del estudio")}
              fill
              sizes="(max-width: 1024px) 100vw, 900px"
              className="object-contain"
              priority
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => go(-1)}
            className="border-2 border-ash px-4 py-2 text-xs font-bold uppercase tracking-wide text-bone outline-none ring-gore focus-visible:ring-2"
            aria-label="Trabajo anterior"
          >
            ←
          </button>

          <div className="min-w-0 flex-1 text-center">
            {image.artist && (
              <div className="truncate text-xs font-semibold uppercase tracking-[1.5px] text-toxic">
                {image.artist.name}
              </div>
            )}
            {image.caption && (
              <p className="mt-1 truncate text-xs text-ashLight">{image.caption}</p>
            )}
            {image.styles.length > 0 && (
              <p className="mt-1 truncate font-mono text-[10px] uppercase text-ash">
                {image.styles.join(" · ")}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => go(1)}
            className="border-2 border-ash px-4 py-2 text-xs font-bold uppercase tracking-wide text-bone outline-none ring-gore focus-visible:ring-2"
            aria-label="Trabajo siguiente"
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}
