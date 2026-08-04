# Freaky Monster Tattoo Studio — sitio en Next.js

Conversión a Next.js (App Router + TypeScript + Tailwind) del diseño hecho en Claude Design.

## Cómo correrlo

```bash
npm install
npm run dev
```

Abrí http://localhost:3000

> Nota: `npm run build` necesita conexión a internet para bajar las fuentes
> de Google (Cinzel, Oswald, UnifrakturMaguntia) la primera vez. Si tu red
> bloquea `fonts.googleapis.com`, hacé el build en otra máquina o con VPN.

## Estructura

```
app/
  layout.tsx      → fuentes (Cinzel, Oswald, UnifrakturMaguntia) y metadata
  page.tsx        → ensambla todas las secciones
  globals.css     → estilos base, selección de texto, clip-paths
components/
  Navbar.tsx
  Hero.tsx
  About.tsx
  Gallery.tsx
  Artists.tsx
  Styles.tsx
  Testimonials.tsx
  Footer.tsx
  Grain.tsx       → efecto de textura/grano sobre toda la página
data/
  content.ts      → acá editás galería, artistas, estilos y testimonios
public/
  logo.png        → logo grande del hero
  nav-logo.jpg     → logo chico del navbar/footer
  hero.jpg         → foto de fondo del hero
```

## Qué falta completar (contenido real)

1. **Fotos de tatuajes reales** — reemplazá los placeholders de `Gallery.tsx`
   por imágenes reales en `public/gallery/` y actualizá `data/content.ts`.
2. **Fotos de los artistas** — mismo caso en `Artists.tsx`.
3. **Foto del interior del local** — en `About.tsx`.
4. **Links reales de redes sociales** — en `Footer.tsx` (Instagram, TikTok,
   Facebook).
5. **Dirección y horarios reales** — en `Footer.tsx` (por ahora están con
   datos de ejemplo).
6. **Botón "Reservar turno"** — hoy es un ancla a `#contacto`. Si vas a usar
   un sistema de reservas (Calendly, WhatsApp, formulario propio), avisame
   y lo conecto.

## Paleta y tipografía (definidos en `tailwind.config.ts`)

| Token    | Uso                              |
|----------|-----------------------------------|
| `ink`    | Fondo principal (`#0d0b0a`)        |
| `panel`  | Fondo de tarjetas                  |
| `panel2` | Fondo de secciones alternas        |
| `bone`   | Texto principal                    |
| `ash`    | Texto secundario                   |
| `gore`   | Acento rojo/carmesí (CTAs)         |
| `toxic`  | Acento verde (eyebrows, detalles)  |
| `plum`   | Bordes                             |

Tipografías: `font-display` (Cinzel, títulos), `font-body` (Oswald, texto),
`font-gothic` (UnifrakturMaguntia, disponible si querés un logo en texto).
