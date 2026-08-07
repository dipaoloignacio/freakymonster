"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

/**
 * Aísla la carga de un asset para que un archivo faltante o roto inutilice sólo
 * esa entrada y no la página.
 *
 * Sin esto, una ruta muerta en data/designs.ts tumbaba el previsualizador
 * ENTERO: useTexture (useLoader por debajo) lanza la excepción durante el
 * render, sube hasta el ErrorBoundary de react-three-fiber y ese desmonta el
 * canvas completo. Pasó de verdad — se borró tatto1.png y la página quedó en
 * blanco, sin brazo, sin sliders y sin ninguna pista de cuál era el archivo.
 *
 * Va ADENTRO del <mesh> del brazo a propósito: como no renderiza ningún objeto
 * de three, el decal que envuelve sigue teniendo al brazo como padre, que es de
 * donde <Decal> saca la malla sobre la cual proyectar.
 *
 * Necesita `key` desde afuera (el id del diseño). Un ErrorBoundary que ya falló
 * se queda en estado de error para siempre; remontarlo con otra key es lo que
 * hace que elegir otro diseño vuelva a intentar.
 */
export class AssetErrorBoundary extends Component<
  { children: ReactNode; onError?: (message: string) => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Se avisa para arriba para poder marcar la entrada como rota en el
    // selector. Va en componentDidCatch y no en getDerivedStateFromError porque
    // el segundo corre durante el render y no puede tocar estado ajeno.
    this.props.onError?.(error.message || String(error));
    if (process.env.NODE_ENV !== "production") {
      console.error("Asset que no cargó:", error, info.componentStack);
    }
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
