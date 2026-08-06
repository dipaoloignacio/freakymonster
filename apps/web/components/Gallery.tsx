"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import AutoScroll from "embla-carousel-auto-scroll";
import { gallery } from "@/data/content";
import NoiseHeading from "./NoiseHeading";
import { Reveal, STAGGER_STEP } from "@/components/motion/Reveal";
import FourPointStar from "./doodles/FourPointStar";
import HandUnderline from "./doodles/HandUnderline";

// Pixels per animation frame — this is a continuous scroll, not a
// step-then-pause slideshow, so it's tuned low for a slow, ambient
// crawl rather than a race. Adjust to taste.
const SCROLL_SPEED = 1;

type GalleryPiece = {
  label: string;
  image?: string;
};

type Slide = { kind: "piece"; piece: GalleryPiece } | { kind: "cta" };

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

function buildSlides(pieces: GalleryPiece[], ctaAfterIndex?: number): Slide[] {
  const repeated = Array.from({ length: ROW_REPEATS }, () => pieces).flat();
  const slides: Slide[] = repeated.map((piece) => ({ kind: "piece", piece }));
  if (ctaAfterIndex !== undefined) {
    slides.splice(ctaAfterIndex + 1, 0, { kind: "cta" });
  }
  return slides;
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
function GalleryCell({ piece }: { piece: GalleryPiece }) {
  return (
    <div className="shrink-0 ps-3.5">
      <div
        dir="ltr"
        className="texture-panel relative flex aspect-square w-[240px] items-end overflow-hidden"
      >
        {piece.image && (
          <Image
            src={piece.image}
            alt={piece.label}
            fill
            sizes="240px"
            className="object-cover"
          />
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-ink/90 to-transparent" />
        <span className="relative z-10 p-3 font-mono text-[11px] uppercase tracking-wide text-ash">
          {piece.label}
        </span>
      </div>
    </div>
  );
}

function CtaCell() {
  return (
    <div className="shrink-0 ps-3.5">
      <a
        dir="ltr"
        href="#contacto"
        className="clip-notch flex aspect-square w-[240px] flex-col items-center justify-center gap-3 border-2 border-toxic bg-gore text-center no-underline"
      >
        <span className="text-sm font-bold uppercase tracking-[1.5px] text-ink">
          Ver más trabajos
        </span>
        <span aria-hidden className="text-2xl leading-none text-ink">
          →
        </span>
      </a>
    </div>
  );
}

function CarouselRow({
  pieces,
  reverse = false,
  ctaAfterIndex,
  reducedMotion,
}: {
  pieces: GalleryPiece[];
  reverse?: boolean;
  ctaAfterIndex?: number;
  reducedMotion: boolean;
}) {
  const [autoScroll] = useState(() =>
    AutoScroll({
      speed: SCROLL_SPEED,
      stopOnInteraction: false,
      stopOnMouseEnter: true,
    })
  );

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, dragFree: true, direction: reverse ? "rtl" : "ltr" },
    reducedMotion ? [] : [autoScroll]
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

  const slides = buildSlides(pieces, ctaAfterIndex);

  return (
    <div
      ref={emblaRef}
      dir={reverse ? "rtl" : "ltr"}
      className={`touch-pan-y overflow-hidden ${
        dragging ? "cursor-grabbing" : "cursor-grab"
      }`}
    >
      <div className="flex">
        {slides.map((slide, i) =>
          slide.kind === "cta" ? (
            <CtaCell key={`cta-${i}`} />
          ) : (
            <GalleryCell key={`${slide.piece.label}-${i}`} piece={slide.piece} />
          )
        )}
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
      className="relative border-b-2 border-plum py-16 md:py-24"
    >
      <div className="mx-auto max-w-5xl px-5 sm:px-10">
        <div className="mb-10 text-center sm:mb-14">
          <div className="mb-[14px] text-xs font-semibold uppercase tracking-[4px] text-toxic">
            Trabajos recientes
          </div>
          <NoiseHeading color="gore" className="text-[clamp(30px,4vw,46px)]">
            Galería
          </NoiseHeading>
          <HandUnderline className="mx-auto mt-2 h-3 w-[140px] text-gore" />
        </div>
      </div>
      {/* La cascada va por FILA y no por imagen, a diferencia de la sección de
          artistas. Las fotos viven adentro de un carrusel con auto-scroll y
          loop: entran y salen del viewport todo el tiempo, así que un
          whileInView por celda dispararía a destiempo mientras el carrusel
          avanza —y sobre los clones que Embla genera para el loop—, dando una
          cascada aleatoria en vez de una entrada. Animando la fila, la sección
          aparece una vez y el carrusel sigue su ritmo por su cuenta. */}
      <div className="flex flex-col gap-3.5">
        <Reveal>
          <CarouselRow pieces={row1} ctaAfterIndex={1} reducedMotion={reducedMotion} />
        </Reveal>
        <Reveal delay={STAGGER_STEP}>
          <CarouselRow pieces={row2} reverse reducedMotion={reducedMotion} />
        </Reveal>
      </div>
    </section>
  );
}
