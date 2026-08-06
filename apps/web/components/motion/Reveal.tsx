"use client";

import type { ReactNode } from "react";
import { LazyMotion, useReducedMotion } from "motion/react";
// `m` desde la entrada dedicada: "motion/react" reexporta el paquete entero,
// así que traerlo de ahí mete el motor completo en el bundle inicial aunque
// después nunca se use el componente `motion`.
// Exporta los elementos sueltos (div, a, span…), no un objeto `m`.
import { div as MotionDiv } from "motion/react-m";

/**
 * Las features van con import dinámico, no estático. Con
 * `features={domAnimation}` importado arriba, LazyMotion NO difiere nada: el
 * motor entero termina en el bundle inicial igual (medido: la home pasaba de
 * 113 a 153 KB). Y un `import("motion/react")` inline es peor todavía (180 KB),
 * porque esa entrada exporta el paquete completo. Por eso el loader apunta a
 * ./features, un módulo con una sola exportación que el bundler sí puede
 * separar.
 */
const loadDomAnimation = () => import("./features").then((mod) => mod.default);

/** Cuánto sube el elemento mientras aparece. Suficiente para que se note, no
 *  tanto como para que el contenido "salte" al entrar. */
const SLIDE_DISTANCE = 24;

/** Retraso entre hermanos de una cascada. A 80ms se lee como secuencia; más
 *  arriba empieza a sentirse lento en una grilla de 4 tarjetas. */
export const STAGGER_STEP = 0.08;

/**
 * Aparición al entrar en pantalla: fade + un empujón sutil hacia arriba.
 *
 * `once: true` para que no se repita al hacer scroll de ida y vuelta —
 * una animación que vuelve a dispararse cada vez que pasás pasa de detalle a
 * distracción. El `margin` negativo la arranca ~100px antes de que el
 * elemento sea totalmente visible, así llega animado en vez de empezar a
 * moverse justo cuando lo estás mirando.
 *
 * Con `prefers-reduced-motion` activado NO se anima nada: se devuelve el
 * contenido tal cual, visible desde el primer frame. Es importante que sea
 * así y no una versión "más corta" — quien lo activa muchas veces lo hace por
 * mareos o migrañas, y un movimiento rápido es peor que uno lento.
 *
 * Usa `m` + LazyMotion en vez del `motion` completo: `motion.div` arrastra
 * todo el motor de animación al bundle inicial, mientras que `m` deja apenas
 * el componente y carga las features aparte. En la home, que es la página más
 * visitada, esa diferencia importa.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  /** Segundos. Para cascadas, `index * STAGGER_STEP`. */
  delay?: number;
  className?: string;
}) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <LazyMotion features={loadDomAnimation} strict>
      <MotionDiv
        className={className}
        initial={{ opacity: 0, y: SLIDE_DISTANCE }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.5, delay, ease: "easeOut" }}
      >
        {children}
      </MotionDiv>
    </LazyMotion>
  );
}
