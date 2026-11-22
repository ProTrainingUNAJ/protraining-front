import axios from 'axios';
import { httpClient, extractErrorMessage } from './axiosClient';
import {
  getActiveInjuriesSummary as getActiveInjuriesSummarySdk,
  type AthleteActiveInjurySummary,
} from './generated/seguimiento';
import {
  saveOfflineCheckIn,
  getPendingCheckIns,
  deletePendingCheckIn,
  OfflineCheckInPayload,
} from '../services/checkInOfflineService';
import { structureService } from './structureService';
import { dateInArgentina, todayInArgentina } from '../utils/argentinaDate';
import {
  AthleteTrafficLightItem,
  PainZoneReport,
  TrafficLightStatus,
} from '../components/monitoring/trafficLight.types';
import { PROTRAINING_MUSCLES } from '../components/athlete/bodyMuscleData';
import { OFFICIAL_JOINTS, OFFICIAL_MUSCLE_GROUPS } from '../components/athlete/muscleMap.config';
import { resolveMuscleId } from '../utils/painMuscleResolver';
import { Category } from '../types/structure';
import type { AthleteWeek } from '../types/seguimiento';
import { getAthleteWeek as getAthleteWeekRequest } from './generated/seguimiento';
import {
  getDailyLoad as getDailyLoadRequest,
  registerDailyLoad as registerDailyLoadRequest,
  getCategoryAttendanceToday as getCategoryAttendanceTodayRequest,
  getCategoryTrafficLightToday as getCategoryTrafficLightTodayRequest,
  setAttendance as setAttendanceRequest,
  type AthleteTrafficLightSummary,
  type AthleteAttendanceSummary,
  type DailyLoadActivity,
  type DailyLoadRequest,
  type DailyLoadResponse,
  type CategoryAttendanceSummary,
  type CheckIn,
} from './generated/seguimiento';

export interface CheckInSubmitRequest {
  sleepHours: number;
  sleepQuality: number;
  muscleSoreness: number;
  fatigueLevel: number;
  moodRate: number;
  stressLevel: number;
  effortRate?: number | null;
  isSick: boolean;
  painZones?: string | null;
  hasActiveInjury: boolean;
  injuries?: { injuryId: string; level: number }[];
}

export interface CheckInSubmitResponse {
  message: string;
  trafficLight: 'Green' | 'Yellow' | 'Red';
  trafficLightReason?: string | null;
  checkIn?: CheckIn;
  isOffline?: boolean;
}

/**
 * Submits the athlete daily check-in.
 * If offline or network unreachable, safely stores into IndexedDB for automatic later sync.
 */
export async function submitCheckIn(
  athleteId: string,
  payload: CheckInSubmitRequest,
): Promise<CheckInSubmitResponse> {
  const isNetworkOffline = typeof navigator !== 'undefined' && !navigator.onLine;

  if (isNetworkOffline) {
    await saveOfflineCheckIn(athleteId, payload);
    return {
      message: 'Check-in guardado localmente (sin conexión). Se sincronizará automáticamente.',
      trafficLight: payload.hasActiveInjury ? 'Red' : 'Yellow',
      trafficLightReason: 'Guardado offline en el dispositivo. Pendiente de sincronización.',
      isOffline: true,
    };
  }

  try {
    const response = await httpClient.post<CheckInSubmitResponse>(
      `/seguimiento/api/v1/athletes/${athleteId}/check-in`,
      payload,
    );

    return {
      ...response.data,
      isOffline: false,
    };
  } catch (error: unknown) {
    const isNetworkError =
      (error as { code?: string })?.code === 'ERR_NETWORK' ||
      !(error as { response?: unknown })?.response;

    if (isNetworkError) {
      await saveOfflineCheckIn(athleteId, payload);
      return {
        message: 'No se pudo contactar al servidor. Check-in guardado localmente.',
        trafficLight: payload.hasActiveInjury ? 'Red' : 'Yellow',
        trafficLightReason: 'Guardado offline en el dispositivo. Pendiente de sincronización.',
        isOffline: true,
      };
    }

    const message = extractErrorMessage(error);
    throw new Error(message || 'Error al registrar el check-in.', { cause: error });
  }
}

/**
 * Synchronizes pending offline check-ins stored in IndexedDB with the backend.
 */
export async function syncPendingCheckIns(athleteId: string): Promise<number> {
  const pending = await getPendingCheckIns(athleteId);
  if (pending.length === 0) return 0;

  let syncedCount = 0;

  for (const record of pending) {
    if (!record.id) continue;
    try {
      // Se manda la fecha original del check-in para que el back conserve el día
      // en que se hizo, aunque la sincronización ocurra al día siguiente.
      await httpClient.post(`/seguimiento/api/v1/athletes/${record.athleteId}/check-in`, {
        ...record.payload,
        date: dateInArgentina(record.timestamp),
      });
      await deletePendingCheckIn(record.id);
      syncedCount += 1;
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      // Errores terminales: el back no va a aceptar este check-in nunca (fecha inválida,
      // atleta no vinculado, duplicado). Se descarta para no reintentar para siempre.
      if (status === 400 || status === 404 || status === 409) {
        await deletePendingCheckIn(record.id);
        continue;
      }
      // Red caída o 5xx: se corta y se reintenta al volver a conectar.
      break;
    }
  }

  return syncedCount;
}

/**
 * Descarta los check-ins pendientes de un día (p. ej. cuando el atleta ya hizo el
 * check-in online ese mismo día), para que el pendiente viejo no pise el nuevo.
 */
export async function discardPendingCheckInsForDate(
  athleteId: string,
  date: string,
): Promise<number> {
  const pending = await getPendingCheckIns(athleteId);
  const toDelete = pending.filter(
    (record) => record.id !== undefined && dateInArgentina(record.timestamp) === date,
  );
  await Promise.all(toDelete.map((record) => deletePendingCheckIn(record.id as number)));
  return toDelete.length;
}

/**
 * Re-exports offline utilities for components
 */
export { countPendingCheckIns, getPendingCheckIns } from '../services/checkInOfflineService';
export type { OfflineCheckInPayload };

// ---------------------------------------------------------------------------
// Semáforo del día por categoría
//
// Fuente única de verdad del semáforo de la PWA: consume el microservicio de
// seguimiento por el SDK generado (`getCategoryTrafficLightToday`), que viaja
// sobre el mismo `httpClient` de la app (auth, refresh y timeout incluidos).
// Los tipos de la respuesta son los del SDK, no interfaces escritas a mano,
// para que un cambio de contrato lo marque el compilador.
// Adapta ese DTO a los tipos de UI de las tarjetas y widgets.
// No existen mocks: el archivo `trafficLightData.ts` fue eliminado.
// ---------------------------------------------------------------------------

export interface TrafficLightCounts {
  all: number;
  red: number;
  yellow: number;
  green: number;
  gray: number;
}

const TRAFFIC_STATUS_LABELS: Record<TrafficLightStatus, string> = {
  red: 'Atención Crítica',
  yellow: 'Precaución',
  green: 'Óptimos',
  gray: 'Sin Check-in',
};

// Fallbacks: si la estructura cae y llegan nombres vacíos, la UI
// muestra estos textos en lugar de labels en blanco.
export const CATEGORY_NAME_FALLBACK = 'Categoría sin nombre';
export const ATHLETE_NAME_FALLBACK = 'Atleta sin nombre';

// hasReportedToday=false siempre se presenta como gris "pendiente" en la PWA,
// aunque el motor devuelva Amarillo por seguridad operativa.
function resolveStatus(summary: AthleteTrafficLightSummary): TrafficLightStatus {
  if (!summary.hasReportedToday) return 'gray';
  if (summary.trafficLight === 'Red') return 'red';
  if (summary.trafficLight === 'Yellow') return 'yellow';
  return 'green';
}

const OFFICIAL_MUSCLE_IDS = new Set<string>([
  ...OFFICIAL_MUSCLE_GROUPS.map((region) => region.id),
  ...OFFICIAL_JOINTS.map((joint) => joint.id),
]);

// painZones viene como "muscleId:nivel,muscleId:nivel" (ej: "cuadriceps_derecho:3", nivel 6 = lesión activa).
export function parsePainZones(raw?: string | null): PainZoneReport[] {
  if (!raw?.trim()) return [];

  return raw.split(',').flatMap((entry): PainZoneReport[] => {
    const [muscleId, levelRaw] = entry.split(':').map((part) => part.trim());
    if (!muscleId) return [];

    const isInjury =
      levelRaw?.toLowerCase().includes('activa') ||
      levelRaw?.toLowerCase().includes('lesion') ||
      levelRaw?.toLowerCase().includes('injury') ||
      levelRaw === '6';

    const numLevel = Number(levelRaw);
    const level = isInjury
      ? 6
      : Number.isFinite(numLevel) && numLevel > 0
        ? Math.min(5, numLevel)
        : 0;
    if (level <= 0) return [];

    const muscle = PROTRAINING_MUSCLES.find(
      (item) => item.id.toLowerCase() === muscleId.toLowerCase(),
    );

    // el backend agrega las lesiones clínicas con el id heredado de la ficha
    // ("isquiotibiales"), que no es una región del SVG ("isquiotibial_derecho"). Si el id
    // no es oficial, lo resolvemos por nombre para que el mapa del PF pinte la lesión.
    const canonicalId = muscle?.id ?? muscleId;
    const resolvedMuscleId = OFFICIAL_MUSCLE_IDS.has(canonicalId)
      ? canonicalId
      : resolveMuscleId(muscle?.name ?? muscleId);

    return [{ zone: muscle?.name ?? muscleId, muscleId: resolvedMuscleId || undefined, level }];
  });
}

function formatSleepQuality(sleepQuality?: number): string | undefined {
  if (sleepQuality === undefined) return undefined;
  if (sleepQuality >= 4) return 'Buena';
  if (sleepQuality === 3) return 'Regular';
  return 'Mala';
}

// reportedAt (ISO UTC) → "08:15 hs" en hora Argentina.
function formatReportedAt(reportedAt?: string | null): string | undefined {
  if (!reportedAt) return undefined;
  try {
    const time = new Intl.DateTimeFormat('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'America/Argentina/Buenos_Aires',
    }).format(new Date(reportedAt));
    return `${time} hs`;
  } catch {
    return undefined;
  }
}

/**
 * Mapea el resumen del backend (DTO del endpoint traffic-light-today) al tipo
 * de UI de las tarjetas del semáforo. Reglas:
 * - `hasReportedToday === false` → estado gris "Sin Check-in" (aunque el motor
 *   devuelva Amarillo por seguridad operativa).
 * - Nombres vacíos por caída de estructura → fallbacks exportados
 *   (`CATEGORY_NAME_FALLBACK` / `ATHLETE_NAME_FALLBACK`) en lugar de labels en blanco.
 * - `painZones` ("muscleId:nivel,...") se parsea a `PainZoneReport` con la paleta
 *   muscular oficial.
 */
export function mapTrafficLightSummaryToItem(
  summary: AthleteTrafficLightSummary,
  categoryName: string,
): AthleteTrafficLightItem {
  const status = resolveStatus(summary);
  const indicators = summary.indicators ?? undefined;
  const pains = parsePainZones(indicators?.painZones);
  const worstPain =
    pains.length > 0
      ? pains.reduce((worst, pain) => (pain.level > worst.level ? pain : worst))
      : undefined;

  return {
    id: summary.athleteId,
    name: summary.athleteName?.trim() || ATHLETE_NAME_FALLBACK,
    position: '',
    category: categoryName.trim() || CATEGORY_NAME_FALLBACK,
    status,
    statusLabel: TRAFFIC_STATUS_LABELS[status],
    recommendation: status === 'gray' ? '' : summary.trafficLightReason || '',
    sleepHours: indicators?.sleepHours,
    sleepQuality: formatSleepQuality(indicators?.sleepQuality),
    rpe: indicators?.effortRate ?? undefined,
    pains: pains.length > 0 ? pains : undefined,
    submittedAt: formatReportedAt(summary.reportedAt),
    affectedMuscle: worstPain?.zone,
    isSick: indicators?.isSick,
    hasActiveInjury: indicators?.hasActiveInjury,
    avatarUrl:
      typeof structureService?.getAthletePhotoUrl === 'function'
        ? structureService.getAthletePhotoUrl(summary.athleteId)
        : `/api/estructura/api/v1/athletes/${summary.athleteId}/photo`,
  };
}

/**
 * Consulta el semáforo tricolor de hoy de una categoría.
 * GET `/seguimiento/api/v1/categories/{id}/traffic-light-today` vía el SDK
 * generado `getCategoryTrafficLightToday`: el contrato y los tipos
 * salen del OpenAPI, no de interfaces escritas a mano.
 * Devuelve vacío si la respuesta es nula.
 * Errores: 404 → mensaje específico y en español de categoría
 * inexistente; el resto se traduce con `extractErrorMessage` (ProblemDetails).
 */
export async function getCategoryTrafficLightToday(
  categoryId: string,
): Promise<AthleteTrafficLightSummary[]> {
  try {
    const { data } = await getCategoryTrafficLightTodayRequest({
      path: { categoryId },
      throwOnError: true,
    });
    return data ?? [];
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response?.status === 404) {
      throw new Error('La categoría solicitada no existe o fue eliminada.', { cause: err });
    }
    throw new Error(extractErrorMessage(err), { cause: err });
  }
}

/**
 * Agrega el semáforo de TODAS las categorías visibles para el preparador físico
 * (dashboard: donas, alertas de dolor y progreso de check-in). Alimenta también
 * la deduplicación de atletas que pertenecen a más de una categoría.
 * Modo degradado: si la estructura de organizaciones/categorías cae o
 * una categoría responde error, esa categoría se omite silenciosamente y el
 * resto del plantel se sigue mostrando; nunca rompe el dashboard completo.
 */
export async function fetchAllCategoriesTrafficLight(): Promise<AthleteTrafficLightItem[]> {
  const organizations = await structureService.getOrganizations().catch(() => []);
  const categoriesByOrg = await Promise.all(
    organizations.map((organization) =>
      structureService.getCategories(organization.id).catch(() => [] as Category[]),
    ),
  );
  const categories = categoriesByOrg.flat();
  if (categories.length === 0) return [];

  const results = await Promise.all(
    categories.map(async (category) => {
      try {
        const summaries = await getCategoryTrafficLightToday(category.id);
        return summaries.map((summary) => mapTrafficLightSummaryToItem(summary, category.name));
      } catch {
        return [] as AthleteTrafficLightItem[];
      }
    }),
  );

  // Un atleta puede pertenecer a más de una categoría: se deduplica por id.
  const seen = new Set<string>();
  const unique: AthleteTrafficLightItem[] = [];
  for (const item of results.flat()) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    unique.push(item);
  }
  return unique;
}

/**
 * Conteo por color del plantel: alimenta las donas del
 * dashboard y los chips de filtro de MonitoringPage. `gray` equivale a
 * "sin check-in hoy", base del progreso del widget CheckInProgressWidget.
 */
export function summarizeTrafficLightCounts(items: AthleteTrafficLightItem[]): TrafficLightCounts {
  return {
    all: items.length,
    red: items.filter((item) => item.status === 'red').length,
    yellow: items.filter((item) => item.status === 'yellow').length,
    green: items.filter((item) => item.status === 'green').length,
    gray: items.filter((item) => item.status === 'gray').length,
  };
}

// ---------------------------------------------------------------------------
// Lesiones del atleta
//
// Wrappers manjos sobre `httpClient` con tipos propios alineados a
// `AthleteInjuryDto` del back y errores traducidos (ProblemDetails en español,
// 404 específico por atleta).
// ---------------------------------------------------------------------------

// Estados del dominio (InjuryStatus en .NET); viajan como texto, no como número.
export type InjuryStatus = 'Active' | 'InRecovery' | 'MedicallyCleared';

export interface AthleteInjury {
  id: string;
  athleteId: string;
  zone: string;
  description: string;
  injuryDate: string;
  estimatedReturnDate: string;
  status: InjuryStatus;
  clearedAt?: string | null;
  createdAt: string;
  peakPain?: number | null;
}

export interface CreateInjuryPayload {
  zone: string;
  description: string;
  injuryDate: string;
  estimatedReturnDate: string;
}

export interface UpdateInjuryStatusPayload {
  newStatus: InjuryStatus;
  transitionNotes: string;
}

/**
 * Historial de lesiones de un atleta (GET `listAthleteInjuries`).
 * Un filtro sin resultados responde 200 con lista vacía (nunca 404);
 * el 404 del endpoint significa que el atleta no existe.
 */
export async function listAthleteInjuries(athleteId: string): Promise<AthleteInjury[]> {
  try {
    const response = await httpClient.get<AthleteInjury[]>(
      `/seguimiento/api/v1/athletes/${athleteId}/injuries`,
    );
    return response.data ?? [];
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response?.status === 404) {
      throw new Error('El atleta solicitado no existe o fue eliminado.', { cause: err });
    }
    throw new Error(extractErrorMessage(err), { cause: err });
  }
}

/**
 * Resumen batch de lesiones activas (estado Active) por lote de atletas (GET `getActiveInjuriesSummary`).
 * Evita consultas N+1 cuando se muestra una categoría completa en planificaciones (KAN-464).
 */
export async function getActiveInjuriesSummary(
  athleteIds: string[],
): Promise<AthleteActiveInjurySummary[]> {
  const distinctIds = Array.from(new Set(athleteIds.filter(Boolean)));
  if (distinctIds.length === 0) return [];

  try {
    const { data } = await getActiveInjuriesSummarySdk({
      query: { athleteIds: distinctIds },
      throwOnError: true,
    });
    return data ?? [];
  } catch (err: unknown) {
    throw new Error(extractErrorMessage(err), { cause: err });
  }
}

/**
 * Molestias activas del atleta (GET listCheckInInjuries): las que aun no fueron dadas de alta,
 * para exigir el puntaje de dolor (0 a 10) de cada una en el check-in diario.
 */
export async function listCheckInInjuries(athleteId: string): Promise<AthleteInjury[]> {
  try {
    const response = await httpClient.get<AthleteInjury[]>(
      '/seguimiento/api/v1/athletes/' + athleteId + '/check-in/injuries',
    );
    return response.data ?? [];
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response?.status === 404) {
      throw new Error('El atleta solicitado no existe o fue eliminado.', { cause: err });
    }
    throw new Error(extractErrorMessage(err), { cause: err });
  }
}

/**
 * Molestias resueltas del atleta (GET listResolvedInjuries): las que ya fueron dadas
 * de alta, con su pico de dolor (máximo nivel registrado durante su evolución).
 */
export async function listResolvedInjuries(athleteId: string): Promise<AthleteInjury[]> {
  try {
    const response = await httpClient.get<AthleteInjury[]>(
      '/seguimiento/api/v1/athletes/' + athleteId + '/check-in/injuries/resolved',
    );
    return response.data ?? [];
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response?.status === 404) {
      throw new Error('El atleta solicitado no existe o fue eliminado.', { cause: err });
    }
    throw new Error(extractErrorMessage(err), { cause: err });
  }
}
/**
 * Registra una lesión (POST `createInjury`): nace en `Active` y el backend
 * exige fecha de retorno estimada posterior a la de la lesión (400 si no).
 */
export async function createAthleteInjury(
  athleteId: string,
  payload: CreateInjuryPayload,
): Promise<AthleteInjury> {
  try {
    const response = await httpClient.post<AthleteInjury>(
      `/seguimiento/api/v1/athletes/${athleteId}/injuries`,
      payload,
    );
    return response.data;
  } catch (err: unknown) {
    throw new Error(extractErrorMessage(err), { cause: err });
  }
}

/**
 * Avanza el stepper de una lesión (PATCH `updateInjuryStatus`, máquina de
 * estados estricta). `transitionNotes` es obligatoria y el backend
 * rechaza con 400 el salto directo de `Active` a `MedicallyCleared`.
 */
export async function updateInjuryStatus(
  injuryId: string,
  payload: UpdateInjuryStatusPayload,
): Promise<AthleteInjury> {
  try {
    const response = await httpClient.patch<AthleteInjury>(
      `/seguimiento/api/v1/injuries/${injuryId}/status`,
      payload,
    );
    return response.data;
  } catch (err: unknown) {
    throw new Error(extractErrorMessage(err), { cause: err });
  }
}

// ---------------------------------------------------------------------------
// Carga del día (minutos + RPE por actividad)
// ---------------------------------------------------------------------------

// Aliases de tipos para compatibilidad con consumidores existentes.
export type { DailyLoadActivity, DailyLoadRequest, DailyLoadResponse };
export type DailyLoadActivityPayload = DailyLoadActivity;
export type DailyLoadSubmitRequest = DailyLoadRequest;
export type DailyLoadSubmitResponse = DailyLoadResponse;

/**
 * Registra/actualiza la carga del día del atleta (minutos + RPE por actividad).
 * POST `/seguimiento/api/v1/athletes/{athleteId}/daily-load`.
 * Primera vez del día → 201, repetir → 200 (upsert).
 */
export async function submitDailyLoad(
  athleteId: string,
  payload: DailyLoadRequest,
): Promise<DailyLoadResponse> {
  try {
    const response = await registerDailyLoadRequest({
      path: { athleteId },
      body: payload,
      throwOnError: true,
    });
    return response.data;
  } catch (err) {
    throw new Error(extractErrorMessage(err), { cause: err });
  }
}

/**
 * Obtiene la carga del día ya registrada del atleta.
 * GET `/seguimiento/api/v1/athletes/{athleteId}/daily-load`.
 * Devuelve `null` si aún no se registró carga hoy (404).
 */
export async function getDailyLoad(athleteId: string): Promise<DailyLoadResponse | null> {
  try {
    const response = await getDailyLoadRequest({
      path: { athleteId },
      throwOnError: true,
    });
    return response.data;
  } catch (err) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 404) return null;
    throw new Error(extractErrorMessage(err), { cause: err });
  }
}

// ---------------------------------------------------------------------------
// Semana del atleta con los días completados
// ---------------------------------------------------------------------------

/**
 * Obtiene la semana del atleta (lun→dom) marcando los días con carga del día.
 * GET `/api/v1/athletes/{athleteId}/daily-load/week`.
 */
export async function getAthleteWeek(athleteId: string, date?: string): Promise<AthleteWeek> {
  try {
    const { data } = await getAthleteWeekRequest({
      path: { athleteId },
      query: date ? { date } : undefined,
      throwOnError: true,
    });
    return data;
  } catch (error) {
    throw new Error(extractErrorMessage(error), { cause: error });
  }
}

// ---------------------------------------------------------------------------
// Asistencia automática del día
// ---------------------------------------------------------------------------

// AthleteAttendanceSummary y CategoryAttendanceSummary provienen del SDK generado.
export type {
  AthleteAttendanceSummary,
  CategoryAttendanceSummary,
  AttendanceActivityDetail,
} from './generated/seguimiento';

export async function getCategoryAttendanceToday(
  categoryId: string,
): Promise<CategoryAttendanceSummary> {
  try {
    const response = await getCategoryAttendanceTodayRequest({
      path: { categoryId },
      throwOnError: true,
    });
    return response.data;
  } catch (err) {
    throw new Error(extractErrorMessage(err), { cause: err });
  }
}

export async function setAttendance(athleteId: string, present: boolean): Promise<void> {
  try {
    await setAttendanceRequest({
      path: { athleteId },
      body: { present },
      throwOnError: true,
    });
  } catch (err) {
    throw new Error(extractErrorMessage(err), { cause: err });
  }
}

/**
 * Recupera la asistencia y carga acumulada (UA Foster) de hoy para todas las categorías del PF.
 * Deduplica atletas por athleteId conservando el registro con mayor carga.
 */
export async function fetchAllCategoriesAttendanceToday(): Promise<AthleteAttendanceSummary[]> {
  try {
    const organizations = await structureService.getOrganizations().catch(() => []);
    if (!organizations || organizations.length === 0) return [];

    const categoriesByOrg = await Promise.all(
      organizations.map((org) =>
        structureService.getCategories(org.id).catch(() => [] as Category[]),
      ),
    );
    const categories = categoriesByOrg.flat();
    if (categories.length === 0) return [];

    const summaries = await Promise.all(
      categories.map(async (category) => {
        try {
          const attendance = await getCategoryAttendanceToday(category.id);
          return attendance.athletes ?? [];
        } catch {
          return [] as AthleteAttendanceSummary[];
        }
      }),
    );

    const athleteMap = new Map<string, AthleteAttendanceSummary>();
    for (const athlete of summaries.flat()) {
      if (!athlete || !athlete.athleteId) continue;
      const existing = athleteMap.get(athlete.athleteId);
      if (!existing || (athlete.totalLoad ?? 0) > (existing.totalLoad ?? 0)) {
        athleteMap.set(athlete.athleteId, athlete);
      }
    }

    return Array.from(athleteMap.values());
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Athlete daily check-in inquiry
// ---------------------------------------------------------------------------

export type { CheckIn };

/**
 * Devuelve el check-in de hoy del atleta, o null solo si no hay uno registrado.
 * Los errores de red o de la API se propagan para que el llamador pueda distinguir
 * "sin check-in" de "no se pudo recuperar" (por ejemplo, al editar respuestas).
 */
export async function getAthleteTodayCheckIn(
  athleteId: string,
  targetDate?: string,
): Promise<CheckIn | null> {
  const date = targetDate || todayInArgentina();
  const response = await httpClient.get<CheckIn[]>(
    `/seguimiento/api/v1/athletes/${athleteId}/check-ins`,
    {
      params: {
        from: date,
        to: date,
        limit: 1,
      },
    },
  );
  const list = response.data;
  if (Array.isArray(list) && list.length > 0) {
    return list[0];
  }
  return null;
}
