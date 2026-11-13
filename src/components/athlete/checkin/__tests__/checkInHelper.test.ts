import { describe, it, expect, beforeEach } from 'vitest';
import {
  getStepTitle,
  getStepProgress,
  formatPainZones,
  getTrafficLightBadgeData,
  canAutoAdvanceStep5,
  hasRequiredInjuryMark,
  clearInjuryPains,
  getSleepQualityLabel,
  getFatigueLabel,
  getSorenessLabel,
  getSleepHoursLabel,
} from '../checkInHelper';

describe('checkInHelper', () => {
  describe('getStepTitle', () => {
    it('returns appropriate title for each of the 3 slide steps and summary', () => {
      expect(getStepTitle(1)).toBe('Ánimo');
      expect(getStepTitle(2)).toBe('Descanso y Recuperación');
      expect(getStepTitle(3)).toBe('Dolor y Zonas');
      expect(getStepTitle(4)).toBe('Resumen y Envío');
    });

    it('falls back to default title for out of range steps', () => {
      expect(getStepTitle(99)).toBe('Check-in Diario');
    });
  });

  describe('getStepProgress', () => {
    it('calculates accurate percentages across steps with 3 total steps', () => {
      expect(getStepProgress(1, 3)).toBe(0);
      expect(getStepProgress(2, 3)).toBe(33);
      expect(getStepProgress(3, 3)).toBe(67);
      expect(getStepProgress(4, 3)).toBe(100);
    });

    it('calculates accurate percentages across steps with 4 total steps', () => {
      expect(getStepProgress(1, 4)).toBe(0);
      expect(getStepProgress(2, 4)).toBe(25);
      expect(getStepProgress(3, 4)).toBe(50);
      expect(getStepProgress(4, 4)).toBe(75);
      expect(getStepProgress(5, 4)).toBe(100);
    });
  });

  describe('formatPainZones', () => {
    it('formats multiple muscle zones and pain levels for API payload', () => {
      const pains = {
        cuadriceps_derecho: 2,
        isquiotibiales_izquierdo: 1,
      };
      const result = formatPainZones(pains);
      expect(result).toBe('cuadriceps_derecho:2,isquiotibiales_izquierdo:1');
    });

    it('filters out zero-level or unselected muscles', () => {
      const pains = {
        biceps_derecho: 0,
        gemelo_izquierdo: 3,
      };
      const result = formatPainZones(pains);
      expect(result).toBe('gemelo_izquierdo:3');
    });

    it('returns null when no pains are reported', () => {
      expect(formatPainZones({})).toBeNull();
      expect(formatPainZones({ pecho_derecho: 0 })).toBeNull();
    });
  });

  describe('getTrafficLightBadgeData', () => {
    it('returns appropriate badge metadata for green traffic light', () => {
      const badge = getTrafficLightBadgeData('Green');
      expect(badge.label).toContain('Semáforo Verde');
      expect(badge.color).toBe('var(--success-text)');
    });

    it('returns appropriate badge metadata for yellow traffic light', () => {
      const badge = getTrafficLightBadgeData('Yellow');
      expect(badge.label).toContain('Semáforo Amarillo');
      expect(badge.color).toBe('var(--warning-text)');
    });

    it('returns appropriate badge metadata for red traffic light', () => {
      const badge = getTrafficLightBadgeData('Red');
      expect(badge.label).toContain('Semáforo Rojo');
      expect(badge.color).toBe('var(--danger-text)');
    });

    it('returns fallback badge metadata for undefined traffic light', () => {
      const badge = getTrafficLightBadgeData(undefined);
      expect(badge.label).toBe('Registrado con éxito');
    });
  });

  describe('canAutoAdvanceStep5', () => {
    it('does not auto-advance when only one question has been answered', () => {
      expect(canAutoAdvanceStep5(true, false)).toBe(false);
      expect(canAutoAdvanceStep5(false, true)).toBe(false);
      expect(canAutoAdvanceStep5(false, false)).toBe(false);
    });

    it('allows auto-advance when both questions have been answered', () => {
      expect(canAutoAdvanceStep5(true, true)).toBe(true);
    });
  });

  describe('hasRequiredInjuryMark', () => {
    it('returns true when athlete does not have an active injury', () => {
      expect(hasRequiredInjuryMark(false, {})).toBe(true);
      expect(hasRequiredInjuryMark(false, { cuadriceps_derecho: 2 })).toBe(true);
    });

    it('returns false when athlete has active injury but has not marked any zone', () => {
      expect(hasRequiredInjuryMark(true, {})).toBe(false);
    });

    it('returns false when athlete has active injury but marked zones with regular pain levels 1-5', () => {
      expect(
        hasRequiredInjuryMark(true, {
          cuadriceps_derecho: 3,
          isquiotibiales_izquierdo: 5,
        }),
      ).toBe(false);
    });

    it('returns true when athlete has active injury and marked at least one zone with level 6 (black/injury)', () => {
      expect(
        hasRequiredInjuryMark(true, {
          rodilla_derecha: 6,
        }),
      ).toBe(true);

      expect(
        hasRequiredInjuryMark(true, {
          cuadriceps_derecho: 2,
          tendon_aquiles_izquierdo: 6,
        }),
      ).toBe(true);
    });
  });

  describe('clearInjuryPains', () => {
    it('removes zones marked as level 6 injury while keeping normal pains (levels 1-5)', () => {
      const pains = {
        abdominales: 6,
        cuadriceps_derecho: 2,
        gemelo_izquierdo: 4,
      };
      const cleaned = clearInjuryPains(pains);
      expect(cleaned).toEqual({
        cuadriceps_derecho: 2,
        gemelo_izquierdo: 4,
      });
      expect(cleaned.abdominales).toBeUndefined();
    });

    it('returns an empty object if only injury marks were present', () => {
      const pains = {
        abdominales: 6,
        hombro_derecho: 6,
      };
      const cleaned = clearInjuryPains(pains);
      expect(cleaned).toEqual({});
    });

    it('handles string levels defensively if level is "6"', () => {
      const pains = {
        abdominales: '6' as unknown as number,
        pecho_derecho: 3,
      };
      const cleaned = clearInjuryPains(pains);
      expect(cleaned).toEqual({
        pecho_derecho: 3,
      });
    });

    it('returns empty object when given empty or undefined input', () => {
      expect(clearInjuryPains({})).toEqual({});
      expect(clearInjuryPains(undefined)).toEqual({});
    });
  });

  describe('metric labels and getters', () => {
    it('returns accurate labels for sleep quality', () => {
      expect(getSleepQualityLabel(1)).toBe('Muy mala');
      expect(getSleepQualityLabel(2)).toBe('Mala');
      expect(getSleepQualityLabel(3)).toBe('Regular');
      expect(getSleepQualityLabel(4)).toBe('Buena');
      expect(getSleepQualityLabel(5)).toBe('Excelente');
      expect(getSleepQualityLabel(null)).toBe('Regular');
    });

    it('returns accurate labels for fatigue levels', () => {
      expect(getFatigueLabel(1)).toBe('Enérgico');
      expect(getFatigueLabel(2)).toBe('Fresco');
      expect(getFatigueLabel(3)).toBe('Moderada');
      expect(getFatigueLabel(4)).toBe('Alta');
      expect(getFatigueLabel(5)).toBe('Agotado');
      expect(getFatigueLabel(null)).toBe('');
    });

    it('returns accurate labels for soreness levels, including "Muy intenso" for level 5', () => {
      expect(getSorenessLabel(1)).toBe('Sin dolor');
      expect(getSorenessLabel(2)).toBe('Leve');
      expect(getSorenessLabel(3)).toBe('Molestia');
      expect(getSorenessLabel(4)).toBe('Fuerte');
      expect(getSorenessLabel(5)).toBe('Muy intenso');
      expect(getSorenessLabel(null)).toBe('');
    });

    it('returns accurate labels for sleep hours (numbers 0 to 11 and "12 o más")', () => {
      expect(getSleepHoursLabel(0)).toBe('0');
      expect(getSleepHoursLabel(1)).toBe('1');
      expect(getSleepHoursLabel(6)).toBe('6');
      expect(getSleepHoursLabel(11)).toBe('11');
      expect(getSleepHoursLabel(12)).toBe('12 o más');
      expect(getSleepHoursLabel(13)).toBe('12 o más');
      expect(getSleepHoursLabel(null)).toBe('Sin registrar');
    });
  });

  describe('localStorage persistence helpers', () => {
    const athleteId = 'test-athlete-123';
    const store = new Map<string, string>();

    beforeEach(() => {
      store.clear();
      const mockStorage = {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => {
          store.set(k, String(v));
        },
        removeItem: (k: string) => {
          store.delete(k);
        },
        clear: () => {
          store.clear();
        },
        key: (i: number) => Array.from(store.keys())[i] ?? null,
        length: store.size,
      };
      Object.defineProperty(globalThis, 'localStorage', {
        value: mockStorage,
        configurable: true,
        writable: true,
      });
    });

    it('generates consistent today key in YYYY-MM-DD format', async () => {
      const { getTodayKey } = await import('../checkInHelper');
      const key = getTodayKey();
      expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('saves, retrieves and clears check-in draft', async () => {
      const { saveCheckInDraft, getCheckInDraft, clearCheckInDraft } =
        await import('../checkInHelper');

      const mockDraft = {
        hasStarted: true,
        currentStep: 2,
        maxReachedStep: 2,
        sleepHours: 7.5,
        sleepQuality: 4,
        fatigueLevel: 2,
        muscleSoreness: 3,
        moodRate: 4,
        stressLevel: 2,
        isSick: false,
        hasActiveInjury: false,
        healthQuestionsAnswered: true,
        musclePains: { cuadriceps_derecho: 2 },
        notes: 'Buen entrenamiento',
      };

      saveCheckInDraft(athleteId, mockDraft);
      const retrieved = getCheckInDraft(athleteId);
      expect(retrieved).toEqual(mockDraft);

      clearCheckInDraft(athleteId);
      expect(getCheckInDraft(athleteId)).toBeNull();
    });

    it('saves and retrieves completed check-in', async () => {
      const { saveCheckInCompleted, getCheckInCompleted } = await import('../checkInHelper');

      const mockCompleted = {
        result: { id: 'checkin-999', trafficLight: 'Green' },
        draft: {
          hasStarted: true,
          currentStep: 4,
          maxReachedStep: 4,
          sleepHours: 8,
          sleepQuality: 5,
          fatigueLevel: 1,
          muscleSoreness: 1,
          moodRate: 5,
          stressLevel: 1,
          isSick: false,
          hasActiveInjury: false,
          healthQuestionsAnswered: true,
          musclePains: {},
          notes: '',
        },
        completedAt: new Date().toISOString(),
      };

      saveCheckInCompleted(athleteId, mockCompleted);
      const retrieved = getCheckInCompleted(athleteId);
      expect(retrieved).toEqual(mockCompleted);
    });
  });
});
