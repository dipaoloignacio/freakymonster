import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0d0b0a", // fondo principal
        panel: "#141210", // paneles de tarjetas
        panel2: "#0f0d0b", // fondo de secciones alternas
        bone: "oklch(0.93 0.012 85)", // texto principal
        ash: "oklch(0.68 0.01 85)", // texto secundario
        ashLight: "oklch(0.75 0.01 85)", // texto de párrafos
        gore: "oklch(0.65 0.24 350)", // acento rojo/carmesí (CTAs)
        toxic: "oklch(0.72 0.19 142)", // acento verde tóxico (detalles, eyebrows)
        plum: "oklch(0.34 0.07 300)", // bordes
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
      },
      animation: {
        flicker: "flicker 6s infinite",
        grain: "grainShift 1.2s steps(2) infinite",
      },
    },
  },
  plugins: [],
};

export default config;
