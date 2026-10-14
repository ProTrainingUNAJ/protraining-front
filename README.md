# ProTraining · front

PWA de ProTraining para preparadores físicos (PF) y atletas. React 18, TypeScript y Vite. El back está en el repo `protraining-back` y se clona al lado (`../protraining-back`).

## Cómo levantarlo

Necesitás **Node 22**.

```bash
npm ci
npm run dev
```

Abre en `http://127.0.0.1:5173`. Las llamadas a `/api/...` van al gateway del back (`http://127.0.0.1:8000`) sin el `/api`. Si el gateway está en otro lado, usá `DEV_API_TARGET=http://otra-url npm run dev`.

## Scripts

| Script                        | Qué hace                                                                          |
| ----------------------------- | --------------------------------------------------------------------------------- |
| `npm run dev`                 | Levanta la app en modo desarrollo.                                                |
| `npm run build`               | Revisa los tipos (`tsc`) y arma la app en `dist/`.                                |
| `npm run lint`                | ESLint sobre el código y Stylelint sobre el CSS.                                  |
| `npm run format`              | Le da formato a todo con Prettier.                                                |
| `npm run format:check`        | Revisa el formato sin cambiar nada (es lo que corre el CI).                       |
| `npm run generate-pwa-assets` | Vuelve a generar los íconos de la PWA desde `public/assets/isotype-gradient.png`. |
| `npm run generate:api`        | Regenera los tipos y el cliente del front desde los contratos OpenAPI del back.   |

El CI (`.github/workflows/ci.yml`) corre `lint`, `format:check` y `build` en cada PR. Antes de pushear, corré `npm run format` y `npm run lint`.

## Estructura

```
src/
  api/         ← la única parte que llama al back (client.ts y un archivo por módulo)
  components/  ← componentes que se usan en más de una pantalla
  hooks/       ← hooks propios (useAlgo.ts)
  layouts/     ← armado de cada rol: CoachLayout (PF) y AthleteLayout (atleta)
  pages/
    coach/     ← pantallas del PF (ruta /pf/...)
    athlete/   ← pantallas del atleta (ruta /athlete/...)
  styles/      ← tokens.css (colores y medidas) y el CSS de cada área
  types/       ← tipos de los datos que vienen de la API
  router.tsx   ← todas las rutas
brand/         ← logos originales (no se publican con la app)
```

## Convenciones

### Idioma

**La regla: lo que lee una persona va en español; todo lo demás, en inglés.** Es la misma regla que en el back.

| En **español**                                                     | En **inglés**                                                      |
| ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| Textos de las pantallas (títulos, botones, mensajes, `aria-label`) | Carpetas y archivos                                                |
| Comentarios en el código, para que todo el equipo lo entienda      | Componentes, funciones, variables, props, tipos                    |
| Documentación: README, Jira, PRs                                   | Rutas de las pantallas (`/pf/athletes`, `/athlete/check-in`)       |
|                                                                    | Clases de CSS y tokens (`coach-menu-item`, `--danger-bg`)          |
|                                                                    | Campos de los datos de la API (`firstName`, como en los contratos) |

Excepciones: `pf` (preparador físico), en la ruta `/pf` y en `PF`.

### Componentes y archivos

- Un componente por archivo, con el mismo nombre en PascalCase: `AthleteCard.tsx` exporta `AthleteCard`.
- Exports con nombre (`export function AthletesPage`), no `export default`.
- Las pantallas terminan en `Page` y van en la carpeta de su rol: `pages/coach/AthletesPage.tsx`. La ruta se agrega en `router.tsx`.
- Un componente que se usa en una sola pantalla puede quedar en el mismo archivo de la pantalla; si se usa en dos o más, va a `components/`.
- Hooks propios en `hooks/`, con nombre `useAlgo.ts`.
- Props tipadas con una `interface` arriba del componente (`interface AthleteCardProps`).

### Llamadas a la API

- **Solo** desde `src/api/`, con `apiRequest` de `client.ts`. Una pantalla nunca hace `fetch` directo.
- Un archivo por módulo del back: `api/athletes.ts`, `api/checkIns.ts`.
- Los tipos de lo que devuelve la API van en `types/` y usan los mismos nombres de campo que el contrato (`contracts/` del back).
- Los errores llegan como `ApiError`, con el `detail` del ProblemDetails ya en español: se muestra ese mensaje, no uno inventado.
- Nada de `any`: si no sabés el tipo, `unknown`.

### Estilos y marca

- **Los colores van solo en `src/styles/tokens.css`.** En el resto del CSS se usan con `var(--token)`. Stylelint rechaza un `#fff`, un `rgb(...)` o un `white` fuera de ese archivo.
- Si falta un color, se agrega un token con nombre por su uso (`--danger-bg`), no por el color (`--red-100`).
- Colores de la marca: navy `#023050` (primario) y azul `#0070C0` (secundario). Fondo claro `#E3E4E6` y oscuro `#202429`.
- Tipografía: Montserrat (paquete `@fontsource-variable/montserrat`, todos los pesos). No se agregan otras fuentes.
- El nombre de la marca se muestra con el componente `Brand` ("**PRO**TRAINING"), no se escribe a mano.
- Estilos sin inline (`style={{...}}`), salvo un valor que se calcula en el momento (un ancho de una barra de progreso).
- Nada de `!important`.

### Git

- La rama sale de `develop` y se llama `feature/KAN-XXX-descripcion` (o `fix/`, `refactor/`, `chore/`).
- Commits: `tipo(área): descripción (KAN-XXX)`, por ejemplo `feat(athletes): listado de atletas (KAN-313)`.
- El PR va a **`develop`**, nunca a `main`.

Para revisar una rama antes del PR, con Claude Code: `/convenciones`.
