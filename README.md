# Combat Suite

Suite de combate por turnos para un MHRPG. Dos herramientas en una web estática:

- **Calculadora de daño** — aplica el orden de defensas del sistema y devuelve el
  daño final paso a paso.
- **Gestor de combate** — trackea VIT en vivo, PA por ronda, inferioridad numérica
  y orden de turnos.

Es 100% client-side: cada cálculo corre en el navegador del visitante, sin backend
ni API. Se publica como sitio estático en GitHub Pages.

## Stack

- Vite + React
- Vitest para los tests de paridad de las fórmulas
- Deploy automático a GitHub Pages vía GitHub Actions

## Desarrollo

> Requiere Node 18 o superior.

```bash
npm install
npm run dev       # servidor de desarrollo
npm run build     # build de producción a /dist
npm run preview   # previsualiza el build ya compilado
npm test          # corre los tests del motor de cálculo
```

## Estructura

```
src/
├─ engine.js          # lógica pura de combate (compartida por las dos vistas)
├─ engine.test.js     # tests que congelan los números del sistema
├─ Calculadora.jsx    # UI de la calculadora de daño
├─ Tracker.jsx        # UI del gestor de combate
├─ App.jsx            # navegación por pestañas
├─ styles.css         # tokens y piel compartidos
└─ main.jsx           # entry point
```

## Caso de control

El número de referencia del sistema es `base 115 × multiplicador 1.35` sin
defensas → **155**. Está cubierto por un test: si un refactor rompe las fórmulas,
`npm test` falla.

## Deploy

Cada push a `main` dispara el workflow de GitHub Actions, que buildea y publica en
GitHub Pages. En *Settings → Pages → Build and deployment → Source* tiene que estar
seleccionado **GitHub Actions**.

URL: https://russoneta.github.io/combat-suite/
