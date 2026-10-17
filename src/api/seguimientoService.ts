import { httpClient, extractErrorMessage } from './axiosClient';
import {
  saveOfflineCheckIn,
  getPendingCheckIns,
  deletePendingCheckIn,
  OfflineCheckInPayload,
} from '../services/checkInOfflineService';

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
}

export interface CheckInEntityDto {
  id: string;
  athleteId: string;
  date: string;
  trafficLight: 'Green' | 'Yellow' | 'Red';
  trafficLightReason?: string | null;
  sleepHours: number;
  sleepQuality?: number;
  muscleSoreness: number;
  fatigueLevel: number;
  moodRate: number;
  stressLevel: number;
  effortRate?: number;
  isSick: boolean;
  painZones?: string | null;
  hasActiveInjury: boolean;
}

export interface CheckInSubmitResponse {
  message: string;
  trafficLight: 'Green' | 'Yellow' | 'Red';
  trafficLightReason?: string | null;
  checkIn?: CheckInEntityDto;
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
      await httpClient.post(
        `/seguimiento/api/v1/athletes/${record.athleteId}/check-in`,
        record.payload,
      );
      await deletePendingCheckIn(record.id);
      syncedCount += 1;
    } catch {
      // If still failing, stop and keep remaining records in IndexedDB
      break;
    }
  }

  return syncedCount;
}

/**
 * Re-exports offline utilities for components
 */
export { countPendingCheckIns, getPendingCheckIns } from '../services/checkInOfflineService';
export type { OfflineCheckInPayload };
