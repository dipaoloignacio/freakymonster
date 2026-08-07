/**
 * Feedback de hover de los CTA públicos.
 *
 * Vive acá y no copiado en cada componente porque estos botones aparecen en
 * siete lugares (Hero, Navbar de escritorio y de mobile, el modal de reserva,
 * las dos páginas de error y el wizard). Con el estilo escrito a mano en cada
 * uno, alcanza con tocar dos y olvidarse del resto para que el sitio quede con
 * botones que se comportan distinto según dónde estés parado.
 *
 * Son strings de clases de Tailwind y no un componente <Button> a propósito:
 * los siete call sites son <button> o <a> con tamaños, layout y handlers
 * propios, y envolverlos en un componente obligaría a exponer media docena de
 * props para terminar en el mismo lugar.
 */

/**
 * LA REGLA DEL LEVANTE: la sombra crece EXACTAMENTE lo que el botón se
 * desplaza. Con un corrimiento de 3px y una sombra que pasa de 6 a 9, la
 * esquina lejana de la sombra queda clavada en el mismo punto de la pantalla y
 * lo único que cambia es la separación entre el botón y su sombra — que es
 * justo lo que el ojo lee como "se despegó de la superficie".
 *
 * Si la sombra creciera menos que el desplazamiento, el botón parecería
 * arrastrarse en diagonal; si creciera más, la sombra saldría disparada sola.
 *
 * 150ms: abajo de ~100 el cambio se siente instantáneo y no se percibe como
 * movimiento, y arriba de ~250 el botón queda "blandito" y se nota el retardo
 * al pasar rápido por encima. `ease-out` porque arranca rápido y frena al
 * final, que es como se mueve algo que tiene peso.
 */
export const CTA_SOLID =
  "transition-all duration-150 ease-out " +
  "shadow-[6px_6px_0_rgba(0,0,0,0.5)] " +
  "hover:-translate-x-[3px] hover:-translate-y-[3px] hover:shadow-[9px_9px_0_rgba(0,0,0,0.55)] " +
  // Al apretar vuelve a su lugar y la sombra se achica por debajo del reposo:
  // el botón se hunde. Sin esto el click no tiene ninguna respuesta y el hover
  // se queda colgado en mobile, donde no hay puntero que se vaya.
  "active:translate-x-0 active:translate-y-0 active:shadow-[3px_3px_0_rgba(0,0,0,0.5)]";

/**
 * Igual, para los CTA chicos (barra, modal, páginas de error). Mismos tiempos,
 * misma regla; solo cambian las distancias, porque una sombra de 6px en un
 * botón de 40px de alto lo tapa más que acompañarlo.
 */
export const CTA_SOLID_COMPACT =
  "transition-all duration-150 ease-out " +
  "shadow-[3px_3px_0_rgba(0,0,0,0.45)] " +
  "hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[5px_5px_0_rgba(0,0,0,0.5)] " +
  "active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0_rgba(0,0,0,0.45)]";

/**
 * Botón de contorno: al pasar por encima se rellena con su propio color de
 * borde y el texto pasa a ink para no perder contraste.
 *
 * Es el mismo patrón que ya usa el resto del sitio —los botones "Editar" del
 * panel (`hover:bg-toxic hover:text-ink`) y el de reintentar de
 * reservation/shared.tsx (`hover:bg-gore hover:text-ink`)—, así que no inventa
 * un lenguaje nuevo: lo extiende a los que faltaban.
 *
 * `transition-colors` y no `transition-all`: acá no se mueve nada, y animar
 * "all" incluiría propiedades que no cambian.
 */
export const CTA_OUTLINE_ASH =
  "transition-colors duration-150 hover:bg-ash hover:text-ink";
