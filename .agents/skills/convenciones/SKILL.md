---
name: convenciones
description: Revisa los cambios de la rama actual contra develop y marca todo lo que no sigue las convenciones del front de ProTraining (idioma, componentes, carpetas, llamadas a la API, estilos y marca, Git). No revisa la lógica del código. Usar antes de commitear o abrir un PR, o cuando alguien escribe /convenciones.
---

# Revisión de convenciones del front de ProTraining

Revisás **solo convenciones**: nombres, idioma, ubicación de archivos, reglas del proyecto. **No** opinás sobre si la lógica está bien ni sobre el diseño de las pantallas: eso va en la revisión del PR.

Quien te usa puede ser un dev junior. Explicá cada problema en español simple, citando la regla y mostrando cómo quedaría corregido.

## Paso 1: qué cambió

1. Rama actual: `git branch --show-current`.
2. Traé lo último de develop si se puede (`git fetch origin develop`; si pide contraseña o falla, seguí con lo que haya).
3. Archivos cambiados respecto de develop, incluyendo lo que todavía no está commiteado:
   - `git diff --name-status origin/develop...HEAD`
   - `git status --short`
4. Leé el diff de cada archivo (`git diff origin/develop...HEAD -- <archivo>` y `git diff -- <archivo>` para lo no commiteado). Revisá **solo las líneas que agregó o cambió esta rama**, no el código viejo.
5. Ignorá `node_modules/`, `dist/`, `package-lock.json` y los íconos generados de `public/assets/`.

Si no hay cambios, decilo y terminá.

## Paso 2: las reglas

La fuente de verdad es la sección **"Convenciones"** del `README.md` del repo: si contradice algo de acá, manda el README.

### 1. Idioma

**La regla: lo que lee una persona va en español; todo lo demás, en inglés.**

| Qué                                                                      | Idioma                            | Ejemplo bien                   | Ejemplo mal                        |
| ------------------------------------------------------------------------ | --------------------------------- | ------------------------------ | ---------------------------------- |
| Carpetas y archivos                                                      | **Inglés**                        | `pages/coach/AthletesPage.tsx` | `pages/pf/PaginaAtletas.tsx`       |
| Componentes, funciones, variables, props, tipos                          | **Inglés**                        | `AthleteCard`, `sleepHours`    | `TarjetaAtleta`, `horasSueno`      |
| Rutas de las pantallas                                                   | **Inglés**                        | `/athlete/check-in`            | `/atleta/control`                  |
| Clases de CSS y tokens                                                   | **Inglés**                        | `.athlete-card`, `--danger-bg` | `.tarjeta-atleta`, `--fondo-error` |
| Campos de los datos de la API                                            | **Inglés**, igual que el contrato | `firstName`                    | `nombre`                           |
| Textos de las pantallas, incluidos `aria-label`, `title` y `placeholder` | **Español**                       | `"Guardar check-in"`           | `"Save check-in"`                  |
| Comentarios en el código                                                 | **Español**                       | `// Solo las lesiones activas` |                                    |
| Documentación (README, descripción del PR)                               | **Español**                       |                                |                                    |

Un comentario en inglés **no** es error, no lo marques.

Excepción (no es error): `pf` / `PF` (preparador físico), por ejemplo la ruta `/pf`.

Si hay muchos casos iguales, agrupalos en un solo punto con la lista de archivos.

### 2. Componentes y carpetas

- Un componente por archivo, con el mismo nombre en PascalCase: `AthleteCard.tsx` exporta `AthleteCard`.
- Exports con nombre (`export function ...`). **Mal:** `export default`.
- Las pantallas terminan en `Page` y van en la carpeta de su rol: `pages/coach/` (PF) o `pages/athlete/`. Una pantalla nueva tiene que estar en `router.tsx`.
- Un componente que se importa desde dos o más pantallas va en `components/`. Si está en una pantalla y otra lo importa de ahí, avisá.
- Hooks propios en `hooks/`, con nombre `useAlgo.ts`.
- Props tipadas con una `interface` (`interface AthleteCardProps`).

### 3. Llamadas a la API

- **Solo** desde `src/api/`, con `apiRequest` de `api/client.ts`. Un `fetch` o un `axios` en una pantalla, un componente o un hook es ❌.
- Un archivo por módulo del back: `api/athletes.ts`, `api/checkIns.ts`.
- Los tipos de las respuestas van en `types/` y los campos se llaman como en el contrato (`../protraining-back/contracts/<servicio>.yaml` si está clonado). Si un campo no coincide con el contrato, avisá como ⚠️.
- Errores: se muestra el `message` del `ApiError` (viene del ProblemDetails del back, en español). Un `catch` vacío que se traga el error es ❌.
- Nada de `any`. Si ESLint no lo marcó porque tiene un `eslint-disable`, marcalo igual.
- El token se lee solo en `api/client.ts`. Un `localStorage.getItem('protraining_token')` en otro lado es ❌.

### 4. Estilos y marca

- **Ningún color fuera de `src/styles/tokens.css`**: ni `#hex`, ni `rgb()`/`rgba()`, ni nombres (`white`), tampoco en `style={{...}}` ni en props de gráficos (Recharts: `stroke`, `fill`). En el CSS lo frena Stylelint; en el `.tsx` no, así que revisalo vos. Lo correcto es `var(--token)`.
- Un token nuevo se nombra por su uso (`--danger-bg`), no por el color (`--red-100`).
- Colores de la marca: navy `#023050`, azul `#0070C0`, fondo claro `#E3E4E6`, fondo oscuro `#202429`. Un token nuevo que se parezca a la marca pero no sea igual (`#023150`, `#0071C1`), avisá como ⚠️.
- Tipografía: solo Montserrat. Un `font-family` con otra fuente o un `@font-face` nuevo es ❌.
- El nombre de la marca se muestra con `<Brand />`. "ProTraining" escrito a mano como logo es ⚠️ (en un texto común está bien).
- `style={{...}}` solo para un valor calculado (por ejemplo `width: \`${porcentaje}%\``). Para lo demás, una clase. `!important` es ❌.
- Logos nuevos: en `brand/` (no se publican) o, si la app los muestra, en `public/assets/` con nombre en inglés y descriptivo (`logo-horizontal.svg`, no `logo2.png`).

### 5. Configuración y seguridad

- **Nunca** secretos en el repo: claves, tokens o URLs con credenciales.
- La URL del back no se escribe en el código: todo va por `/api/...` (lo resuelven Vite y nginx).
- Paquetes nuevos de npm: avisá que se agregaron (hay que mencionarlo en el PR). Si es una librería de componentes o de estilos (MUI, Tailwind, Bootstrap, styled-components), avisá como ⚠️: el front usa CSS propio con tokens.
- Nada de `console.log` olvidados. `console.error` dentro de un `catch` que además muestra el error está bien.
- No mostrar ni guardar datos médicos del atleta en `localStorage`.

### 6. Git

- La rama sale de `develop` y se llama `feature/KAN-XXX-descripcion` (o `fix/`, `refactor/`, `chore/`). Si se llama distinto o no tiene el número de Jira, avisá.
- El PR va a **`develop`**, nunca a `main`. (Esto y la descripción del PR no se pueden ver desde el diff: recordalo en una línea al final, no lo marques.)
- Archivos que no deberían estar en el commit: `.env`, `dist/`, `node_modules/`, archivos personales (`CLAUDE.md`, notas).

## Paso 3: chequear

Corré, en este orden: `npm run lint`, `npm run format:check` y `npm run build`. Si algo falla, va primero en el informe: el CI lo va a rechazar igual. Si falla `format:check`, la solución es `npm run format`.

## Paso 4: el informe

Respondé en español, con este formato (los ejemplos de código dentro del informe van en su propio bloque de código):

```
## Revisión de convenciones · <rama>

Revisé N archivos (lista corta).
Lint: ✅ / ❌ · Formato: ✅ / ❌ · Build: ✅ / ❌ (con el error) / no corrido.

### ❌ Hay que corregir (N)
1. **<regla>** · `ruta/archivo.tsx:línea`
   Qué pasa: ...
   Cómo queda bien: (bloque de código con la versión corregida)

### ⚠️ Para revisar (N)
(cosas que pueden estar bien según el caso, por ejemplo una diferencia con el contrato)

### ✅ Bien
(qué reglas cumple; una línea por regla)
```

Agrupá problemas iguales en un solo punto con la lista de archivos y líneas, en vez de repetirlos.

Al final, una línea: "Listo para commitear" si no hay ❌, o "Corregí los ❌ y volvé a correr /convenciones".

**No corrijas nada por tu cuenta.** Si el usuario te pide que lo corrijas, recién ahí lo hacés.
