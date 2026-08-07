import * as THREE from "three";

/**
 * Prepara la malla de brazo del .glb para el previsualizador y resuelve dónde
 * se puede tatuar.
 *
 * Todo lo de acá es matemática sobre la geometría, sin React ni r3f, para poder
 * verificarlo por separado (ver scripts/check-arm-model.mjs).
 *
 * Las unidades del archivo son METROS, que es lo que manda la especificación de
 * glTF. El spec del previsualizador habla en centímetros, así que la conversión
 * (×100) vive en el borde: adentro de este módulo todo es metros.
 */

/** Unidades glTF (metros) → centímetros. */
export const M_TO_CM = 100;

/**
 * Qué brazo. Son dos mallas espejadas —lo confirmé vértice a vértice: el 89% de
 * los vértices de una es el espejo en X de la otra, y las normales están
 * invertidas en X—, así que hay izquierdo y derecho de verdad.
 *
 * El previsualizador muestra UNO. Los dos comparten el mismo espacio UV y el
 * mismo material, así que mostrar los dos con un decal encima significaría o
 * bien el mismo tatuaje duplicado en ambos brazos, o uno tatuado y el otro no.
 * Ninguna de las dos cosa es lo que alguien quiere ver antes de sacar un turno.
 */
export type ArmSide = "izquierdo" | "derecho";

/** Nodos tal como se llaman adentro del .glb. Object_2/Object_3 son los nodos;
 *  las mallas que cuelgan de ellos son Object_0/Object_1. */
const NODE_BY_SIDE: Record<ArmSide, string> = {
  derecho: "Object_2",
  izquierdo: "Object_3",
};

export type ArmMetrics = {
  /** Largo del brazo sobre su propio eje, en metros. */
  length: number;
  /** Y de la punta de los dedos (el extremo de la mano). */
  yHand: number;
  /** Y del corte del codo — el borde ABIERTO de la malla. */
  yCut: number;
  /** Y de la muñeca, detectada como la sección más angosta. */
  yWrist: number;
  /**
   * Corte transversal tramo por tramo. `cx`/`cz` son el CENTRO del tubo a esa
   * altura, que no es el origen: el eje del antebrazo está corrido respecto del
   * centro de la caja contenedora, porque la caja también encierra la mano con
   * los dedos abiertos, que cuelga para un costado.
   */
  profile: { y: number; cx: number; cz: number; radius: number }[];
};

export type PreparedArm = {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  metrics: ArmMetrics;
};

// --- helpers de álgebra ----------------------------------------------------

/**
 * Eje principal de la nube de puntos por iteración de potencia sobre la matriz
 * de covarianza. Hace falta porque el bounding box NO da el largo del brazo:
 * el brazo está en diagonal, así que la caja mide la diagonal. Medido sobre
 * este modelo, la caja da 35x41x37 cm y el largo real sobre el eje propio es
 * 60,1 cm — errarle es errarle por un 50% en el mapeo de centímetros.
 */
function principalAxis(pos: THREE.BufferAttribute | THREE.InterleavedBufferAttribute): THREE.Vector3 {
  const count = pos.count;
  let mx = 0, my = 0, mz = 0;
  for (let i = 0; i < count; i++) {
    mx += pos.getX(i);
    my += pos.getY(i);
    mz += pos.getZ(i);
  }
  mx /= count; my /= count; mz /= count;

  const c = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (let i = 0; i < count; i++) {
    const d = [pos.getX(i) - mx, pos.getY(i) - my, pos.getZ(i) - mz];
    for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) c[a * 3 + b] += d[a] * d[b];
  }

  let v = new THREE.Vector3(1, 1, 1).normalize();
  for (let it = 0; it < 128; it++) {
    const n = new THREE.Vector3(
      c[0] * v.x + c[1] * v.y + c[2] * v.z,
      c[3] * v.x + c[4] * v.y + c[5] * v.z,
      c[6] * v.x + c[7] * v.y + c[8] * v.z
    );
    if (n.lengthSq() === 0) break;
    v = n.normalize();
  }
  return v;
}

// --- preparación de la malla ----------------------------------------------

/**
 * Saca un brazo del .glb y lo deja CANONIZADO: centrado en el origen y con su
 * eje sobre +Y, con la mano abajo y el corte del codo arriba.
 *
 * La transformación se hornea en la BufferGeometry en vez de ponerla como
 * position/rotation del <mesh>. No es capricho: <Decal> de drei le pone la
 * matrixWorld del padre en identidad antes de proyectar, así que interpreta la
 * posición del decal en el espacio LOCAL de la malla. Si la canonización viviera
 * en un <group> de arriba, el espacio donde yo calculo los puntos y el espacio
 * donde el decal los interpreta serían distintos, y el tatuaje aterrizaría en
 * cualquier lado. Horneándola, local y mundo son el mismo espacio y no hay
 * conversión que olvidarse.
 *
 * Esto además es lo que reemplaza a <Bounds>: la malla ya viene centrada, así
 * que la cámara puede ser fija y previsible.
 */
export function prepareArm(scene: THREE.Object3D, side: ArmSide): PreparedArm {
  scene.updateMatrixWorld(true);

  const nodeName = NODE_BY_SIDE[side];
  let source: THREE.Mesh | null = null;
  scene.traverse((o) => {
    if (o instanceof THREE.Mesh && o.name === nodeName) source = o;
  });
  if (!source) {
    const found: string[] = [];
    scene.traverse((o) => { if (o instanceof THREE.Mesh) found.push(o.name); });
    throw new Error(`No encontré el nodo "${nodeName}" en el modelo. Mallas presentes: ${found.join(", ") || "(ninguna)"}`);
  }
  const mesh: THREE.Mesh = source;

  const geometry = mesh.geometry.clone();
  // El .glb trae una matriz en el nodo raíz (el cambio de Z-up a Y-up de
  // Sketchfab) y otra en el nodo del brazo. matrixWorld las trae ya combinadas.
  geometry.applyMatrix4(mesh.matrixWorld);

  // Se lee SIEMPRE con getX/getY/getZ y nunca con attribute.array. Este .glb
  // trae los vértices ENTRELAZADOS —POSITION, NORMAL, TANGENT y TEXCOORD_0
  // comparten un bufferView con byteStride 48—, así que `array` no es una lista
  // de posiciones: es el buffer entero. Indexarlo como [i*3] devuelve una
  // ensalada de posición, normal y tangente, y el eje principal sale de una
  // nube de puntos que no existe. Los accesores resuelven el stride solos y
  // funcionan igual si el modelo viene sin entrelazar.
  const pos = geometry.getAttribute("position");
  const count = pos.count;

  const axis = principalAxis(pos);

  // El eje que sale de PCA no tiene signo: puede apuntar mano→codo o al revés.
  // Se desempata por densidad de vértices. La mano tiene los dedos, que es donde
  // se concentra la malla: medido, el 75% de los vértices está en el tercio de
  // la mano. El codo es un tubo liso con pocos vértices.
  const centroid = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    centroid.x += pos.getX(i);
    centroid.y += pos.getY(i);
    centroid.z += pos.getZ(i);
  }
  centroid.divideScalar(count);

  let projMin = Infinity, projMax = -Infinity;
  const proj = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const t =
      (pos.getX(i) - centroid.x) * axis.x +
      (pos.getY(i) - centroid.y) * axis.y +
      (pos.getZ(i) - centroid.z) * axis.z;
    proj[i] = t;
    if (t < projMin) projMin = t;
    if (t > projMax) projMax = t;
  }
  const mid = (projMin + projMax) / 2;
  let below = 0;
  for (let i = 0; i < count; i++) if (proj[i] < mid) below++;
  // Queremos que el eje vaya MANO → CODO. Si la mitad densa cayó del lado
  // negativo, el eje ya apunta para allá y hay que darlo vuelta.
  const handIsBelow = below > count / 2;
  const oriented = handIsBelow ? axis.clone() : axis.clone().negate();

  // Rotar el eje del brazo a +Y y hornearlo.
  const q = new THREE.Quaternion().setFromUnitVectors(oriented, new THREE.Vector3(0, 1, 0));
  geometry.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(q));

  // Centrar por bounding box y no por centroide: para encuadrar la cámara lo
  // que importa es la caja, y el centroide está corrido hacia la mano (que es
  // donde se amontonan los vértices).
  geometry.computeBoundingBox();
  const center = new THREE.Vector3();
  geometry.boundingBox!.getCenter(center);
  geometry.translate(-center.x, -center.y, -center.z);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  const box = geometry.boundingBox!;
  const yHand = box.min.y;
  const yCut = box.max.y;

  const profile = buildProfile(geometry, yHand, yCut);
  const yWrist = findWrist(profile, yHand, yCut);

  return {
    geometry,
    material: Array.isArray(mesh.material) ? mesh.material[0] : mesh.material,
    metrics: { length: yCut - yHand, yHand, yCut, yWrist, profile },
  };
}

/**
 * Centro y radio del brazo tramo por tramo a lo largo de Y.
 *
 * El centro se calcula por tramo y no una sola vez para todo el brazo: el
 * antebrazo es un tubo que serpentea, y además el centro de la caja contenedora
 * está tirado hacia donde cuelga la mano. Un rayo lanzado contra el origen en
 * vez de contra el centro LOCAL entra rozando el borde de la silueta, pega en
 * una cara casi tangente —normal apuntando de costado— y el decal se proyecta
 * estirado a lo largo del brazo en vez de apoyarse de frente.
 *
 * Dos pasadas: la primera promedia para tener el centro, la segunda mide el
 * radio desde ese centro. Con una sola no se puede porque el radio depende del
 * centro, que todavía no se conoce.
 */
function buildProfile(geometry: THREE.BufferGeometry, yMin: number, yMax: number, slices = 60) {
  const pos = geometry.getAttribute("position");
  const span = yMax - yMin;
  const sumX = new Float64Array(slices);
  const sumZ = new Float64Array(slices);
  const n = new Uint32Array(slices);

  // Mismo motivo que en prepareArm: vértices entrelazados, se leen con accesores.
  const sliceOf = (y: number) => {
    let s = Math.floor(((y - yMin) / span) * slices);
    if (s < 0) s = 0;
    if (s >= slices) s = slices - 1;
    return s;
  };

  for (let i = 0; i < pos.count; i++) {
    const s = sliceOf(pos.getY(i));
    sumX[s] += pos.getX(i);
    sumZ[s] += pos.getZ(i);
    n[s]++;
  }

  const maxR = new Float32Array(slices);
  for (let i = 0; i < pos.count; i++) {
    const s = sliceOf(pos.getY(i));
    if (n[s] === 0) continue;
    const r = Math.hypot(pos.getX(i) - sumX[s] / n[s], pos.getZ(i) - sumZ[s] / n[s]);
    if (r > maxR[s]) maxR[s] = r;
  }

  return Array.from({ length: slices }, (_, s) => ({
    y: yMin + (span * (s + 0.5)) / slices,
    cx: n[s] ? sumX[s] / n[s] : 0,
    cz: n[s] ? sumZ[s] / n[s] : 0,
    radius: maxR[s],
  }));
}

/**
 * Centro del brazo a una altura, interpolado entre los dos tramos vecinos. Sin
 * interpolar, el centro salta de tramo en tramo y el decal da un tironcito
 * visible cada vez que el slider cruza un borde.
 */
export function centerAt(metrics: ArmMetrics, y: number): { x: number; z: number } {
  const p = metrics.profile;
  if (y <= p[0].y) return { x: p[0].cx, z: p[0].cz };
  if (y >= p[p.length - 1].y) return { x: p[p.length - 1].cx, z: p[p.length - 1].cz };
  for (let i = 0; i < p.length - 1; i++) {
    if (y >= p[i].y && y <= p[i + 1].y) {
      const t = (y - p[i].y) / (p[i + 1].y - p[i].y);
      return {
        x: p[i].cx + (p[i + 1].cx - p[i].cx) * t,
        z: p[i].cz + (p[i + 1].cz - p[i].cz) * t,
      };
    }
  }
  return { x: 0, z: 0 };
}

/**
 * La muñeca es la sección más angosta del brazo. Se busca solo en la mitad de
 * la mano (10%–50% del largo desde los dedos) para no confundirla con la punta
 * de los dedos, que también es angosta.
 */
function findWrist(profile: ArmMetrics["profile"], yMin: number, yMax: number): number {
  const span = yMax - yMin;
  const lo = yMin + span * 0.1;
  const hi = yMin + span * 0.5;
  let best = profile[0];
  let bestR = Infinity;
  for (const p of profile) {
    if (p.y < lo || p.y > hi) continue;
    if (p.radius > 0 && p.radius < bestR) { bestR = p.radius; best = p; }
  }
  return best.y;
}

/** Radio del brazo a una altura dada. */
export function radiusAt(metrics: ArmMetrics, y: number): number {
  let best = metrics.profile[0];
  let bestD = Infinity;
  for (const p of metrics.profile) {
    const d = Math.abs(p.y - y);
    if (d < bestD) { bestD = d; best = p; }
  }
  return best.radius;
}

/**
 * Margen contra el CORTE DEL CODO. La malla está abierta ahí —40 aristas de
 * borde, o sea que el brazo está seccionado, no es un sólido cerrado—, y un
 * decal que cruce ese borde se ve como una calcomanía cortada al ras, flotando
 * sobre la nada. Este margen es la distancia mínima entre el borde de arriba del
 * diseño y el corte.
 */
const CUT_MARGIN = 0.03;

/**
 * Margen contra la muñeca. No es por geometría sino por anatomía: el diseño se
 * deforma feo sobre el hueso de la muñeca, que es donde el brazo cambia de
 * grosor de golpe.
 */
const WRIST_MARGIN = 0.02;

/**
 * Rango de alturas donde se puede poner el CENTRO del diseño, dado su alto.
 *
 * Depende del alto justamente porque el límite no es sobre el centro sino sobre
 * los bordes: un diseño de 12 cm tiene que arrancar 6 cm más abajo que uno de
 * 0 cm para que su borde superior no se coma el corte del codo.
 *
 * Puede devolver un rango vacío (min > max) si el diseño no entra en el
 * antebrazo. Quien llama tiene que contemplarlo.
 */
export function placementRange(metrics: ArmMetrics, designHeight: number) {
  const half = designHeight / 2;
  return {
    min: metrics.yWrist + WRIST_MARGIN + half,
    max: metrics.yCut - CUT_MARGIN - half,
  };
}

/** El alto máximo de diseño que entra entre la muñeca y el corte. */
export function maxDesignHeight(metrics: ArmMetrics): number {
  return metrics.yCut - CUT_MARGIN - (metrics.yWrist + WRIST_MARGIN);
}

/**
 * Punto de la superficie del brazo a una altura y un ángulo dados.
 *
 * Tira un rayo desde AFUERA hacia el eje, no desde el eje hacia afuera. Desde
 * adentro el primer impacto depende de por dónde ande el eje —y el eje del
 * antebrazo no está exactamente en el centro del tubo—, así que en las zonas
 * donde el brazo se ensancha el rayo puede salir por donde no es. Desde afuera
 * el primer impacto es siempre la cara que mira al ángulo pedido, que es
 * justamente donde va el tatuaje.
 *
 * angle = 0 mira hacia +Z, que es donde está la cámara.
 */
export function surfacePoint(
  mesh: THREE.Mesh,
  metrics: ArmMetrics,
  y: number,
  angle: number
): { point: THREE.Vector3; normal: THREE.Vector3 } | null {
  const dir = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle));
  // Apuntado al centro del brazo A ESA ALTURA, no al origen de la escena. Ver
  // buildProfile: el eje del antebrazo no pasa por el origen, así que un rayo
  // tirado contra (0,y,0) entra de refilón y pega en una cara casi tangente.
  const center = centerAt(metrics, y);
  // 0,5 m es cómodamente más que el radio de cualquier parte del brazo (el
  // máximo medido es 6 cm), así que el origen del rayo siempre queda afuera.
  const origin = new THREE.Vector3(center.x, y, center.z).addScaledVector(dir, 0.5);

  const raycaster = new THREE.Raycaster(origin, dir.clone().negate(), 0, 1);
  const hits = raycaster.intersectObject(mesh, false);
  if (hits.length === 0) return null;

  const hit = hits[0];
  const normal = hit.face
    ? hit.face.normal.clone().transformDirection(mesh.matrixWorld)
    : dir.clone();
  return { point: hit.point.clone(), normal };
}

/**
 * Orientación del decal: apoyado sobre la superficie, derecho, y con un giro
 * propio alrededor de la normal.
 *
 * <Decal> de drei sabe orientarse solo si se le pasa `rotation` como número,
 * pero acá se calcula por tres razones:
 *
 * 1. Su tipo declarado no acepta `number` aunque el runtime sí (mirá el
 *    useLayoutEffect de node_modules/@react-three/drei/core/Decal.js). Pasárselo
 *    igual obligaría a un cast a Euler que sería mentira.
 * 2. Para orientarse busca el VÉRTICE más cercano leyendo
 *    `geometry.attributes.position.array` de corrido — y en ESTE modelo los
 *    atributos están entrelazados, así que ese array no son posiciones sino
 *    posición+normal+tangente+UV mezcladas. La normal que sacaría es basura.
 *    Nosotros ya tenemos la normal exacta de la cara donde pegó el rayo.
 * 3. Con una base explícita se puede razonar. La receta de drei —lookAt y dos
 *    giros de PI— deja el eje Y del decal apuntando a -Y del mundo, o sea el
 *    diseño de cabeza.
 *
 * La base se arma derecha y con significado: Z hacia AFUERA por la normal, Y
 * hacia arriba del brazo, X hacia la derecha visto desde afuera. Así el diseño
 * sale derecho y sin espejar. Que Z apunte para afuera y no para adentro no
 * cambia nada: DecalGeometry saca las UV de X e Y, y usa Z solo como
 * profundidad de recorte, en las dos direcciones desde el centro de la caja.
 */
export function decalOrientation(normal: THREE.Vector3, spin: number): THREE.Euler {
  const zAxis = normal.clone().normalize();

  // Si la normal llegara a ser casi vertical (una cara mirando para arriba), el
  // producto vectorial con Y se degenera. No pasa en el antebrazo, donde las
  // normales son radiales, pero cuesta dos líneas cubrirlo.
  const up = Math.abs(zAxis.y) > 0.99
    ? new THREE.Vector3(0, 0, 1)
    : new THREE.Vector3(0, 1, 0);

  const xAxis = new THREE.Vector3().crossVectors(up, zAxis).normalize();
  const yAxis = new THREE.Vector3().crossVectors(zAxis, xAxis).normalize();

  const basis = new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis);
  const q = new THREE.Quaternion().setFromRotationMatrix(basis);
  // El giro del diseño va alrededor de su propio Z (la normal), así que se
  // multiplica por derecha: es una rotación en el espacio local del decal.
  q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), spin));

  return new THREE.Euler().setFromQuaternion(q);
}
