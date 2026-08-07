/**
 * Genera diseños DE RELLENO para probar el previsualizador:
 *
 *   node scripts/make-placeholder-designs.mjs
 *
 * Por qué existe esto: el previsualizador necesita arte plano con canal alpha
 * —líneas negras sobre transparente— y eso HOY NO EXISTE en el repo. Lo que hay
 * en public/gallery/ son fotos de tatuajes ya hechos sobre piel (lo verifiqué:
 * los cinco PNG tienen alpha pero opaco de punta a punta, alpha_min=255). Usar
 * una de esas como decal proyectaría la foto del brazo de otra persona encima
 * del modelo.
 *
 * Así que estos tres son de relleno, en la línea gráfica de los doodles del
 * sitio (components/doodles/), y se van cuando haya flash real del estudio.
 * El previsualizador no depende de ellos: lee lo que haya en data/designs.ts.
 */
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, "../public/designs");
mkdirSync(OUT, { recursive: true });

// Trazo grueso a propósito: un decal se ve a ~8 cm sobre una malla curva y con
// líneas finas se deshace. El flash real conviene que siga el mismo criterio.
const INK = "#0d0b0a";

const designs = {
  daga: `
    <g fill="none" stroke="${INK}" stroke-width="16" stroke-linejoin="round" stroke-linecap="round">
      <path d="M256 40 L330 300 L310 620 L256 680 L202 620 L182 300 Z"/>
      <path d="M256 120 L256 600"/>
      <path d="M120 690 L392 690 L368 740 L144 740 Z" fill="${INK}"/>
      <path d="M224 745 L288 745 L288 880 L224 880 Z"/>
      <circle cx="256" cy="925" r="34" fill="${INK}"/>
    </g>`,
  ojo: `
    <g fill="none" stroke="${INK}" stroke-width="18" stroke-linejoin="round" stroke-linecap="round">
      <path d="M40 256 C 140 110, 372 110, 472 256 C 372 402, 140 402, 40 256 Z"/>
      <circle cx="256" cy="256" r="86"/>
      <circle cx="256" cy="256" r="34" fill="${INK}" stroke="none"/>
      <path d="M96 150 L140 190"/><path d="M256 88 L256 140"/><path d="M416 150 L372 190"/>
      <path d="M96 362 L140 322"/><path d="M256 424 L256 372"/><path d="M416 362 L372 322"/>
    </g>`,
  rayo: `
    <g fill="${INK}" stroke="${INK}" stroke-width="14" stroke-linejoin="round">
      <path d="M300 40 L110 520 L240 520 L180 900 L400 400 L265 400 Z"/>
    </g>`,
};

const SIZE = { daga: [512, 1024], ojo: [512, 512], rayo: [512, 1024] };

for (const [name, body] of Object.entries(designs)) {
  const [w, h] = SIZE[name];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 ${name === "ojo" ? 512 : 1024}" width="${w}" height="${h}">${body}</svg>`;
  const file = path.join(OUT, `${name}.png`);
  // El fondo transparente no es un detalle: es lo que hace que el decal se lea
  // como tinta sobre la piel y no como una calcomanía con recuadro.
  await sharp(Buffer.from(svg), { density: 300 })
    .resize(w, h, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(file);
  console.log(`${name}.png  ${w}x${h}`);
}
