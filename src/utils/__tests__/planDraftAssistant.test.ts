import { describe, expect, it } from 'vitest';
import {
  aiDraftToEditableDraft,
  assistantDayToNumber,
  numberToAssistantDay,
  swapExercise,
  toUpdateDraftRequest,
} from '../planDraft';
import { PlanDraftResponse } from '../../api/generated/asistente';
import { CatalogExercise, DraftSession } from '../../types/trainingPlans';

describe('planDraftAssistant utils (KAN-413)', () => {
  describe('dayOfWeek mapping', () => {
    it('mapea correctamente nombres de día en inglés a números (0=domingo, 1=lunes)', () => {
      expect(assistantDayToNumber('Monday')).toBe(1);
      expect(assistantDayToNumber('Friday')).toBe(5);
      expect(assistantDayToNumber('Sunday')).toBe(0);
      expect(assistantDayToNumber('Saturday')).toBe(6);
      expect(assistantDayToNumber('Invalido')).toBe(1);
    });

    it('mapea números a nombres de día en inglés', () => {
      expect(numberToAssistantDay(1)).toBe('Monday');
      expect(numberToAssistantDay(5)).toBe('Friday');
      expect(numberToAssistantDay(0)).toBe('Sunday');
      expect(numberToAssistantDay(6)).toBe('Saturday');
    });
  });

  describe('aiDraftToEditableDraft', () => {
    const sampleDraft: PlanDraftResponse = {
      id: 'draft-123',
      goal: 'Hipertrofia de piernas',
      name: 'Plan de piernas',
      objective: 'Fuerza base',
      justificationSummary: 'Plan diseñado para pretemporada',
      provider: 'Gemini',
      status: 'Draft',
      startDate: '2026-11-02',
      warnings: ['Ajustado por el partido del sábado 7/11: Sentadilla 85 % → 60 %'],
      weeks: [
        {
          weekNumber: 1,
          sessions: [
            {
              name: 'Sesión A',
              dayOfWeek: 'Monday',
              order: 1,
              coachNotes: 'Cuidar técnica',
              exercises: [
                {
                  exerciseId: 'ex-squat',
                  order: 1,
                  sets: 4,
                  reps: 8,
                  targetPercentage: 60,
                },
              ],
            },
          ],
        },
      ],
    };

    it('convierte un PlanDraftResponse al modelo editable asignando keys y resolviendo nombres', () => {
      const exerciseNames = { 'ex-squat': 'Sentadilla trasera con barra' };
      const editable = aiDraftToEditableDraft(sampleDraft, exerciseNames);

      expect(editable.id).toBe('draft-123');
      expect(editable.name).toBe('Plan de piernas');
      expect(editable.objective).toBe('Fuerza base');
      expect(editable.weeks).toHaveLength(1);

      const week1 = editable.weeks[0];
      expect(week1.weekNumber).toBe(1);
      expect(week1.sessions).toHaveLength(1);

      const session1 = week1.sessions[0];
      expect(session1.dayOfWeek).toBe(1); // Monday
      expect(session1.name).toBe('Sesión A');
      expect(session1.coachNotes).toBe('Cuidar técnica');
      expect(session1.exercises).toHaveLength(1);

      const ex1 = session1.exercises[0];
      expect(ex1.exerciseId).toBe('ex-squat');
      expect(ex1.exerciseName).toBe('Sentadilla trasera con barra');
      expect(ex1.sets).toBe(4);
      expect(ex1.reps).toBe(8);
      expect(ex1.targetPercentage).toBe(60);
    });

    it('si no se proveen nombres de catálogo usa un fallback descriptivo', () => {
      const editable = aiDraftToEditableDraft(sampleDraft);
      expect(editable.weeks[0].sessions[0].exercises[0].exerciseName).toBe('Ejercicio #1');
    });
  });

  describe('toUpdateDraftRequest', () => {
    it('genera el payload para PUT /api/v1/assistant/plan-drafts/{id}', () => {
      const sampleDraft: PlanDraftResponse = {
        id: 'draft-123',
        goal: 'Hipertrofia',
        name: 'Plan A',
        objective: 'Objetivo',
        justificationSummary: 'Resumen IA',
        provider: 'Rules',
        status: 'Draft',
        startDate: '2026-11-02',
        weeks: [
          {
            weekNumber: 1,
            sessions: [
              {
                name: 'Piernas',
                dayOfWeek: 'Wednesday',
                order: 1,
                coachNotes: 'Nota',
                exercises: [
                  {
                    exerciseId: 'ex-press',
                    order: 1,
                    sets: 3,
                    reps: 10,
                    targetPercentage: 75,
                  },
                ],
              },
            ],
          },
        ],
      };

      const editable = aiDraftToEditableDraft(sampleDraft, { 'ex-press': 'Prensa' });
      // Modificamos una serie y rep
      editable.weeks[0].sessions[0].exercises[0].sets = 4;
      editable.weeks[0].sessions[0].exercises[0].reps = 12;

      const request = toUpdateDraftRequest(editable, 'Resumen IA');

      expect(request.name).toBe('Plan A');
      expect(request.justificationSummary).toBe('Resumen IA');
      expect(request.weeks[0].sessions[0].dayOfWeek).toBe('Wednesday');
      expect(request.weeks[0].sessions[0].exercises[0].sets).toBe(4);
      expect(request.weeks[0].sessions[0].exercises[0].reps).toBe(12);
      expect(request.weeks[0].sessions[0].exercises[0].exerciseId).toBe('ex-press');
    });
  });

  describe('swapExercise', () => {
    it('sustituye el ejercicio manteniendo los sets, reps y porcentaje', () => {
      const baseSession: DraftSession = {
        key: 's1',
        id: null,
        name: 'Sesión 1',
        order: 1,
        dayOfWeek: 1,
        coachNotes: '',
        nextExerciseOrder: 2,
        exercises: [
          {
            key: 'ex-key-1',
            id: null,
            exerciseId: 'old-ex-id',
            exerciseName: 'Sentadilla clásica',
            order: 1,
            sets: 4,
            reps: 8,
            targetPercentage: 80,
          },
        ],
      };

      const replacement: CatalogExercise = {
        id: 'new-ex-id',
        name: 'Sentadilla frontal',
        muscleGroup: 'Piernas',
        equipment: 'Barra',
        images: [],
      };

      const updated = swapExercise(baseSession, 'ex-key-1', replacement);

      expect(updated.exercises[0].exerciseId).toBe('new-ex-id');
      expect(updated.exercises[0].exerciseName).toBe('Sentadilla frontal');
      expect(updated.exercises[0].sets).toBe(4);
      expect(updated.exercises[0].reps).toBe(8);
      expect(updated.exercises[0].targetPercentage).toBe(80);
      expect(updated.exercises[0].order).toBe(1);
    });
  });
});
