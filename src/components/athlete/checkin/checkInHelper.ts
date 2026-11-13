/**
 * Helper utilities for the Check-In slide navigation and data formatting.
 */

export const STEP_TITLES: Record<number, string> = {
  1: 'Ánimo',
  2: 'Descanso y Recuperación',
  3: 'Dolor y Zonas',
  4: 'Resumen y Envío',
  5: 'Resumen y Envío',
};

export const SLEEP_QUALITY_LABELS: Record<number, string> = {
  1: 'Muy mala',
  2: 'Mala',
  3: 'Regular',
  4: 'Buena',
  5: 'Excelente',
};

export const FATIGUE_LABELS: Record<number, string> = {
  1: 'Enérgico',
  2: 'Fresco',
  3: 'Moderada',
  4: 'Alta',
  5: 'Agotado',
};

export const SORENESS_LABELS: Record<number, string> = {
  1: 'Sin dolor',
  2: 'Leve',
  3: 'Molestia',
  4: 'Fuerte',
  5: 'Muy intenso',
};

export const MOOD_LABELS: Record<number, string> = {
  1: 'Desanimado',
  2: 'Regular',
  3: 'Neutral',
  4: 'Motivado',
  5: 'Excelente',
};

export const getSleepQualityLabel = (val: number | null): string => {
  return SLEEP_QUALITY_LABELS[val ?? 3] || 'Regular';
};

export const getFatigueLabel = (val: number | null): string => {
  return val !== null && FATIGUE_LABELS[val] ? FATIGUE_LABELS[val] : '';
};

export const getSorenessLabel = (val: number | null): string => {
  return val !== null && SORENESS_LABELS[val] ? SORENESS_LABELS[val] : '';
};

export const getSleepHoursLabel = (hours: number | null): string => {
  if (hours === null) return 'Sin registrar';
  if (hours >= 12) return '12 o más';
  return `${hours}`;
};

export const getStepTitle = (step: number): string => {
  return STEP_TITLES[step] || 'Check-in Diario';
};

export const getStepProgress = (step: number, totalSteps = 3): number => {
  if (step > totalSteps) return 100;
  return Math.round(((step - 1) / totalSteps) * 100);
};

export const formatPainZones = (musclePains: Record<string, number>): string | null => {
  const reportedPains = Object.entries(musclePains).filter(([, lvl]) => lvl > 0);
  if (reportedPains.length === 0) return null;
  return reportedPains.map(([mId, lvl]) => `${mId}:${lvl}`).join(',');
};

export interface TrafficLightBadgeData {
  label: string;
  bg: string;
  color: string;
  border: string;
}

export const getTrafficLightBadgeData = (
  light?: 'Green' | 'Yellow' | 'Red',
): TrafficLightBadgeData => {
  switch (light) {
    case 'Green':
      return {
        label: 'Semáforo Verde - Apto',
        bg: 'var(--success-bg-strong)',
        color: 'var(--success-text)',
        border: 'var(--success)',
      };
    case 'Yellow':
      return {
        label: 'Semáforo Amarillo - Atención',
        bg: 'var(--warning-bg-strong)',
        color: 'var(--warning-text)',
        border: 'var(--warning)',
      };
    case 'Red':
      return {
        label: 'Semáforo Rojo - Cuidado',
        bg: 'var(--danger-bg-strong)',
        color: 'var(--danger-text)',
        border: 'var(--danger)',
      };
    default:
      return {
        label: 'Registrado con éxito',
        bg: 'var(--info-bg)',
        color: 'var(--info-text)',
        border: 'var(--border)',
      };
  }
};

export const canAutoAdvanceStep5 = (answeredSick: boolean, answeredInjury: boolean): boolean => {
  return answeredSick && answeredInjury;
};

/**
 * Valida si el atleta cumple con marcar la lesión con color negro (level: 6)
 * cuando indica que tiene una lesión activa.
 */
export const hasRequiredInjuryMark = (
  hasActiveInjury: boolean,
  musclePains: Record<string, number> = {},
): boolean => {
  if (!hasActiveInjury) return true;
  return Object.values(musclePains).some((level) => level === 6);
};

/**
 * Elimina todas las zonas marcadas como lesión (nivel 6 en negro),
 * preservando las molestias musculares regulares (niveles 1 a 5).
 */
export const clearInjuryPains = (
  musclePains: Record<string, number> = {},
): Record<string, number> => {
  const result: Record<string, number> = {};
  Object.entries(musclePains).forEach(([mId, lvl]) => {
    if (Number(lvl) !== 6 && lvl > 0) {
      result[mId] = lvl;
    }
  });
  return result;
};

/* ── PERSISTENCIA LOCAL (BORRADOR Y FINALIZACIÓN) ── */

export interface CheckInDraftData {
  hasStarted: boolean;
  currentStep: number;
  maxReachedStep: number;
  sleepHours: number | null;
  sleepQuality: number | null;
  fatigueLevel: number | null;
  muscleSoreness: number | null;
  moodRate: number;
  stressLevel: number;
  isSick: boolean;
  hasActiveInjury: boolean;
  healthQuestionsAnswered: boolean;
  musclePains: Record<string, number>;
  notes: string;
}

export interface CheckInCompletedData {
  result: unknown;
  draft: CheckInDraftData;
  completedAt: string;
}

export const getTodayKey = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getStorage = (): Storage | null => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      return globalThis.localStorage;
    }
  } catch {
    return null;
  }
  return null;
};

export const getCheckInCompleted = (athleteId: string): CheckInCompletedData | null => {
  const storage = getStorage();
  if (!storage || !athleteId) return null;
  try {
    const raw = storage.getItem(`protraining_checkin_completed_${athleteId}_${getTodayKey()}`);
    if (!raw) return null;
    return JSON.parse(raw) as CheckInCompletedData;
  } catch {
    return null;
  }
};

export const saveCheckInCompleted = (athleteId: string, data: CheckInCompletedData): void => {
  const storage = getStorage();
  if (!storage || !athleteId) return;
  try {
    storage.setItem(
      `protraining_checkin_completed_${athleteId}_${getTodayKey()}`,
      JSON.stringify(data),
    );
  } catch {
    // Ignored in storage-restricted environments
  }
};

export const getCheckInDraft = (athleteId: string): CheckInDraftData | null => {
  const storage = getStorage();
  if (!storage || !athleteId) return null;
  try {
    const raw = storage.getItem(`protraining_checkin_draft_${athleteId}_${getTodayKey()}`);
    if (!raw) return null;
    return JSON.parse(raw) as CheckInDraftData;
  } catch {
    return null;
  }
};

export const saveCheckInDraft = (athleteId: string, draft: CheckInDraftData): void => {
  const storage = getStorage();
  if (!storage || !athleteId) return;
  try {
    storage.setItem(
      `protraining_checkin_draft_${athleteId}_${getTodayKey()}`,
      JSON.stringify(draft),
    );
  } catch {
    // Ignored in storage-restricted environments
  }
};

export const clearCheckInDraft = (athleteId: string): void => {
  const storage = getStorage();
  if (!storage || !athleteId) return;
  try {
    storage.removeItem(`protraining_checkin_draft_${athleteId}_${getTodayKey()}`);
  } catch {
    // Ignored in storage-restricted environments
  }
};
