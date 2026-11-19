import { describe, expect, it } from 'vitest';
import { sortSessionsByDayAndTime, toDraft, toSaveRequest } from '../planDraft';
import { formatDayMonth } from '../argentinaDate';
import { DraftSession, PlanDraft } from '../../types/trainingPlans';
import { TrainingPlanDetail } from '../../api/generated/entrenamiento';

describe('KAN-559 · Hora de la sesión y fin de la asignación', () => {
  describe('Criterio 1: Ordenamiento de sesiones por día y hora', () => {
    it('ordena dos sesiones el mismo día por hora (más temprana primero)', () => {
      const s1: DraftSession = {
        key: 's1',
        id: null,
        name: 'Tarde',
        order: 1,
        dayOfWeek: 1, // Lunes
        coachNotes: '',
        startTime: '18:00',
        exercises: [],
        nextExerciseOrder: 1,
      };
      const s2: DraftSession = {
        key: 's2',
        id: null,
        name: 'Mañana',
        order: 2,
        dayOfWeek: 1, // Lunes
        coachNotes: '',
        startTime: '09:00',
        exercises: [],
        nextExerciseOrder: 1,
      };

      const sorted = sortSessionsByDayAndTime([s1, s2]);

      expect(sorted.map((s) => s.name)).toEqual(['Mañana', 'Tarde']);
    });

    it('coloca las sesiones sin hora al final del día', () => {
      const sNoTime: DraftSession = {
        key: 's-notime',
        id: null,
        name: 'Todo el día',
        order: 1,
        dayOfWeek: 1,
        coachNotes: '',
        startTime: null,
        exercises: [],
        nextExerciseOrder: 1,
      };
      const s10am: DraftSession = {
        key: 's-10am',
        id: null,
        name: 'Sesión 10:00',
        order: 2,
        dayOfWeek: 1,
        coachNotes: '',
        startTime: '10:00',
        exercises: [],
        nextExerciseOrder: 1,
      };

      const sorted = sortSessionsByDayAndTime([sNoTime, s10am]);

      expect(sorted.map((s) => s.name)).toEqual(['Sesión 10:00', 'Todo el día']);
    });

    it('ordena días distintos manteniendo lunes primero', () => {
      const sMartes: DraftSession = {
        key: 'martes',
        id: null,
        name: 'Martes 08:00',
        order: 1,
        dayOfWeek: 2, // Martes
        coachNotes: '',
        startTime: '08:00',
        exercises: [],
        nextExerciseOrder: 1,
      };
      const sLunes: DraftSession = {
        key: 'lunes',
        id: null,
        name: 'Lunes 18:00',
        order: 1,
        dayOfWeek: 1, // Lunes
        coachNotes: '',
        startTime: '18:00',
        exercises: [],
        nextExerciseOrder: 1,
      };

      const sorted = sortSessionsByDayAndTime([sMartes, sLunes]);

      expect(sorted.map((s) => s.name)).toEqual(['Lunes 18:00', 'Martes 08:00']);
    });
  });

  describe('Conversión de formato startTime (HH:mm <-> HH:mm:ss)', () => {
    it('toDraft corta los segundos del startTime que manda el back (18:00:00 -> 18:00)', () => {
      const backendPlan: TrainingPlanDetail = {
        id: 'plan-1',
        name: 'Plan Fuerza',
        objective: 'Pretemporada',
        weeks: [
          {
            id: 'w1',
            weekNumber: 1,
            sessions: [
              {
                id: 's1',
                name: 'Fuerza A',
                order: 1,
                dayOfWeek: 1,
                coachNotes: null,
                startTime: '18:00:00',
                blocks: [],
                exercises: [],
              },
            ],
          },
        ],
      };

      const draft = toDraft(backendPlan);
      expect(draft.weeks[0].sessions[0].startTime).toBe('18:00');
    });

    it('toSaveRequest agrega los segundos para cumplir el contrato TimeOnly del backend (18:00 -> 18:00:00)', () => {
      const draft: PlanDraft = {
        id: 'plan-1',
        name: 'Plan Fuerza',
        objective: 'Pretemporada',
        weeks: [
          {
            key: 'w1',
            id: 'w1',
            weekNumber: 1,
            nextSessionOrder: 2,
            sessions: [
              {
                key: 's1',
                id: 's1',
                name: 'Fuerza A',
                order: 1,
                dayOfWeek: 1,
                coachNotes: '',
                startTime: '18:00',
                exercises: [],
                nextExerciseOrder: 1,
              },
            ],
          },
        ],
      };

      const request = toSaveRequest(draft);
      expect(request.weeks?.[0]?.sessions?.[0]?.startTime).toBe('18:00:00');
    });

    it('toSaveRequest mantiene null si la sesión no tiene hora asignada', () => {
      const draft: PlanDraft = {
        id: 'plan-1',
        name: 'Plan Fuerza',
        objective: '',
        weeks: [
          {
            key: 'w1',
            id: null,
            weekNumber: 1,
            nextSessionOrder: 2,
            sessions: [
              {
                key: 's1',
                id: null,
                name: 'Fuerza A',
                order: 1,
                dayOfWeek: 1,
                coachNotes: '',
                startTime: null,
                exercises: [],
                nextExerciseOrder: 1,
              },
            ],
          },
        ],
      };

      const request = toSaveRequest(draft);
      expect(request.weeks?.[0]?.sessions?.[0]?.startTime).toBeNull();
    });
  });

  describe('Criterio 2: Fechas de fin de asignación y etiquetas de estado', () => {
    it('formatDayMonth formatea correctamente fechas sin correr la zona horaria', () => {
      expect(formatDayMonth('2026-12-01')).toBe('1/12');
      expect(formatDayMonth('2026-12-28')).toBe('28/12');
    });

    it('arma el texto "Del 1/12 al 28/12" y "Termina el 28/12"', () => {
      const startDate = '2026-12-01';
      const endDate = '2026-12-28';
      const rangeText = `Del ${formatDayMonth(startDate)} al ${formatDayMonth(endDate)}`;
      const finishText = `Termina el ${formatDayMonth(endDate)}`;

      expect(rangeText).toBe('Del 1/12 al 28/12');
      expect(finishText).toBe('Termina el 28/12');
    });
  });
});
