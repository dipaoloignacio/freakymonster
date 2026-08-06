// Módulo con una sola exportación, a propósito: es lo que le permite al
// bundler separar el motor de animación en su propio chunk. Importar
// dinámicamente "motion/react" directo no sirve — esa entrada exporta todo el
// paquete y termina arrastrándolo entero al bundle inicial.
export { domAnimation as default } from "motion/react";
