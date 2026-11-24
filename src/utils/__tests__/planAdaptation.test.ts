import { describe, it, expect } from 'vitest';
import type {
  ApplyAthleteSessionAdjustmentResponse,
  TrainingPlanDetail,
  TrainingSessionDetail,
} from '../../api/generated/entrenamiento';
import {
  getDefaultPlanSessionId,
  getPlanSessionIds,
  hasApprovedSessionAdjustment,
  resolveSessionAdjustmentDecision,
  summarizeAthletePlanDecisions,
} from '../planAdaptation';

function buildSession(
  overrides: Partial<TrainingSessionDetail> & Pick<TrainingSessionDetail, 'id' | 'name' | 'order'>,
): TrainingSessionDetail {
  return {
    dayOfWeek: 1,
    blocks: [],
    exercises: [],
    ...overrides,
  };
}

function buildPlan(weeks: TrainingPlanDetail['weeks']): TrainingPlanDetail {
  return {
    id: 'plan-1',
    name: 'Plan fuerza',
    weeks,
  };
}

function buildAdjustment(
  overrides: Partial<ApplyAthleteSessionAdjustmentResponse> = {},
): ApplyAthleteSessionAdjustmentResponse {
  return {
    id: 'adj-1',
    athleteId: 'ath-1',
    sessionId: 'session-1',
    date: '2026-11-22',
    adjustedByCoach: true,
    items: [],
    ...overrides,
  };
}

describe('planAdaptation utils (KAN-636)', () => {
  describe('getDefaultPlanSessionId', () => {
    it('devuelve la primera sesión con ejercicios y hace fallback a la primera sesión si ninguna tiene ejercicios', () => {
      const planWithExercises = buildPlan([
        {
          id: 'w-1',
          weekNumber: 1,
          sessions: [
            buildSession({ id: 's-empty', name: 'Movilidad', order: 1 }),
            buildSession({
              id: 's-main',
              name: 'Fuerza',
              order: 2,
              exercises: [
                {
                  id: 'p-1',
                  exerciseId: 'ex-1',
                  exerciseName: 'Sentadilla',
                  order: 1,
                  sets: 4,
                  reps: '5',
                },
              ],
            }),
          ],
        },
      ]);

      expect(getDefaultPlanSessionId(planWithExercises)).toBe('s-main');

      const planWithoutExercises = buildPlan([
        {
          id: 'w-1',
          weekNumber: 1,
          sessions: [buildSession({ id: 's-only', name: 'Descanso activo', order: 1 })],
        },
      ]);

      expect(getDefaultPlanSessionId(planWithoutExercises)).toBe('s-only');
    });

    it('devuelve null cuando el plan no tiene semanas ni sesiones', () => {
      expect(getDefaultPlanSessionId(buildPlan([]))).toBeNull();
      expect(
        getDefaultPlanSessionId({ id: 'plan-empty', name: 'Sin semanas' } as TrainingPlanDetail),
      ).toBeNull();
    });
  });

  describe('getPlanSessionIds', () => {
    it('prioriza la sesión por defecto, deduplica IDs repetidos e ignora sesiones sin ID', () => {
      const plan = buildPlan([
        {
          id: 'w-1',
          weekNumber: 1,
          sessions: [
            buildSession({ id: 's-1', name: 'Día 1 (vacío)', order: 1 }),
            buildSession({
              id: 's-2',
              name: 'Día 2 (default con ejercicios)',
              order: 2,
              exercises: [
                {
                  id: 'p-1',
                  exerciseId: 'ex-1',
                  exerciseName: 'Sentadilla',
                  order: 1,
                  sets: 4,
                  reps: '5',
                },
              ],
            }),
            buildSession({ id: 's-2', name: 'Duplicada', order: 3 }),
            buildSession({ id: '', name: 'Sin ID', order: 4 }),
          ],
        },
        {
          id: 'w-2',
          weekNumber: 2,
          sessions: [buildSession({ id: 's-3', name: 'Día 3', order: 1 })],
        },
      ]);

      expect(getPlanSessionIds(plan)).toEqual(['s-2', 's-1', 's-3']);
    });

    it('devuelve arreglo vacío cuando el plan no tiene sesiones', () => {
      expect(getPlanSessionIds(buildPlan([]))).toEqual([]);
      expect(
        getPlanSessionIds({ id: 'plan-empty', name: 'Sin semanas' } as TrainingPlanDetail),
      ).toEqual([]);
    });
  });

  describe('hasApprovedSessionAdjustment y resolveSessionAdjustmentDecision', () => {
    it('devuelve approved si tiene sustituciones o reducción de carga y no está rechazado', () => {
      const withItems = buildAdjustment({
        status: 'Approved',
        items: [{ originalExerciseId: 'ex-1', substituteExerciseId: 'ex-2' }],
      });
      const withReduction = buildAdjustment({
        status: 'Approved',
        loadReductionPercentage: 15,
      });

      expect(hasApprovedSessionAdjustment(withItems)).toBe(true);
      expect(resolveSessionAdjustmentDecision(withItems)).toBe('approved');
      expect(hasApprovedSessionAdjustment(withReduction)).toBe(true);
      expect(resolveSessionAdjustmentDecision(withReduction)).toBe('approved');
    });

    it('devuelve rejected incluso cuando el ajuste conserva ítems y reducción de carga históricos', () => {
      const rejectedWithHistory = buildAdjustment({
        status: 'Rejected',
        note: 'Nota aprobada previa',
        rejectionReason: 'Molestia superada',
        loadReductionPercentage: 20,
        items: [{ originalExerciseId: 'ex-1', substituteExerciseId: 'ex-2' }],
      });

      expect(hasApprovedSessionAdjustment(rejectedWithHistory)).toBe(false);
      expect(resolveSessionAdjustmentDecision(rejectedWithHistory)).toBe('rejected');
    });

    it('devuelve null cuando no hay ajuste o no tiene cambios ni estado rechazado', () => {
      expect(resolveSessionAdjustmentDecision(null)).toBeNull();
      expect(resolveSessionAdjustmentDecision(undefined)).toBeNull();
      expect(resolveSessionAdjustmentDecision(buildAdjustment({ items: [] }))).toBeNull();
    });
  });

  describe('summarizeAthletePlanDecisions', () => {
    it('prioriza cualquier sesión aprobada sobre una rechazada respetando el orden del plan', () => {
      expect(
        summarizeAthletePlanDecisions({ 's-1': 'rejected', 's-2': 'approved', 's-3': 'approved' }, [
          's-1',
          's-2',
          's-3',
        ]),
      ).toEqual({ decision: 'approved', sessionId: 's-2' });
    });

    it('devuelve la primera sesión rechazada cuando ninguna está aprobada', () => {
      expect(
        summarizeAthletePlanDecisions({ 's-3': 'rejected', 's-2': 'rejected' }, [
          's-1',
          's-2',
          's-3',
        ]),
      ).toEqual({ decision: 'rejected', sessionId: 's-2' });
    });

    it('considera sesiones presentes en el mapa aunque no estén en orderedSessionIds y devuelve null si está vacío', () => {
      expect(summarizeAthletePlanDecisions({ 's-extra': 'approved' }, ['s-1'])).toEqual({
        decision: 'approved',
        sessionId: 's-extra',
      });
      expect(summarizeAthletePlanDecisions({}, ['s-1'])).toBeNull();
      expect(summarizeAthletePlanDecisions(undefined, ['s-1'])).toBeNull();
    });
  });
});
