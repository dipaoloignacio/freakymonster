/**
 * Diseños que se pueden probar en el previsualizador.
 *
 * Lo que hay en public/gallery/ NO sirve acá: son fotos de tatuajes ya hechos
 * sobre piel (los cinco PNG tienen canal alpha pero opaco de punta a punta), así
 * que como decal proyectarían la foto del brazo de otra persona encima del
 * modelo. Lo que sirve es arte plano: línea negra sobre fondo transparente.
 */
export type TattooDesign = {
  id: string;
  label: string;
  image: string;
  /**
   * Alto de la CAJA del diseño sobre la piel, en cm, al seleccionarlo.
   *
   * Ojo con la diferencia entre la caja y la tinta: el decal escala la imagen
   * entera, y ninguna de estas imágenes está recortada al ras. En la golondrina
   * la tinta ocupa el 74% del alto del PNG, así que una caja de 11 cm es un
   * pájaro de ~8 cm. Los valores de acá ya están elegidos mirando la tinta, no
   * el archivo — si se agrega un diseño nuevo, conviene medirlo:
   *   convert archivo.png -trim info:-
   */
  heightCm: number;
  /** ancho/alto de la IMAGEN, para no deformar el diseño. */
  aspect: number;
  /** true = relleno para probar, no es flash del estudio. */
  placeholder?: boolean;
};

export const designs: TattooDesign[] = [
  // Flash real. 800x800 con transparencia de verdad.
  { id: "rosa", label: "Rosa", image: "/designs/tatto1.png", heightCm: 12, aspect: 1 },
  { id: "golondrina", label: "Golondrina", image: "/designs/tatto2.png", heightCm: 11, aspect: 1 },

  // De relleno, los genera scripts/make-placeholder-designs.mjs. Se van cuando
  // haya suficiente flash real.
  { id: "daga", label: "Daga", image: "/designs/daga.png", heightCm: 12, aspect: 512 / 1024, placeholder: true },
  { id: "ojo", label: "Ojo", image: "/designs/ojo.png", heightCm: 7, aspect: 1, placeholder: true },
  { id: "rayo", label: "Rayo", image: "/designs/rayo.png", heightCm: 10, aspect: 512 / 1024, placeholder: true },
];
