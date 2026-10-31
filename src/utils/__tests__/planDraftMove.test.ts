import { describe, expect, it } from 'vitest';
import { moveExercise, moveSession, toSaveRequest } from '../planDraft';
import { DraftExercise, DraftSession, DraftWeek, PlanDraft } from '../../types/trainingPlans';

// KAN-542: reordenar ejercicios y sesiones con flechas en el editor de planificaciones.

const exercise = (key: string, order: number, name: string): DraftExercise => ({
  key,
  id: `id-${key}`,
  exerciseId: `ex-${key}`,
  exerciseName: name,
  order,
  sets: 3,
  reps: 8,
  targetPercentage: 70,
});

const session = (
  key: string,
  order: number,
  dayOfWeek: number,
  exercises: DraftExercise[] = [],
): DraftSession => ({
  key,
  id: `id-${key}`,
  name: `Sesión ${key}`,
  order,
  dayOfWeek,
  coachNotes: '',
  exercises,
  nextExerciseOrder: 10,
});

describe('moveExercise', () => {
  const squat = exercise('squat', 1, 'Sentadilla');
  const bench = exercise('bench', 2, 'Press de banca');
  const row = exercise('row', 4, 'Remo');
  const base = session('s1', 1, 1, [squat, bench, row]);

  it('sube el press: queda primero y los dos intercambian su orden', () => {
    const moved = moveExercise(base, 'bench', -1);

    expect(moved.exercises.map((e) => e.key)).toEqual(['bench', 'squat', 'row']);
    expect(moved.exercises.map((e) => e.order)).toEqual([1, 2, 4]);
  });

  it('conserva los ids, así el back actualiza en el lugar', () => {
    const moved = moveExercise(base, 'bench', -1);

    expect(moved.exercises.find((e) => e.key === 'bench')?.id).toBe('id-bench');
    expect(moved.exercises.find((e) => e.key === 'squat')?.id).toBe('id-squat');
  });

  it('no reusa órdenes: el conjunto de órdenes no cambia, aunque haya huecos', () => {
    const moved = moveExercise(base, 'row', -1);

    expect(moved.exercises.map((e) => e.order).sort()).toEqual([1, 2, 4]);
    expect(moved.nextExerciseOrder).toBe(10);
  });

  it('el primero no sube y el último no baja', () => {
    expect(moveExercise(base, 'squat', -1)).toBe(base);
    expect(moveExercise(base, 'row', 1)).toBe(base);
  });
});

describe('moveSession', () => {
  const week: DraftWeek = {
    key: 'w1',
    id: 'id-w1',
    weekNumber: 1,
    nextSessionOrder: 4,
    sessions: [session('am', 1, 1), session('pm', 2, 1), session('wed', 3, 3)],
  };

  it('intercambia dos sesiones del mismo día y conserva los ids', () => {
    const moved = moveSession(week, 'pm', -1);
    const byKey = Object.fromEntries(moved.sessions.map((s) => [s.key, s]));

    expect(byKey.pm.order).toBe(1);
    expect(byKey.am.order).toBe(2);
    expect(byKey.pm.id).toBe('id-pm');
    expect(byKey.wed.order).toBe(3);
  });

  it('no mueve una sesión que es la única de su día', () => {
    expect(moveSession(week, 'wed', -1)).toBe(week);
    expect(moveSession(week, 'wed', 1)).toBe(week);
  });

  it('lo que se guarda lleva el orden nuevo y los mismos ids', () => {
    const draft: PlanDraft = {
      id: 'p1',
      name: 'Fuerza',
      objective: '',
      weeks: [moveSession(week, 'pm', -1)],
    };

    const sessions = toSaveRequest(draft).weeks![0].sessions!;

    expect(sessions.find((s) => s.id === 'id-pm')?.order).toBe(1);
    expect(sessions.find((s) => s.id === 'id-am')?.order).toBe(2);
  });
});
