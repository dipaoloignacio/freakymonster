"use client";

import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Decal, OrbitControls, useGLTF, useTexture } from "@react-three/drei";
import * as THREE from "three";
import {
  M_TO_CM,
  decalOrientation,
  maxDesignHeight,
  placementRange,
  prepareArm,
  radiusAt,
  surfacePoint,
  type ArmMetrics,
  type ArmSide,
} from "@/lib/armModel";
import { designs, type TattooDesign } from "@/data/designs";

const MODEL_URL = "/models/arms_female.web.glb";

type Controls = {
  side: ArmSide;
  design: TattooDesign;
  /** Alto del diseño sobre la piel, en cm. */
  heightCm: number;
  /** Altura del centro del diseño medida desde la MUÑECA, en cm. */
  fromWristCm: number;
  /** Vuelta alrededor del brazo, en grados. 0 = mirando a la cámara. */
  aroundDeg: number;
  /** Giro del diseño sobre sí mismo, en grados. */
  spinDeg: number;
};

function Arm({
  controls,
  onMetrics,
  onPlacementFail,
  debug,
}: {
  controls: Controls;
  onMetrics: (m: ArmMetrics) => void;
  onPlacementFail: (failed: boolean) => void;
  debug: boolean;
}) {
  const { scene } = useGLTF(MODEL_URL);
  const { geometry, material, metrics } = useMemo(
    () => prepareArm(scene, controls.side),
    [scene, controls.side]
  );

  const texture = useTexture(controls.design.image);
  useEffect(() => {
    // Sin esto el diseño sale lavado: three asume espacio lineal y una textura
    // de color hay que declararla como sRGB o el negro deja de ser negro.
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    texture.needsUpdate = true;
  }, [texture]);

  useEffect(() => onMetrics(metrics), [metrics, onMetrics]);

  const meshRef = useRef<THREE.Mesh>(null);
  const [placement, setPlacement] = useState<{
    position: [number, number, number];
    rotation: THREE.Euler;
    depth: number;
  } | null>(null);

  const height = controls.heightCm / M_TO_CM;
  const y = metrics.yWrist + controls.fromWristCm / M_TO_CM;
  const angle = (controls.aroundDeg * Math.PI) / 180;
  const spin = (controls.spinDeg * Math.PI) / 180;

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.updateMatrixWorld(true);

    const hit = surfacePoint(mesh, metrics, y, angle);
    if (!hit) {
      setPlacement(null);
      onPlacementFail(true);
      return;
    }
    onPlacementFail(false);

    setPlacement({
      position: [hit.point.x, hit.point.y, hit.point.z],
      rotation: decalOrientation(hit.normal, spin),
      // La profundidad de proyección se ata al grosor del brazo en ESE punto.
      // Fija no sirve: DecalGeometry proyecta dentro de una caja centrada en el
      // punto, así que si la profundidad supera el diámetro el diseño atraviesa
      // el brazo y vuelve a aparecer, espejado, del otro lado. Usando el radio
      // local la caja llega hasta la mitad del brazo y nunca sale por atrás.
      depth: Math.max(radiusAt(metrics, y), 0.02),
    });
  }, [y, angle, spin, geometry, metrics, onPlacementFail]);

  return (
    <mesh ref={meshRef} geometry={geometry} material={material}>
      {placement && (
        <Decal
          position={placement.position}
          rotation={placement.rotation}
          scale={[height * controls.design.aspect, height, placement.depth]}
          map={texture}
          // drei viene con depthTest={false} por defecto, que dibuja el decal
          // SIEMPRE por encima: el tatuaje se vería a través del brazo al girar
          // la cámara a la otra cara. Con depthTest activado lo tapa el propio
          // brazo, y el polygonOffset que drei ya aplica evita el z-fighting.
          depthTest
          polygonOffsetFactor={-20}
          debug={debug}
        />
      )}
    </mesh>
  );
}

function Scene({
  controls,
  onMetrics,
  onPlacementFail,
  debug,
}: {
  controls: Controls;
  onMetrics: (m: ArmMetrics) => void;
  onPlacementFail: (failed: boolean) => void;
  debug: boolean;
}) {
  return (
    <Canvas
      // Cámara fija y previsible: la malla ya viene centrada en el origen desde
      // prepareArm(), así que no hace falta <Bounds> encuadrando a ojo. El brazo
      // mide ~60 cm sobre Y y a 0,85 m con fov 45° entran ~70 cm de alto.
      camera={{ position: [0, 0, 0.85], fov: 45, near: 0.01, far: 100 }}
      dpr={[1, 2]}
      gl={{ antialias: true }}
    >
      <color attach="background" args={["#0f0d0b"]} />
      {/* Luces a mano y NO <Environment preset="...">: los presets de drei se
          bajan un HDR de un CDN de terceros (raw.githack.com) en tiempo de
          ejecución. Para una página de producción eso es una dependencia
          externa que puede caerse, unos cuantos MB, y una request a un dominio
          que no controlamos. Además sobreexponía la piel: el modelo ya trae su
          propio mapa especular y con IBL encima quedaba blanca de yeso. */}
      <hemisphereLight args={["#fff2e6", "#241f2e", 0.5]} />
      <directionalLight position={[2, 2.5, 4]} intensity={1.5} />
      <directionalLight position={[-3, 0.5, 1]} intensity={0.35} />
      {/* Contraluz frío: despega el brazo del fondo oscuro sin aclarar la piel. */}
      <directionalLight position={[0, -1, -3]} intensity={0.6} color="#8fb7ff" />
      <Suspense fallback={null}>
        <Arm controls={controls} onMetrics={onMetrics} onPlacementFail={onPlacementFail} debug={debug} />
      </Suspense>
      <OrbitControls
        makeDefault
        enablePan={false}
        minDistance={0.3}
        maxDistance={2}
        target={[0, 0, 0]}
      />
    </Canvas>
  );
}

function Slider({
  label, value, min, max, step, unit, onChange, disabled,
}: {
  label: string; value: number; min: number; max: number; step: number;
  unit: string; onChange: (v: number) => void; disabled?: boolean;
}) {
  return (
    <label className={`block ${disabled ? "opacity-40" : ""}`}>
      <div className="mb-1 flex justify-between text-[11px] uppercase tracking-wider text-ash">
        <span>{label}</span>
        <span className="font-mono text-bone">{value.toFixed(1)} {unit}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step} value={value} disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-gore"
      />
      <div className="flex justify-between font-mono text-[10px] text-ash/60">
        <span>{min.toFixed(1)}</span>
        <span>{max.toFixed(1)}</span>
      </div>
    </label>
  );
}

export default function TattooPreview() {
  const [side, setSide] = useState<ArmSide>("derecho");
  const [design, setDesign] = useState<TattooDesign>(designs[0]);
  const [heightCm, setHeightCm] = useState(designs[0].heightCm);
  const [fromWristCm, setFromWristCm] = useState(12);
  const [aroundDeg, setAroundDeg] = useState(0);
  const [spinDeg, setSpinDeg] = useState(0);
  const [metrics, setMetrics] = useState<ArmMetrics | null>(null);
  const [placementFailed, setPlacementFailed] = useState(false);
  const [debug, setDebug] = useState(false);

  // Los límites salen de la malla, no de números escritos a mano, y dependen del
  // alto del diseño: el límite real es sobre el BORDE del tatuaje, no sobre su
  // centro, así que un diseño más grande tiene menos lugar donde ir.
  const limits = useMemo(() => {
    if (!metrics) return null;
    const h = heightCm / M_TO_CM;
    const range = placementRange(metrics, h);
    return {
      minCm: (range.min - metrics.yWrist) * M_TO_CM,
      maxCm: (range.max - metrics.yWrist) * M_TO_CM,
      maxHeightCm: maxDesignHeight(metrics) * M_TO_CM,
      lengthCm: metrics.length * M_TO_CM,
      wristToCutCm: (metrics.yCut - metrics.yWrist) * M_TO_CM,
    };
  }, [metrics, heightCm]);

  // Si el diseño crece, el rango se achica y la posición actual puede quedar
  // afuera. Se reencuadra sola en vez de dejar el tatuaje pisando el corte.
  useEffect(() => {
    if (!limits) return;
    setFromWristCm((v) => Math.min(Math.max(v, limits.minCm), limits.maxCm));
  }, [limits]);

  const noRoom = limits ? limits.minCm > limits.maxCm : false;

  const controls: Controls = { side, design, heightCm, fromWristCm, aroundDeg, spinDeg };

  return (
    <div className="min-h-screen bg-ink text-bone">
      <div className="mx-auto max-w-[1200px] px-6 py-8">
        <h1 className="font-heading text-3xl uppercase tracking-wide">Previsualizador de tatuajes</h1>
        <p className="mt-2 max-w-[70ch] text-sm text-ash">
          Mano y antebrazo hasta el codo. El rango de posición está limitado por la geometría real
          de la malla: no deja acercar el diseño al corte del codo ni bajarlo sobre la muñeca.
        </p>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="h-[560px] overflow-hidden rounded border-2 border-plum bg-panel2">
            <Scene
              controls={controls}
              onMetrics={setMetrics}
              onPlacementFail={setPlacementFailed}
              debug={debug}
            />
          </div>

          <div className="space-y-5">
            <div>
              <div className="mb-2 text-[11px] uppercase tracking-wider text-ash">Brazo</div>
              <div className="flex gap-2">
                {(["izquierdo", "derecho"] as ArmSide[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSide(s)}
                    className={`clip-notch-sm flex-1 px-3 py-2 text-[12px] font-bold uppercase tracking-wider ${
                      side === s ? "bg-gore text-ink" : "border-2 border-ash text-bone"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 text-[11px] uppercase tracking-wider text-ash">Diseño</div>
              <div className="grid grid-cols-3 gap-2">
                {designs.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => { setDesign(d); setHeightCm(d.heightCm); }}
                    className={`clip-notch-sm px-2 py-2 text-[11px] font-bold uppercase ${
                      design.id === d.id ? "bg-toxic text-ink" : "border-2 border-ash text-bone"
                    } ${d.placeholder ? "opacity-70" : ""}`}
                    // Los de relleno se marcan para no confundirlos con flash del
                    // estudio cuando se muestre esto en una reunión.
                    title={d.placeholder ? "De relleno, no es flash del estudio" : undefined}
                  >
                    {d.label}
                    {d.placeholder && <span className="ml-1 opacity-60">*</span>}
                  </button>
                ))}
              </div>
            </div>

            {limits && (
              <>
                <Slider
                  label="Tamaño" value={heightCm} min={3}
                  max={Math.floor(limits.maxHeightCm)} step={0.5} unit="cm"
                  onChange={setHeightCm}
                />
                <Slider
                  label="Desde la muñeca" value={fromWristCm}
                  min={Math.ceil(limits.minCm * 10) / 10}
                  max={Math.floor(limits.maxCm * 10) / 10}
                  step={0.5} unit="cm" onChange={setFromWristCm} disabled={noRoom}
                />
                <Slider label="Vuelta al brazo" value={aroundDeg} min={-180} max={180} step={5} unit="°" onChange={setAroundDeg} />
                <Slider label="Giro del diseño" value={spinDeg} min={-180} max={180} step={5} unit="°" onChange={setSpinDeg} />
              </>
            )}

            {noRoom && (
              <p className="border-l-2 border-gore pl-3 text-xs text-gore">
                El diseño es más alto que el tramo tatuable del antebrazo. Achicalo.
              </p>
            )}
            {placementFailed && !noRoom && (
              <p className="border-l-2 border-gore pl-3 text-xs text-gore">
                No encontré superficie en ese ángulo — el rayo no impactó la malla.
              </p>
            )}

            <label className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-ash">
              <input type="checkbox" checked={debug} onChange={(e) => setDebug(e.target.checked)} className="accent-toxic" />
              Ver caja de proyección
            </label>

            {limits && (
              <div className="space-y-0.5 border-t border-plum pt-4 font-mono text-[10px] leading-relaxed text-ash">
                <div className="text-toxic">medido sobre la malla</div>
                <div>largo total: {limits.lengthCm.toFixed(1)} cm</div>
                <div>muñeca → corte: {limits.wristToCutCm.toFixed(1)} cm</div>
                <div>rango permitido: {limits.minCm.toFixed(1)} – {limits.maxCm.toFixed(1)} cm</div>
                <div>alto máx. de diseño: {limits.maxHeightCm.toFixed(1)} cm</div>
              </div>
            )}
          </div>
        </div>

        {/* Crédito de la licencia CC-BY 4.0 del modelo. Va acá, visible, y no
            solo en un comentario del código: la licencia obliga a atribuir y
            esta es la página donde el modelo se usa. */}
        <footer className="mt-8 border-t border-plum pt-4 text-[11px] text-ash">
          Modelo 3D:{" "}
          <a
            href="https://sketchfab.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-plum underline-offset-2 hover:text-bone"
          >
            BG_3D bank (Sketchfab, CC-BY 4.0)
          </a>
        </footer>
      </div>
    </div>
  );
}

useGLTF.preload(MODEL_URL);
