# Datos semilla — E35 · Confiabilidad de récords (KAN-417)

Dataset mínimo para probar el resumen de confiabilidad del PF y el onboarding de marcas del atleta.

> Este archivo no inserta datos en la base. Es una especificación reproducible por API para QA/backend.
> Reemplazá los valores entre `<...>` por los IDs reales del entorno de prueba.

## Cómo agrupa el resumen

El resumen trabaja con los **récords vigentes** de cada atleta de la categoría:

- `TestedInSession` y `Epley` → **Testeado**.
- `Reported` → **Reportado**.
- `EstimatedEpley` → **Estimado**.
- Sin ningún récord vigente → **Sin datos**.

Un atleta **puede aparecer en más de un grupo** si tiene récords de distintos orígenes. Por ejemplo, Martín puede tener 1 récord testeado, 2 reportados y 5 estimados: aparece en los tres grupos.

Los números del resumen significan:

- En `Testeado`, `Reportado` y `Estimado`: **cantidad total de récords** de ese estado.
- En `Sin datos`: **cantidad de atletas** que no tienen ningún récord.
- En el detalle de cada grupo, cada atleta muestra **cuántos récords de ese estado tiene**.

Con `exerciseId`, solo se considera el récord vigente de ese ejercicio. Como hay un solo récord vigente por ejercicio, cada atleta aparecerá como máximo una vez por grupo y con `recordCount = 1`, o quedará en `Sin datos` si no tiene marca para ese ejercicio.

Los orígenes en la base son:
`0 = Tested`, `1 = Reported`, `2 = Estimated`, `3 = NoData`, `4 = Epley`.

## Escenario A — un atleta por grupo

Una categoría (`<CATEGORY_ID>`) con 4 atletas. Cada atleta debe quedar en un grupo distinto:

| Atleta            | Récord vigente    | Origen                        | Grupo esperado |
| ----------------- | ----------------- | ----------------------------- | -------------- |
| Ana Testeado      | Sentadilla 120 kg | `TestedInSession`             | **Testeado**   |
| Diego Reportado   | Sentadilla 100 kg | `Reported`                    | **Reportado**  |
| Carla Estimado    | Sentadilla 80 kg  | `EstimatedEpley` (onboarding) | **Estimado**   |
| Santiago Sin dato | Ninguno           | —                             | **Sin datos**  |

> Como cada atleta tiene un solo origen, en este escenario cada uno aparece en un único grupo.

## Escenario B — un atleta en varios grupos

Para validar que un atleta se repite según sus estados:

| Atleta | Récords vigentes                       | Grupos esperados                          |
| ------ | -------------------------------------- | ----------------------------------------- |
| Martín | 1 testeado, 2 reportados y 5 estimados | Testeado (1), Reportado (2), Estimado (5) |
| Jesica | Ninguno                                | Sin datos (1 atleta)                      |

En el detalle de `Testeado` debe verse `Martín — 1 récord`; en `Reportado`, `Martín — 2 récords`; en `Estimado`, `Martín — 5 récords`; y en `Sin datos`, `Jesica — sin récords`.

## 1. Preparar estructura

Crear (o reutilizar) en el entorno de prueba:

- 1 categoría: `<CATEGORY_ID>`
- Los atletas del escenario elegido, asociados a esa categoría.
- Ejercicios de carga suficientes para cargar un récord vigente por ejercicio.

## 2. Cargar los récords

### Ana — Testeado (lo carga el PF)

```http
POST /api/v1/athletes/<ATHLETE_ANA_ID>/records
Authorization: Bearer <TOKEN_PF>
Content-Type: application/json

{
  "exerciseId": "<EXERCISE_SENTADILLA_ID>",
  "weightOneRepMaxKg": 120,
  "origin": "TestedInSession"
}
```

### Diego — Reportado (lo carga el PF)

```http
POST /api/v1/athletes/<ATHLETE_DIEGO_ID>/records
Authorization: Bearer <TOKEN_PF>
Content-Type: application/json

{
  "exerciseId": "<EXERCISE_SENTADILLA_ID>",
  "weightOneRepMaxKg": 100,
  "origin": "Reported"
}
```

### Carla — Estimado (lo declara la atleta desde su panel)

Opción A, la que prueba el flujo real de onboarding: iniciar sesión como Carla y usar **Mis marcas**.

```http
POST /api/v1/me/onboarding
Authorization: Bearer <TOKEN_ATLETA_CARLA>
Content-Type: application/json

[
  {
    "exerciseId": "<EXERCISE_SENTADILLA_ID>",
    "weightOneRepMaxKg": 80
  }
]
```

Respuesta esperada: un array con el récord creado y `origin: "EstimatedEpley"`.

Opción B, solo para QA del gráfico, sin probar el onboarding: cargarlo como PF con origen estimado.

```http
POST /api/v1/athletes/<ATHLETE_CARLA_ID>/records
Authorization: Bearer <TOKEN_PF>
Content-Type: application/json

{
  "exerciseId": "<EXERCISE_SENTADILLA_ID>",
  "weightOneRepMaxKg": 80,
  "origin": "EstimatedEpley"
}
```

### Santiago / Jesica — Sin datos

No cargar ningún récord.

### Martín — varios orígenes

Cargar sus 8 récords vigentes en ejercicios distintos, usando los orígenes `TestedInSession`, `Reported` y `EstimatedEpley` según la distribución del escenario.

## 3. Verificar la respuesta cruda del back

```http
GET /api/v1/records/reliability?categoryId=<CATEGORY_ID>
Authorization: Bearer <TOKEN_PF>
```

Respuesta esperada para el escenario B (los porcentajes pueden variar por redondeo):

```json
{
  "categoryId": "<CATEGORY_ID>",
  "totalAthletes": 2,
  "totalRecords": 8,
  "groups": [
    {
      "group": "Tested",
      "athleteCount": 1,
      "recordCount": 1,
      "percentage": 12.5,
      "athletes": [{ "athleteId": "<ATHLETE_MARTIN_ID>", "name": "Martín", "recordCount": 1 }]
    },
    {
      "group": "Reported",
      "athleteCount": 1,
      "recordCount": 2,
      "percentage": 25,
      "athletes": [{ "athleteId": "<ATHLETE_MARTIN_ID>", "name": "Martín", "recordCount": 2 }]
    },
    {
      "group": "Estimated",
      "athleteCount": 1,
      "recordCount": 5,
      "percentage": 62.5,
      "athletes": [{ "athleteId": "<ATHLETE_MARTIN_ID>", "name": "Martín", "recordCount": 5 }]
    },
    {
      "group": "NoData",
      "athleteCount": 1,
      "recordCount": 0,
      "percentage": 50,
      "athletes": [{ "athleteId": "<ATHLETE_JESICA_ID>", "name": "Jesica", "recordCount": 0 }]
    }
  ]
}
```

También se puede verificar el origen real de cada marca:

```http
GET /api/v1/athletes/<ATHLETE_ID>/records?currentOnly=true
Authorization: Bearer <TOKEN_PF>
```

## 4. Checklist en la UI

Entrar como PF a **Confiabilidad de récords** (`/pf/records-reliability`) y seleccionar la categoría.

- [ ] La leyenda muestra el total de récords por estado: `Testeado (1)`, `Reportado (2)`, `Estimado (5)`.
- [ ] `Sin datos` muestra la cantidad de atletas sin récords: `Sin datos (1 atleta)`.
- [ ] El gráfico solo tiene segmentos de `Testeado`, `Reportado` y `Estimado`.
- [ ] Clic en `Testeado` → `Martín — 1 récord`.
- [ ] Clic en `Reportado` → `Martín — 2 récords`.
- [ ] Clic en `Estimado` → `Martín — 5 récords`.
- [ ] Clic en `Sin datos` → `Jesica — sin récords`.
- [ ] El mismo atleta aparece en varios grupos sin problema.
- [ ] `Ver detalle` de cada atleta abre sus récords en **solo lectura**, sin el formulario “Cargar un récord”.

## 5. Casos borde a probar

- [ ] **Filtro por ejercicio:** elegir un ejercicio sin récords y verificar que todos los atletas pasan a `Sin datos`.
- [ ] **Un solo récord por ejercicio:** con el filtro activo, un atleta no puede tener `recordCount > 1`.
- [ ] **Origen Epley:** un récord `Epley` debe contarse en `Testeado`.
- [ ] **Onboarding no sobreescribe:** Carla intenta declarar de nuevo el mismo ejercicio; el back no crea una marca nueva y el front muestra “No se modificó ninguna…”.
- [ ] **Transición Estimado → Testeado:** el PF carga una marca `TestedInSession` para un ejercicio estimado. El récord estimado de ese ejercicio deja de estar vigente y el testeado pasa a contar en `Testeado`; si no quedan estimados vigentes, la atleta desaparece de `Estimado`.
- [ ] **Categoría sin atletas:** no muestra gráfico ni leyenda, solo `0 atletas en la categoría · 0 récords cargados`.
- [ ] **Categoría con atletas pero sin récords:** muestra `No hay récords cargados en la categoría.` y todos en `Sin datos`.

## 6. Señales de bug

| Síntoma                                                                           | Dónde mirar                                                                   |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Un atleta con récords de dos orígenes aparece en un solo grupo                    | El handler todavía está usando la regla vieja de “récord más confiable”.      |
| El número de la etiqueta no coincide con la suma de los `recordCount` del detalle | El `recordCount` del grupo no se está calculando como suma de sus atletas.    |
| `Sin datos` muestra un número de récords en vez de atletas                        | El front está usando `recordCount` en lugar de `athleteCount` para ese grupo. |
| El gráfico incluye un segmento de `Sin datos`                                     | El gráfico debe graficar solo `Testeado`, `Reportado` y `Estimado`.           |
| El detalle permite cargar un récord                                               | El modal se abrió sin `readOnly` desde el panel de confiabilidad.             |
| Un récord Epley aparece en `Sin datos`                                            | `RecordSource.Epley` no se está mapeando a `Testeado`.                        |

## 7. Cómo recrear el escenario

Los atletas y récords no se pueden “resetear” si el back no expone un endpoint de borrado.
Para repetir la prueba:

1. Crear atletas nuevos en la misma categoría.
2. Repetir los pasos 2 y 3.
3. O usar otra categoría de prueba.

## 8. Pruebas automáticas

Backend:

```bash
dotnet test services/entrenamiento/Tests/Entrenamiento.Tests.csproj --filter FullyQualifiedName~GetRecordsReliabilityQueryHandlerTests
```

Frontend:

```bash
npx vitest run src/components/records/__tests__/RecordsReliabilityPanel.test.tsx
npx vitest run src/api/__tests__/recordsReliability.test.ts
```

Las pruebas del frontend mockean la API: validan render, payloads y estados de la UI, pero no la clasificación real del backend.
