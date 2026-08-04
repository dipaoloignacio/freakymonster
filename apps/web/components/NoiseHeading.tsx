"use client";

import {
  useEffect,
  useState,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from "react";

type NoiseColor = "gore" | "toxic";

// oklch(0.65 0.24 350) / oklch(0.72 0.19 142) sampled to sRGB
const BRAND_RGB: Record<NoiseColor, [number, number, number]> = {
  gore: [240, 52, 163],
  toxic: [81, 193, 72],
};

const SOLID: Record<NoiseColor, string> = {
  gore: "oklch(0.65 0.24 350)",
  toxic: "oklch(0.72 0.19 142)",
};

// Small on purpose: displayed 1:1 via backgroundSize below, so the
// browser never has to scale it down (that averaging is what flattened
// the original SVG-filter version into a solid color).
const GRAIN_SIZE = 24;
const MIN_ALPHA = 130;
const ALPHA_RANGE = 125;
const FRAME_COUNT = 8;
const FRAME_INTERVAL_MS = 100;

function renderNoiseFrame(color: NoiseColor): string | null {
  const canvas = document.createElement("canvas");
  canvas.width = GRAIN_SIZE;
  canvas.height = GRAIN_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const [r, g, b] = BRAND_RGB[color];
  const imageData = ctx.createImageData(GRAIN_SIZE, GRAIN_SIZE);
  for (let i = 0; i < imageData.data.length; i += 4) {
    imageData.data[i] = r;
    imageData.data[i + 1] = g;
    imageData.data[i + 2] = b;
    imageData.data[i + 3] = MIN_ALPHA + Math.floor(Math.random() * ALPHA_RANGE);
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
}

// Frame generation (canvas + toDataURL) is the expensive part, so it
// happens once per color, not once per <NoiseHeading> instance. All
// "gore" headings share the same 8 precomputed frames, all "toxic"
// headings share the other 8 — cycling only ever swaps a string.
const frameCache: Partial<Record<NoiseColor, string[]>> = {};

function getNoiseFrames(color: NoiseColor): string[] {
  const cached = frameCache[color];
  if (cached) return cached;
  const frames = Array.from({ length: FRAME_COUNT }, () => renderNoiseFrame(color)).filter(
    (frame): frame is string => frame !== null
  );
  frameCache[color] = frames;
  return frames;
}

export default function NoiseHeading({
  children,
  color,
  as: Tag = "h2",
  className = "",
}: {
  children: ReactNode;
  color: NoiseColor;
  as?: ElementType;
  className?: string;
}) {
  // Before frames are ready (first paint / no JS) we still show the
  // solid brand color so the heading is never invisible.
  const [frameUrl, setFrameUrl] = useState<string | null>(null);

  useEffect(() => {
    const frames = getNoiseFrames(color);
    if (frames.length === 0) return;

    setFrameUrl(frames[0]);

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reducedMotion) return;

    let i = 0;
    const id = window.setInterval(() => {
      i = (i + 1) % frames.length;
      setFrameUrl(frames[i]);
    }, FRAME_INTERVAL_MS);

    return () => window.clearInterval(id);
  }, [color]);

  // Only backgroundImage ever changes after mount — everything else here
  // is constant per render, so ticking never touches layout, only paint.
  const style: CSSProperties = {
    backgroundImage: frameUrl
      ? `url("${frameUrl}")`
      : `linear-gradient(${SOLID[color]}, ${SOLID[color]})`,
    backgroundSize: frameUrl ? `${GRAIN_SIZE}px ${GRAIN_SIZE}px` : undefined,
    backgroundRepeat: frameUrl ? "repeat" : undefined,
    imageRendering: frameUrl ? "pixelated" : undefined,
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    color: "transparent",
    WebkitTextFillColor: "transparent",
  };

  return (
    <Tag
      className={`font-heading font-normal uppercase tracking-wide ${className}`}
      style={style}
    >
      {children}
    </Tag>
  );
}
