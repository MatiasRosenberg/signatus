# Signatus — Sitio oficial

Landing institucional para **Signatus**, organización de esports argentina con foco en Counter-Strike 2 y proyección LATAM.

## Stack

HTML5 + CSS3 + JavaScript vanilla (ES6+). Sin frameworks ni dependencias. Solo carga fuentes de Google Fonts.

## Estructura

```
signatus/
├── index.html              Estructura semántica del sitio
├── css/
│   ├── reset.css           Normalización base
│   ├── tokens.css          Design tokens (variables CSS)
│   ├── layout.css          Contenedores, botones, tipografía
│   ├── components.css      Estilos por sección
│   ├── animations.css      Keyframes y reveals
│   └── responsive.css      Media queries (1024 / 768 / 480)
└── js/
    ├── utils.js            throttle / debounce / lerp / clamp
    ├── cursor.js           Cursor custom con lerp
    ├── nav.js              Scroll state + mobile menu + active link
    ├── hero-canvas.js      Red neural animada con canvas
    ├── ticker.js           Ticker horizontal infinito
    ├── scroll-reveal.js    IntersectionObserver reveals
    ├── faq.js              Accordion accesible
    └── main.js             Init + smooth scroll
```

## Cómo ejecutar

**Opción A — directo en navegador:**
Abrí `index.html` con doble click. Funciona sin servidor.

**Opción B — servidor local (recomendado):**
```bash
# con Python
python3 -m http.server 8000

# con Node
npx serve .
```
Después andá a `http://localhost:8000`.

## Secciones incluidas

1. **Hero** — canvas animado con red de nodos + CTAs + stats
2. **Ticker** — banner horizontal con hashtags y keywords
3. **Nosotros** — historia, misión, visión, valores
4. **Propuesta** — 3 cards: competencia, comunidad, inclusión
5. **Fortalezas** — 6 puntos diferenciales
6. **Proyecto Jalki** — sección destacada en amarillo con features
7. **Comunidad** — cards de Twitter, Instagram, email + banner
8. **Roadmap** — timeline con hitos pasados, presentes y futuros
9. **FAQ** — 6 preguntas con accordion accesible
10. **Contacto** — email grande + redes
11. **Footer** — brand + navegación + copyright

## Accesibilidad

- HTML semántico (`<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>`)
- Atributos ARIA en componentes interactivos
- Navegación por teclado en FAQ y menú mobile
- Soporte completo para `prefers-reduced-motion`
- Contraste AA/AAA en textos principales
- `:focus-visible` estilizado

## SEO

- `<title>` y `<meta description>` optimizados
- Open Graph + Twitter Card
- Estructura semántica con jerarquía h1 → h2 → h3
- `lang="es"` en el html
- URLs limpias con anchors

## Personalización rápida

**Colores** — editá `/css/tokens.css`:
```css
--clr-accent: #d4f542;   /* Color principal */
--clr-black:  #09090b;   /* Fondo */
```

**Fuentes** — cambiá el `<link>` de Google Fonts en `index.html` y actualizá `--font-display` / `--font-body` en `tokens.css`.

**Contenido** — todo está en `index.html`, sin CMS ni build step.

## Pendiente

- [ ] Logo real como SVG en lugar del texto "S"
- [ ] Favicon propio
- [ ] Imágenes de los jugadores (cuando estén disponibles)
- [ ] Integración de un formulario de contacto real
- [ ] Google Analytics o similar si quieren métricas
- [ ] Implementar imagen OG propia en `/assets/og-image.jpg`

## Deploy

Cualquier hosting estático:
- **Netlify / Vercel** — arrastrá la carpeta
- **GitHub Pages** — push y activá Pages
- **Cloudflare Pages** — conectá el repo

## Autoría

Diseño y código construidos específicamente para Signatus sobre la base de información pública disponible en su cuenta de Twitter/X `@SignatusTeam` a fecha de abril 2026. Información institucional adicional fue redactada de forma neutral y profesional donde la data pública no cubría los huecos.

---

**#GoSignatus**
