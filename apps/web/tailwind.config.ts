import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    // lib/ también, porque acá viven clases de Tailwind y no solo lógica: los
    // estilos compartidos de los CTA (lib/buttonStyles.ts). Tailwind genera CSS
    // únicamente para las clases que ENCUENTRA en los archivos de esta lista,
    // así que sin esta línea esas clases no existen — y el fallo es silencioso:
    // compila, tipa y renderiza igual, solo que el botón no hace nada al pasarle
    // el mouse. Que es exactamente como se descubrió.
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0d0b0a", // fondo principal
        panel: "#141210", // paneles de tarjetas
        panel2: "#0f0d0b", // fondo de secciones alternas
        // El "/ <alpha-value>" no es decorativo: sin ese placeholder Tailwind
        // no sabe dónde inyectar la opacidad en un oklch() y descarta la clase
        // entera en silencio. Es decir, `bg-gore/10`, `border-plum/40` y
        // compañía no generaban NINGUNA regla CSS y los elementos quedaban con
        // el color por defecto del navegador. (Con los hex de arriba no hace
        // falta: esos Tailwind los sabe descomponer solo.)
        bone: "oklch(0.93 0.012 85 / <alpha-value>)", // texto principal
        ash: "oklch(0.68 0.01 85 / <alpha-value>)", // texto secundario
        ashLight: "oklch(0.75 0.01 85 / <alpha-value>)", // texto de párrafos
        gore: "oklch(0.65 0.24 350 / <alpha-value>)", // acento rojo/carmesí (CTAs)
        toxic: "oklch(0.72 0.19 142 / <alpha-value>)", // acento verde tóxico (detalles, eyebrows)
        plum: "oklch(0.34 0.07 300 / <alpha-value>)", // bordes
      },
      fontFamily: {
        display: ["var(--font-cinzel)", "serif"],
        gothic: ["var(--font-unifraktur)", "serif"],
        body: ["var(--font-oswald)", "sans-serif"],
        heading: ["var(--font-anton)", "sans-serif"],
      },
      keyframes: {
        flicker: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.94" },
          "52%": { opacity: "1" },
          "53%": { opacity: "0.9" },
          "55%": { opacity: "1" },
        },
        grainShift: {
          "0%": { transform: "translate(0,0)" },
          "100%": { transform: "translate(-4%,-6%)" },
        },
        // Saltito del ícono de gift card en la barra. La clave está en el
        // reposo: el movimiento ocupa el último 25% del ciclo y el resto queda
        // quieto. Un rebote continuo en una barra sticky —presente en TODAS las
        // pantallas y en todo el scroll— cansa a los dos minutos; así llama la
        // atención de a ratos y el ojo puede descansar entre una vez y otra.
        giftNudge: {
          "0%, 75%, 100%": { transform: "translateY(0)" },
          "82%": { transform: "translateY(-3px)" },
          "89%": { transform: "translateY(0)" },
          "94%": { transform: "translateY(-1.5px)" },
        },
      },
      animation: {
        flicker: "flicker 6s infinite",
        giftNudge: "giftNudge 3.2s ease-in-out infinite",
        grain: "grainShift 1.2s steps(2) infinite",
      },
    },
  },
  plugins: [],
};

export default config;
