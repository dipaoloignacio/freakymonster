/**
 * Diseños que se pueden probar en el previsualizador.
 *
 * OJO: hoy son los tres de relleno que genera
 * scripts/make-placeholder-designs.mjs. NO son flash del estudio.
 *
 * Lo que hay en public/gallery/ no sirve para esto: son fotos de tatuajes ya
 * hechos sobre piel (los cinco PNG tienen canal alpha pero opaco de punta a
 * punta), así que como decal proyectarían la foto del brazo de otra persona
 * encima del modelo. Para que el previsualizador tenga sentido comercial hace
 * falta arte plano: línea negra sobre fondo transparente.
 *
 * `heightCm` es el alto REAL con el que se propone el diseño al abrir, en
 * centímetros de piel. No es el tamaño de la imagen: un PNG de 1024 px puede
 * ser un tatuaje de 6 cm o de 20.
 */
export type TattooDesign = {
  id: string;
  label: string;
  image: string;
  /** Alto sugerido sobre la piel, en cm. */
  heightCm: number;
  /** ancho/alto de la imagen, para no deformar el diseño. */
  aspect: number;
};

export const designs: TattooDesign[] = [
  { id: "daga", label: "Daga", image: "/designs/daga.png", heightCm: 12, aspect: 512 / 1024 },
  { id: "ojo", label: "Ojo", image: "/designs/ojo.png", heightCm: 7, aspect: 1 },
  { id: "rayo", label: "Rayo", image: "/designs/rayo.png", heightCm: 10, aspect: 512 / 1024 },
];
