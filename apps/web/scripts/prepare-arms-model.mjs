/**
 * Prepara public/models/arms_female.glb para la web. Se corre a mano cuando
 * cambia el modelo fuente, no en cada build:
 *
 *   node scripts/prepare-arms-model.mjs
 *
 * El archivo que bajamos de Sketchfab NO se puede usar tal cual. Dos motivos,
 * los dos medidos sobre el archivo real:
 *
 * 1. MATERIAL. El .glb declara KHR_materials_pbrSpecularGlossiness en
 *    `extensionsRequired`, y three.js sacó el soporte de esa extensión: en
 *    r0.180 el GLTFLoader no la conoce. Y no explota —que sería más fácil de
 *    notar—, tira un `THREE.GLTFLoader: Unknown extension` por consola, sigue
 *    de largo y arma un MeshStandardMaterial vacío. O sea: el modelo carga,
 *    se ve, y el color de piel simplemente no está. La textura difusa de
 *    2048x2048 queda en el archivo sin que nadie la use.
 *
 *    metalRough() reescribe el material al modelo metallic-roughness del core
 *    de glTF, que sí es el que three entiende.
 *
 * 2. PESO. 3.89 MB de los 5.19 MB del archivo son tres PNG de 2048x2048. Para
 *    algo que se carga en el celular de quien está por sacar un turno, eso es
 *    demasiado. Pasarlos a WebP baja el archivo sin tocar la geometría.
 *
 * El original queda como está: la salida va a otro nombre y es esa la que
 * carga la app. Así se puede volver a correr esto contra el fuente cuando haga
 * falta, y se ve en el diff qué cambió.
 *
 * CRÉDITO: el modelo es CC-BY 4.0 de "BG_3D bank" (Sketchfab) y la licencia
 * obliga a atribuir. Ver README del previsualizador — todavía sin resolver
 * dónde va en la UI.
 */
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { metalRough, prune, textureCompress } from "@gltf-transform/functions";
import sharp from "sharp";
import { statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(here, "../public/models/arms_female.glb");
const OUT = path.join(here, "../public/models/arms_female.web.glb");

const mb = (p) => (statSync(p).size / 1024 / 1024).toFixed(2);

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(SRC);

console.log(`entrada : ${mb(SRC)} MB`);
console.log(`  requeridas: ${doc.getRoot().listExtensionsRequired().map((e) => e.extensionName).join(", ") || "-"}`);

await doc.transform(
  metalRough(),
  // El normal map va en WebP SIN PÉRDIDA y no lossy: no es color, es dato
  // geométrico —cada píxel es un vector— y los artefactos de un códec con
  // pérdida ahí se leen como relieve que no existe. Lossless igual gana bastante
  // contra PNG porque este mapa es muy suave, casi todo el plano lavanda.
  // Y a 1024²: a 2048 el normal map era 1.1 MB de los 2.5 MB del archivo, o sea
  // la mitad del peso en el mapa que menos detalle tiene. Los tres mapas de este
  // modelo son de muy baja frecuencia —manchones suaves, sin poros ni arrugas—,
  // así que la mitad de resolución no se nota; lo que sí se notaba era esperar
  // un mega de más en el celular.
  textureCompress({
    encoder: sharp,
    targetFormat: "webp",
    slots: /^normal/,
    lossless: true,
    resize: [1024, 1024],
  }),
  // El resto sí tolera lossy: son mapas de baja frecuencia (la difusa son
  // manchones de piel, sin poros ni detalle fino).
  //
  // Los slots `specular*` NO son de adorno en esta lista. metalRough() no
  // traduce el spec-gloss solo a metallic-roughness: también escupe
  // KHR_materials_specular + KHR_materials_ior y cuelga ahí el mapa especular
  // viejo. Sin nombrarlos acá, ese mapa se queda en PNG —y encima re-encodeado
  // más grande que el original, 759 KB → 1271 KB—, y prune() tampoco lo saca
  // porque la extensión sí lo referencia: no es huérfano, es un slot que no
  // estábamos mirando.
  textureCompress({
    encoder: sharp,
    targetFormat: "webp",
    slots: /^(baseColor|metallicRoughness|occlusion|emissive|specular|specularColor)/,
  }),
  // prune() va ÚLTIMO y no apenas después de metalRough(): ahí todavía queda
  // colgada la difusa vieja del spec-gloss, 1271 KB que nadie apunta pero que
  // igual se escriben al archivo. Corriéndolo al final se va.
  //
  // De paso hace algo que no esperaba y conviene: la textura
  // metallic-roughness que arma metalRough() es un verde plano —glossiness
  // uniforme en todo el modelo—, así que prune() la reemplaza por los escalares
  // equivalentes (metallicFactor 0, roughnessFactor 0.6) y se ahorra el mapa
  // entero. Mismo resultado visual, una textura menos.
  prune(),
);

await io.write(OUT, doc);

console.log(`salida  : ${mb(OUT)} MB`);
console.log(`  requeridas: ${doc.getRoot().listExtensionsRequired().map((e) => e.extensionName).join(", ") || "(ninguna)"}`);
for (const t of doc.getRoot().listTextures()) {
  const s = t.getSize();
  console.log(`  ${String(t.getName() || "(sin nombre)").padEnd(18)} ${s?.[0]}x${s?.[1]} ${t.getMimeType().padEnd(10)} ${(t.getImage().byteLength / 1024).toFixed(0)} KB`);
}
