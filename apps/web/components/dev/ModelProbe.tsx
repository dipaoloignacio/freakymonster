"use client";

import { Suspense, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Bounds, Grid, OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";

/**
 * Página de prueba del modelo de brazos. No es parte del previsualizador:
 * es el "¿esto carga?" antes de escribir nada de la UI real.
 *
 * Carga los DOS archivos —el de Sketchfab tal cual y el que sale de
 * scripts/prepare-arms-model.mjs— porque la diferencia entre los dos es
 * justamente lo que hay que ver con los ojos. El original declara
 * KHR_materials_pbrSpecularGlossiness, three.js no la soporta más y NO falla:
 * avisa por consola y arma un material vacío. En pantalla eso es un brazo gris
 * plástico en vez de piel. Un test que solo dijera "cargó sin excepciones"
 * daría verde igual.
 */

const SRC = {
  original: "/models/arms_female.glb",
  convertido: "/models/arms_female.web.glb",
} as const;

type Which = keyof typeof SRC;

type Info = {
  meshes: { name: string; verts: number; tris: number }[];
  materials: string[];
  maps: string[];
  sizeCm: [number, number, number];
  centerWorld: [number, number, number];
};

function Arms({ url, onInfo }: { url: string; onInfo: (i: Info) => void }) {
  const { scene } = useGLTF(url);

  // clone() porque useGLTF cachea por URL y devuelve SIEMPRE la misma
  // instancia: montar el mismo modelo dos veces sin clonar hace que el segundo
  // le robe el objeto al primero y uno de los dos canvas quede vacío.
  const model = useMemo(() => scene.clone(true), [scene]);

  useMemo(() => {
    const meshes: Info["meshes"] = [];
    const materials = new Set<string>();
    const maps = new Set<string>();
    model.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      const m = o;
      const g = m.geometry;
      meshes.push({
        name: m.name,
        verts: g.attributes.position.count,
        tris: g.index ? g.index.count / 3 : g.attributes.position.count / 3,
      });
      const mat = m.material as THREE.MeshStandardMaterial;
      materials.add(`${mat.type}${mat.name ? ` "${mat.name}"` : ""}`);
      // Qué mapas llegaron REALMENTE al material de three. Acá es donde se ve
      // que en el original falta el `map` (la piel) aunque la textura esté
      // adentro del .glb.
      for (const k of ["map", "normalMap", "roughnessMap", "metalnessMap", "aoMap", "specularColorMap"] as const) {
        if ((mat as unknown as Record<string, unknown>)[k]) maps.add(k);
      }
    });

    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    onInfo({
      meshes,
      materials: [...materials],
      maps: [...maps],
      // Las unidades de glTF son metros por especificación, así que ×100 da cm.
      sizeCm: [+(size.x * 100).toFixed(1), +(size.y * 100).toFixed(1), +(size.z * 100).toFixed(1)],
      centerWorld: [+center.x.toFixed(3), +center.y.toFixed(3), +center.z.toFixed(3)],
    });
  }, [model, onInfo]);

  return <primitive object={model} />;
}

function Viewer({ which, onInfo }: { which: Which; onInfo: (i: Info) => void }) {
  return (
    <Canvas camera={{ position: [0, 0.3, 1.2], fov: 45 }} dpr={[1, 2]}>
      <color attach="background" args={["#141210"]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 5, 2]} intensity={2} />
      <directionalLight position={[-3, 1, -2]} intensity={0.6} />
      <Suspense fallback={null}>
        {/* El modelo NO está centrado en el origen: vive en x 0.24..1.09,
            y 0.89..1.29. Bounds lo encuadra solo en vez de hardcodear una
            cámara que habría que recalcular a mano. */}
        <Bounds fit clip observe margin={1.1}>
          <Arms url={SRC[which]} onInfo={onInfo} />
        </Bounds>
      </Suspense>
      <Grid args={[4, 4]} cellSize={0.1} sectionSize={0.5} position={[0, 0, 0]} fadeDistance={6} infiniteGrid sectionColor="#3a2f4a" cellColor="#241f2e" />
      <OrbitControls makeDefault />
    </Canvas>
  );
}

function Panel({ label, info }: { label: string; info: Info | null }) {
  if (!info) return <div className="text-ash">cargando…</div>;
  const totalTris = info.meshes.reduce((a, m) => a + m.tris, 0);
  const tieneMapaDePiel = info.maps.includes("map");
  return (
    <div className="space-y-1 font-mono text-[11px] leading-relaxed text-ashLight">
      <div className="text-toxic">{label}</div>
      <div>meshes: {info.meshes.length} — {info.meshes.map((m) => m.name).join(", ")}</div>
      <div>tris: {totalTris.toLocaleString("es-AR")}</div>
      <div>material: {info.materials.join(" | ")}</div>
      <div>
        mapas: {info.maps.length ? info.maps.join(", ") : "(ninguno)"}{" "}
        <span className={tieneMapaDePiel ? "text-toxic" : "text-gore"}>
          {tieneMapaDePiel ? "✓ tiene piel" : "✗ SIN textura de piel"}
        </span>
      </div>
      <div>bbox: {info.sizeCm.join(" × ")} cm</div>
      <div>centro: [{info.centerWorld.join(", ")}]</div>
    </div>
  );
}

export default function ModelProbe() {
  const [infoA, setInfoA] = useState<Info | null>(null);
  const [infoB, setInfoB] = useState<Info | null>(null);

  return (
    <div className="min-h-screen bg-ink p-6 text-bone">
      <h1 className="mb-1 font-heading text-2xl uppercase tracking-wide">Prueba de carga — arms_female</h1>
      <p className="mb-6 max-w-[70ch] text-sm text-ash">
        Izquierda: el .glb de Sketchfab sin tocar. Derecha: la salida de{" "}
        <code>scripts/prepare-arms-model.mjs</code>. Si la conversión hace lo que dice, el de la
        izquierda se ve gris plástico y el de la derecha con color de piel.
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        {([["original", infoA, setInfoA], ["convertido", infoB, setInfoB]] as const).map(
          ([which, info, setInfo]) => (
            <div key={which}>
              <div className="mb-2 h-[460px] overflow-hidden rounded border-2 border-plum">
                <Viewer which={which} onInfo={setInfo} />
              </div>
              <Panel label={which === "original" ? "original (spec-gloss)" : "convertido (metal-rough)"} info={info} />
            </div>
          )
        )}
      </div>
    </div>
  );
}

useGLTF.preload(SRC.original);
useGLTF.preload(SRC.convertido);
