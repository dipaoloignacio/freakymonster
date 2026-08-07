"use client";

import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Decal, OrbitControls, useGLTF, useTexture } from "@react-three/drei";
import * as THREE from "three";
import {
  M_TO_CM,
  decalDepth,
  decalOrientation,
  measureFootprint,
  maxDesignHeight,
  maxHeightForWrap,
  placementRange,
  prepareArm,
  surfacePoint,
  type ArmMetrics,
  type ArmSide,
  type Footprint,
} from "@/lib/armModel";

import { designs, type TattooDesign } from "@/data/designs";
import { AssetErrorBoundary } from "./AssetErrorBoundary";

const MODEL_URL = "/models/arms_female.web.glb";

/** Más chico que esto no se lee ni en la pantalla ni en la piel. */
const MIN_HEIGHT_CM = 3;

/** Lo que mide la huella, más lo que se decidió con esa medición. */
export type FootprintReport = Footprint & { depth: number; beyondHorizon: boolean; depthCapped: boolean };

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

/**
 * El decal, con su textura. Va en su propio componente para que el que puede
 * fallar sea SOLO éste: useTexture lanza la excepción durante el render, así que
 * el AssetErrorBoundary tiene que quedar por encima de la llamada, no por encima
 * del brazo. Si la carga del diseño viviera en <Arm>, un PNG faltante se llevaría
 * puesta la malla, los sliders y el canvas entero.
 */
function ArmDecal({
  url,
  placement,
  width,
  height,
  debug,
}: {
  url: string;
  placement: { position: [number, number, number]; rotation: THREE.Euler; depth: number };
  width: number;
  height: number;
  debug: boolean;
}) {
  const texture = useTexture(url);
  useEffect(() => {
    // Sin esto el diseño sale lavado: three asume espacio lineal y una textura
    // de color hay que declararla como sRGB o el negro deja de ser negro.
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    texture.needsUpdate = true;
  }, [texture]);

  return (
    <Decal
      position={placement.position}
      rotation={placement.rotation}
      scale={[width, height, placement.depth]}
      map={texture}
      // drei viene con depthTest={false} por defecto, que dibuja el decal
      // SIEMPRE por encima: el tatuaje se vería a través del brazo al girar
      // la cámara a la otra cara. Con depthTest activado lo tapa el propio
      // brazo, y el polygonOffset que drei ya aplica evita el z-fighting.
      depthTest
      polygonOffsetFactor={-20}
      debug={debug}
    />
  );
}

function Arm({
  controls,
  onMetrics,
  onPlacementFail,
  onFootprint,
  onDesignError,
  debug,
}: {
  controls: Controls;
  onMetrics: (m: ArmMetrics) => void;
  onPlacementFail: (failed: boolean) => void;
  onFootprint: (f: FootprintReport) => void;
  onDesignError: (id: string, message: string) => void;
  debug: boolean;
}) {
  const { scene } = useGLTF(MODEL_URL);
  const { geometry, material, metrics } = useMemo(
    () => prepareArm(scene, controls.side),
    [scene, controls.side]
  );

  useEffect(() => onMetrics(metrics), [metrics, onMetrics]);

  const meshRef = useRef<THREE.Mesh>(null);
  const [placement, setPlacement] = useState<{
    position: [number, number, number];
    rotation: THREE.Euler;
    depth: number;
  } | null>(null);

  const height = controls.heightCm / M_TO_CM;
  const width = height * controls.design.aspect;
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

    // La profundidad NO es fija ni un múltiplo del tamaño: se mide cuánto se
    // hunde la superficie bajo la huella de ESTE diseño en ESTA posición. Antes
    // salía del radio del brazo y no escalaba con los cm pedidos, así que un
    // diseño grande se salía de la caja y quedaba cortado a la mitad.
    const footprint = measureFootprint(mesh, metrics, y, angle, width, height, spin);
    const { depth, beyondHorizon, depthCapped } = decalDepth(footprint);

    setPlacement({
      position: [hit.point.x, hit.point.y, hit.point.z],
      rotation: decalOrientation(hit.normal, spin),
      depth,
    });
    onFootprint({ ...footprint, depth, beyondHorizon, depthCapped });
  }, [y, angle, spin, width, height, geometry, metrics, onPlacementFail, onFootprint]);

  return (
    <mesh ref={meshRef} geometry={geometry} material={material}>
      {placement && (
        // key por diseño: un ErrorBoundary que ya falló se queda en estado de
        // error, así que sin remontarlo elegir otro diseño no volvería a
        // intentar nada.
        <AssetErrorBoundary
          key={controls.design.id}
          onError={(m) => onDesignError(controls.design.id, m)}
        >
          <Suspense fallback={null}>
            <ArmDecal
              url={controls.design.image}
              placement={placement}
              width={width}
              height={height}
              debug={debug}
            />
          </Suspense>
        </AssetErrorBoundary>
      )}
    </mesh>
  );
}

function Scene({
  controls,
  onMetrics,
  onPlacementFail,
  onFootprint,
  onDesignError,
  debug,
}: {
  controls: Controls;
  onMetrics: (m: ArmMetrics) => void;
  onPlacementFail: (failed: boolean) => void;
  onFootprint: (f: FootprintReport) => void;
  onDesignError: (id: string, message: string) => void;
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
        <Arm
          controls={controls}
          onMetrics={onMetrics}
          onPlacementFail={onPlacementFail}
          onFootprint={onFootprint}
          onDesignError={onDesignError}
          debug={debug}
        />
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
  const [footprint, setFootprint] = useState<FootprintReport | null>(null);
  const [broken, setBroken] = useState<Record<string, string>>({});

  const handleDesignError = useCallback((id: string, message: string) => {
    setBroken((prev) => (prev[id] ? prev : { ...prev, [id]: message }));
  }, []);

  // Los límites salen de la malla, no de números escritos a mano, y dependen del
  // alto del diseño: el límite real es sobre el BORDE del tatuaje, no sobre su
  // centro, así que un diseño más grande tiene menos lugar donde ir.
  const limits = useMemo(() => {
    if (!metrics) return null;
    const h = heightCm / M_TO_CM;
    const range = placementRange(metrics, h);
    // El tope de tamaño ya NO es el hueco muñeca–codo: es cuánto puede abrazar
    // el diseño alrededor del brazo sin deformarse. Se recalcula con la posición
    // porque el antebrazo casi duplica su grosor hacia el codo, y con el diseño
    // porque lo que abraza es el ancho y el slider controla el alto.
    const y = metrics.yWrist + fromWristCm / M_TO_CM;
    const wrapCap = maxHeightForWrap(metrics, y, design.aspect, (spinDeg * Math.PI) / 180);
    return {
      minCm: (range.min - metrics.yWrist) * M_TO_CM,
      maxCm: (range.max - metrics.yWrist) * M_TO_CM,
      maxHeightCm: wrapCap * M_TO_CM,
      geometricMaxCm: maxDesignHeight(metrics) * M_TO_CM,
      lengthCm: metrics.length * M_TO_CM,
      wristToCutCm: (metrics.yCut - metrics.yWrist) * M_TO_CM,
    };
  }, [metrics, heightCm, fromWristCm, design.aspect, spinDeg]);

  // Si el tope bajó —porque se movió el diseño a una parte más fina del brazo,
  // o se cambió a un diseño más ancho— el alto actual puede haber quedado
  // arriba del máximo. Se recorta.
  useEffect(() => {
    if (!limits) return;
    setHeightCm((v) => Math.min(v, Math.max(limits.maxHeightCm, MIN_HEIGHT_CM)));
  }, [limits]);

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
              onFootprint={setFootprint}
              onDesignError={handleDesignError}
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
                {designs.map((d) => {
                  const isBroken = Boolean(broken[d.id]);
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => { setDesign(d); setHeightCm(d.heightCm); }}
                      className={`clip-notch-sm px-2 py-2 text-[11px] font-bold uppercase ${
                        design.id === d.id ? "bg-toxic text-ink" : "border-2 border-ash text-bone"
                      } ${d.placeholder ? "opacity-70" : ""} ${
                        isBroken ? "border-gore text-gore line-through opacity-60" : ""
                      }`}
                      // Los de relleno se marcan para no confundirlos con flash
                      // del estudio cuando se muestre esto en una reunión.
                      title={
                        isBroken
                          ? `No cargó: ${broken[d.id]}`
                          : d.placeholder
                            ? "De relleno, no es flash del estudio"
                            : undefined
                      }
                    >
                      {d.label}
                      {d.placeholder && !isBroken && <span className="ml-1 opacity-60">*</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {limits && (
              <>
                <Slider
                  label="Tamaño" value={heightCm} min={MIN_HEIGHT_CM}
                  max={Math.max(Math.round(limits.maxHeightCm * 10) / 10, MIN_HEIGHT_CM)}
                  step={0.5} unit="cm"
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

            {broken[design.id] && (
              <p className="border-l-2 border-gore pl-3 text-xs text-gore">
                “{design.label}” no cargó. El resto del previsualizador sigue
                andando: elegí otro diseño.
              </p>
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
                <div>
                  alto máx. (120° de abrazo): {limits.maxHeightCm.toFixed(1)} cm
                </div>
                <div className="text-ash/60">
                  (el hueco muñeca–codo daría {limits.geometricMaxCm.toFixed(1)} cm)
                </div>
                {footprint && (
                  <>
                    <div className="pt-2 text-toxic">huella del diseño</div>
                    <div>hundimiento: {(footprint.sag * M_TO_CM).toFixed(2)} cm</div>
                    <div>prof. de caja: {(footprint.depth * M_TO_CM).toFixed(2)} cm</div>
                    <div>
                      hasta la piel de atrás:{" "}
                      {Number.isFinite(footprint.backDistance)
                        ? (footprint.backDistance * M_TO_CM).toFixed(2) + " cm"
                        : "—"}
                    </div>
                    <div className={footprint.wrapDeg > 120 ? "text-gore" : "text-ash"}>
                      abraza: {footprint.wrapDeg.toFixed(0)}°
                      {footprint.beyondHalf > 0 && " (pasa el horizonte)"}
                    </div>
                    <div className={footprint.beyondHorizon ? "text-gore" : "text-toxic"}>
                      {footprint.beyondHorizon
                        ? "SE CORTA: el diseño pasa el horizonte del brazo"
                        : "sin corte"}
                    </div>
                    {footprint.depthCapped && !footprint.beyondHorizon && (
                      <div className="text-ash">
                        profundidad topeada (recorta esquinas, casi siempre vacías)
                      </div>
                    )}
                  </>
                )}
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
