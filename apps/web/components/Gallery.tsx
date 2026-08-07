"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import AutoScroll from "embla-carousel-auto-scroll";
import { gallery, galleryAspect } from "@/data/content";
import { Reveal, STAGGER_STEP } from "@/components/motion/Reveal";

// Pixels per animation frame — this is a continuous scroll, not a
// step-then-pause slideshow, so it's tuned low for a slow, ambient
// crawl rather than a race. Adjust to taste.
const SCROLL_SPEED = 1;

/**
 * Adónde va cada foto del collage.
 *
 * Se navega con <a> y no con next/link, igual que la Navbar (ver el comentario
 * ahí): importar Link en un componente de la home le suma el router de Next a
 * su bundle, +9 KB de First Load JS medidos. Acá pesa el doble que en otros
 * lados porque son nueve tarjetas, y ninguna gana nada con el prefetch: el
 * carrusel las mueve de lugar todo el tiempo.
 */
const GALLERY_HREF = "/galeria";

type GalleryPiece = {
  label: string;
  image?: string;
};

// Alternating split keeps both rows a similar length and mixed subject
// matter, rather than the first half of the list vs. the second half.
function splitIntoRows(pieces: GalleryPiece[]) {
  const row1: GalleryPiece[] = [];
  const row2: GalleryPiece[] = [];
  pieces.forEach((piece, i) => (i % 2 === 0 ? row1 : row2).push(piece));
  return [row1, row2] as const;
}

// A handful of gallery pieces per row (4-5) isn't enough content to
// overflow a wide viewport, so Embla has no distance left to scroll and
// autoplay/loop silently does nothing. Repeating the row guarantees
// there's always plenty of scrollable width, even on ultra-wide screens.
const ROW_REPEATS = 4;

/**
 * Alto de cada tarjeta como fracción de la altura de la fila, más a qué borde
 * se pega. Esto es lo que arma el mosaico: las proporciones reales de las fotos
 * van de 0,71 a 1,00 —todas entre retrato y cuadrado—, así que si cada tarjeta
 * ocupara el alto completo el resultado serían tarjetas casi iguales otra vez.
 *
 * Los valores están elegidos, no sorteados, por dos razones:
 *
 * 1. Math.random() en el render da un resultado distinto en el servidor y en el
 *    cliente, y React lo reporta como error de hidratación.
 * 2. Al azar salen rachas feas —tres altas seguidas, o un pozo de tres bajas—.
 *    Alternando alto/bajo y repartiendo los anclajes, cada tramo del carrusel
 *    queda equilibrado mire por donde se lo mire.
 */
type Variant = { scale: number; align: "start" | "center" | "end" };

/**
 * Las dos filas se anclan a bordes OPUESTOS: la de arriba cuelga del techo, la
 * de abajo se apoya en el piso. Así el bloque queda con los bordes de afuera
 * casi rectos y toda la irregularidad concentrada en la costura del medio, que
 * es lo que hace que se lea como un mosaico y no como tarjetas flotando sueltas.
 *
 * La primera versión repartía los anclajes (start/center/end) en las dos filas y
 * el resultado tenía huecos negros por todos lados: cada tarjeta flotaba en su
 * propia altura y el conjunto no cerraba como bloque.
 *
 * Cada fila lleva UNA excepción al ancla —la tarjeta marcada al revés— para que
 * el borde de afuera no quede perfectamente recto y siga habiendo un mordisco
 * asimétrico contra el Hero.
 */
const ROW_1_VARIANTS: Variant[] = [
  { scale: 1.0, align: "start" },
  { scale: 0.68, align: "start" },
  { scale: 0.86, align: "end" },
  { scale: 0.74, align: "start" },
  { scale: 0.94, align: "start" },
];

const ROW_2_VARIANTS: Variant[] = [
  { scale: 0.78, align: "end" },
  { scale: 1.0, align: "start" },
  { scale: 0.7, align: "end" },
  { scale: 0.9, align: "end" },
];

/**
 * La variante sale de la posición dentro del array de piezas y NO del índice en
 * la pista. Es lo que mantiene el loop prolijo: la pista son ROW_REPEATS copias
 * exactas de las piezas, así que atando el patrón a la posición dentro de la
 * copia, el patrón tiene período igual al largo de la copia y la pista entera
 * mide un número entero de períodos. Cuando Embla empalma el final con el
 * principio, la secuencia de alturas continúa como si nada.
 *
 * Atarlo al índice de la pista rompería eso en cuanto la cantidad de variantes
 * no divida a la cantidad de piezas: el período pasaría a ser el mínimo común
 * múltiplo y la costura mostraría un salto de alturas cada vuelta.
 */
function variantFor(
  variants: Variant[],
  indexInTrack: number,
  pieceCount: number,
): Variant {
  return variants[(indexInTrack % pieceCount) % variants.length];
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mql.matches);
    const onChange = () => setReduced(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

// Slide spacing is applied as padding-inline-start on each slide (Embla's
// documented pattern), not as a flex `gap` on the track — with `loop:
// true`, the container `gap` isn't replicated at the loop's wrap
// seam, which left exactly one card-to-card gap collapsed to 0 per row.
// It's a logical (not physical) property so it flips correctly on the
// reversed row, which renders `dir="rtl"` — a physical `pl` would keep
// padding on the same visual side in both rows, leaving one edge of the
// rtl row with no gap and the other with a doubled-up one.
function GalleryCell({
  piece,
  variant,
}: {
  piece: GalleryPiece;
  variant: Variant;
}) {
  const aspect = (piece.image && galleryAspect[piece.image]) || 1;

  return (
    <div
      className="flex h-full shrink-0 ps-2.5 sm:ps-3.5"
      style={{ alignItems: variant.align }}
    >
      <a
        href={GALLERY_HREF}
        dir="ltr"
        // La tarjeta ENTERA es el link, no un botón adentro: es lo que uno
        // intenta tocar cuando ve una foto que le interesa.
        aria-label={`${piece.label} — ver la galería completa`}
        className="texture-panel group relative block overflow-hidden no-underline outline-none ring-gore transition-transform duration-300 hover:scale-[1.02] focus-visible:ring-2"
        style={{
          // El alto sale de la fila y el ancho de la proporción real de la foto.
          // Al revés —ancho fijo, alto libre— habría que recortar cada imagen a
          // una caja que no es la suya.
          height: `calc(var(--row-h) * ${variant.scale})`,
          aspectRatio: String(aspect),
        }}
      >
        {piece.image && (
          <Image
            src={piece.image}
            alt={piece.label}
            fill
            sizes="(max-width: 640px) 45vw, 300px"
            className="object-cover"
          />
        )}
        {/* El rótulo aparece al pasar por encima. Fijo en las nueve tarjetas
            ensuciaba el collage, que es lo que se quiere mirar. El link igual
            tiene nombre accesible por aria-label, así que no depende del hover. */}
        <div className="pointer-events-none absolute inset-0 flex items-end bg-gradient-to-t from-ink/85 via-ink/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
          <span className="p-2.5 font-mono text-[10px] uppercase leading-tight tracking-wide text-bone">
            {piece.label}
          </span>
        </div>
      </a>
    </div>
  );
}

function CarouselRow({
  pieces,
  variants,
  reverse = false,
  reducedMotion,
}: {
  pieces: GalleryPiece[];
  variants: Variant[];
  reverse?: boolean;
  reducedMotion: boolean;
}) {
  const [autoScroll] = useState(() =>
    AutoScroll({
      speed: SCROLL_SPEED,
      stopOnInteraction: false,
      stopOnMouseEnter: true,
    }),
  );

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, dragFree: true, direction: reverse ? "rtl" : "ltr" },
    reducedMotion ? [] : [autoScroll],
  );

  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!emblaApi) return;
    const onDown = () => setDragging(true);
    const onUp = () => setDragging(false);
    emblaApi.on("pointerDown", onDown);
    emblaApi.on("pointerUp", onUp);
    return () => {
      emblaApi.off("pointerDown", onDown);
      emblaApi.off("pointerUp", onUp);
    };
  }, [emblaApi]);

  const slides = Array.from({ length: ROW_REPEATS }, () => pieces).flat();

  return (
    <div
      ref={emblaRef}
      dir={reverse ? "rtl" : "ltr"}
      className={`touch-pan-y overflow-hidden ${
        dragging ? "cursor-grabbing" : "cursor-grab"
      }`}
    >
      {/* La pista lleva alto fijo y las tarjetas se cuelgan de ahí. Sin un alto
          definido, la fila crecería hasta la tarjeta más alta y el anclaje
          (start/center/end) no tendría contra qué alinearse. */}
      <div className="flex h-[var(--row-h)] items-stretch">
        {slides.map((piece, i) => (
          <GalleryCell
            key={`${piece.label}-${i}`}
            piece={piece}
            variant={variantFor(variants, i, pieces.length)}
          />
        ))}
      </div>
    </div>
  );
}

export default function Gallery() {
  const reducedMotion = useReducedMotion();
  const [row1, row2] = splitIntoRows(gallery);

  return (
    <section
      id="galeria"
      className={[
        "relative border-b-2 border-plum pb-16 md:pb-24",
        // El collage se monta sobre el final del Hero. z-10 lo pone por encima
        // del fondo del Hero; el contenido del Hero (logo, texto, botones) lleva
        // z-20 y queda por arriba, así que las fotos invaden el aire de abajo
        // sin taparle nada.
        //
        // El solape va escalonado, y en mobile es CHICO a propósito. Medido con
        // los 96px de escritorio: en un iPhone SE (375x667) y en un Android de
        // 360x640, el borde de arriba del collage queda 14px POR ENCIMA del
        // borde de abajo del botón de WhatsApp. Ahí el Hero se comprime —logo,
        // párrafo y dos botones que envuelven a dos líneas— y el aire de abajo
        // desaparece. El botón se sigue pudiendo tocar gracias al z-20 del Hero,
        // pero se ve una foto montada arriba del CTA, que es feo y encima parece
        // un error.
        //
        // Con 24px el collage arranca pegado al borde del Hero sin invadir nada.
        // La invasión de verdad se ve de 640px para arriba, que es donde el Hero
        // tiene aire abajo para que se note.
        "z-10 -mt-6 sm:-mt-16 md:-mt-24",
        // Alto de la fila. Todo el mosaico se escala desde acá.
        "[--row-h:210px] sm:[--row-h:240px] md:[--row-h:300px]",
      ].join(" ")}
    >
      {/* La cascada va por FILA y no por imagen, a diferencia de la sección de
          artistas. Las fotos viven adentro de un carrusel con auto-scroll y
          loop: entran y salen del viewport todo el tiempo, así que un
          whileInView por celda dispararía a destiempo mientras el carrusel
          avanza —y sobre los clones que Embla genera para el loop—, dando una
          cascada aleatoria en vez de una entrada. Animando la fila, la sección
          aparece una vez y el carrusel sigue su ritmo por su cuenta. */}
      <div className="flex flex-col gap-2.5 sm:gap-3.5">
        <Reveal>
          <CarouselRow
            pieces={row1}
            variants={ROW_1_VARIANTS}
            reducedMotion={reducedMotion}
          />
        </Reveal>
        <Reveal delay={STAGGER_STEP}>
          <CarouselRow
            pieces={row2}
            variants={ROW_2_VARIANTS}
            reverse
            reducedMotion={reducedMotion}
          />
        </Reveal>
      </div>
    </section>
  );
}
