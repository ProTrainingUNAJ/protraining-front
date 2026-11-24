import { describe, it, expect } from 'vitest';
import {
  createBlockExercise,
  createExercise,
  createSession,
  createWeek,
  daysToPlanDraft,
  planDraftToDays,
  validateDraft,
  toSaveRequest,
  toDraft,
} from '../planDraft';
import { CatalogExercise, DayPlan, PlanDraft } from '../../types/trainingPlans';
import { TrainingPlanDetail } from '../../api/generated/entrenamiento';

describe('PlanDraft - Exercise Modalities (KAN-454)', () => {
  const dummyWeek = createWeek([]);
  const dummySession = createSession(dummyWeek);

  it('createExercise initializes presets according to exercise modality', () => {
    const distanceEx: CatalogExercise = {
      id: 'ex-1',
      name: 'Pasadas',
      muscleGroup: 'Piernas',
      equipment: null,
      images: [],
      exerciseType: 'Distance',
      variants: [],
    };
    const timeEx: CatalogExercise = {
      id: 'ex-2',
      name: 'Plancha isométrica',
      muscleGroup: 'Core',
      equipment: null,
      images: [],
      exerciseType: 'Time',
      variants: [],
    };
    const repsEx: CatalogExercise = {
      id: 'ex-3',
      name: 'Dominadas',
      muscleGroup: 'Espalda',
      equipment: null,
      images: [],
      exerciseType: 'Reps',
      variants: [],
    };
    const weightEx: CatalogExercise = {
      id: 'ex-4',
      name: 'Press de banca',
      muscleGroup: 'Pecho',
      equipment: 'Barra',
      images: [],
      exerciseType: 'Weight',
      variants: [],
    };

    const draftDistance = createExercise(dummySession, distanceEx);
    expect(draftDistance.exerciseType).toBe('Distance');
    expect(draftDistance.sets).toBe(6);
    expect(draftDistance.targetDistanceMeters).toBe(100);
    expect(draftDistance.reps).toBe(100);

    const draftTime = createExercise(dummySession, timeEx);
    expect(draftTime.exerciseType).toBe('Time');
    expect(draftTime.sets).toBe(4);
    expect(draftTime.targetTimeSeconds).toBe(30);
    expect(draftTime.reps).toBe(30);

    const draftReps = createExercise(dummySession, repsEx);
    expect(draftReps.exerciseType).toBe('Reps');
    expect(draftReps.sets).toBe(3);
    expect(draftReps.reps).toBe(10);

    const draftWeight = createExercise(dummySession, weightEx);
    expect(draftWeight.exerciseType).toBe('Weight');
    expect(draftWeight.sets).toBe(3);
    expect(draftWeight.reps).toBe(10);
  });

  it('Criterio de aceptación KAN-454: DADO un PF CUANDO agrega «6 × 100 m al 90 %» ENTONCES queda guardado como serie por distancia', () => {
    const draft: PlanDraft = {
      id: 'plan-draft-1',
      name: 'Plan Resistencia',
      objective: 'Velocidad y resistencia',
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
              name: 'Sesión Lunes',
              order: 1,
              dayOfWeek: 1,
              coachNotes: '',
              nextExerciseOrder: 2,
              exercises: [
                {
                  key: 'e1',
                  id: null,
                  exerciseId: 'pasadas-guid',
                  exerciseName: 'Pasadas',
                  order: 1,
                  exerciseType: 'Distance',
                  sets: 6,
                  targetDistanceMeters: 100,
                  targetTimeSeconds: null,
                  reps: 100,
                  targetPercentage: 90,
                },
              ],
            },
          ],
        },
      ],
    };

    expect(validateDraft(draft)).toBeNull();

    const saveRequest = toSaveRequest(draft);
    const session = saveRequest.weeks?.[0]?.sessions?.[0];
    expect(session).toBeDefined();

    const ex = session?.exercises?.[0];
    expect(ex).toBeDefined();
    expect(ex?.sets).toBe(6);
    expect(ex?.reps).toBe('100');
    expect(ex?.targetPercentage).toBe(90);
  });

  it('toDraft reconstruye correctamente targetDistanceMeters y targetTimeSeconds a partir de reps y exerciseType', () => {
    const backendPlan: TrainingPlanDetail = {
      id: 'plan-1',
      name: 'Plan Mixto',
      objective: 'General',
      weeks: [
        {
          id: 'w-1',
          weekNumber: 1,
          sessions: [
            {
              id: 's-1',
              name: 'Sesión 1',
              order: 1,
              dayOfWeek: 1,
              coachNotes: null,
              blocks: [],
              exercises: [
                {
                  id: 'pe-1',
                  exerciseId: 'ex-dist',
                  exerciseName: 'Pasadas',
                  order: 1,
                  sets: 6,
                  reps: '100',
                  targetPercentage: 90,
                  exerciseType: 'Distance',
                },
                {
                  id: 'pe-2',
                  exerciseId: 'ex-time',
                  exerciseName: 'Plancha',
                  order: 2,
                  sets: 3,
                  reps: '45',
                  targetPercentage: null,
                  exerciseType: 'Time',
                },
              ],
            },
          ],
        },
      ],
    };

    const draft = toDraft(backendPlan);
    const exercises = draft.weeks[0].sessions[0].exercises;

    expect(exercises[0].exerciseType).toBe('Distance');
    expect(exercises[0].sets).toBe(6);
    expect(exercises[0].targetDistanceMeters).toBe(100);
    expect(exercises[0].reps).toBe(100);
    expect(exercises[0].targetPercentage).toBe(90);

    expect(exercises[1].exerciseType).toBe('Time');
    expect(exercises[1].sets).toBe(3);
    expect(exercises[1].targetTimeSeconds).toBe(45);
    expect(exercises[1].reps).toBe(45);
  });

  it('validateDraft rechaza cuando falta distancia o tiempo en sus respectivas modalidades', () => {
    const invalidDistDraft: PlanDraft = {
      id: 'plan-draft-2',
      name: 'Plan Invalido',
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
              name: 'Sesión 1',
              order: 1,
              dayOfWeek: 1,
              coachNotes: '',
              nextExerciseOrder: 2,
              exercises: [
                {
                  key: 'e1',
                  id: null,
                  exerciseId: 'ex-1',
                  exerciseName: 'Pasadas',
                  order: 1,
                  exerciseType: 'Distance',
                  sets: 5,
                  targetDistanceMeters: 0,
                  targetTimeSeconds: null,
                  reps: 0,
                  targetPercentage: null,
                },
              ],
            },
          ],
        },
      ],
    };

    expect(validateDraft(invalidDistDraft)).toContain(
      'la distancia de "Pasadas" tiene que ser 1 m o más',
    );
  });

  it('Criterios KAN-655: toSaveRequest envía targetTimeSeconds y targetDistanceMeters en bloques y planos, y toDraft los preserva', () => {
    const troteCat: CatalogExercise = {
      id: 'ex-trote',
      name: 'Trote',
      muscleGroup: 'Cardio',
      equipment: null,
      images: [],
      exerciseType: 'Time',
    };
    const pasadasCat: CatalogExercise = {
      id: 'ex-pasadas',
      name: 'Pasadas 400m',
      muscleGroup: 'Piernas',
      equipment: null,
      images: [],
      exerciseType: 'Distance',
    };
    const fuerzaCat: CatalogExercise = {
      id: 'ex-squat',
      name: 'Sentadilla',
      muscleGroup: 'Piernas',
      equipment: 'Barra',
      images: [],
      exerciseType: 'Weight',
    };

    const troteBlockEx = createBlockExercise(troteCat, 1, [1]);
    troteBlockEx.weeklyProgression[1] = {
      ...troteBlockEx.weeklyProgression[1],
      sets: 1,
      reps: 300,
      repsRange: '300',
      targetTimeSeconds: 300,
    };

    const pasadasBlockEx = createBlockExercise(pasadasCat, 2, [1]);
    pasadasBlockEx.weeklyProgression[1] = {
      ...pasadasBlockEx.weeklyProgression[1],
      sets: 4,
      reps: 400,
      repsRange: '400',
      targetDistanceMeters: 400,
    };

    const fuerzaBlockEx = createBlockExercise(fuerzaCat, 3, [1]);

    const day: DayPlan = {
      dayOfWeek: 1,
      blocks: [
        {
          key: 'b1',
          title: 'Principal',
          order: 1,
          exercises: [troteBlockEx, pasadasBlockEx, fuerzaBlockEx],
        },
      ],
    };

    const baseDraft: PlanDraft = {
      id: 'plan-kan655',
      name: 'Plan KAN-655',
      objective: '',
      weeks: [{ key: 'w1', id: null, weekNumber: 1, nextSessionOrder: 1, sessions: [] }],
    };

    const draft = daysToPlanDraft([day], baseDraft);
    const saveRequest = toSaveRequest(draft);
    const session = saveRequest.weeks?.[0]?.sessions?.[0];

    expect(session?.blocks?.[0]?.exercises?.[0]).toMatchObject({
      exerciseId: 'ex-trote',
      targetTimeSeconds: 300,
      targetDistanceMeters: null,
    });
    expect(session?.blocks?.[0]?.exercises?.[1]).toMatchObject({
      exerciseId: 'ex-pasadas',
      targetDistanceMeters: 400,
      targetTimeSeconds: null,
    });
    expect(session?.blocks?.[0]?.exercises?.[2]).toMatchObject({
      exerciseId: 'ex-squat',
      targetDistanceMeters: null,
      targetTimeSeconds: null,
    });

    // También en ejercicios planos de compatibilidad
    expect(session?.exercises?.[0]).toMatchObject({
      exerciseId: 'ex-trote',
      targetTimeSeconds: 300,
      targetDistanceMeters: null,
    });
    expect(session?.exercises?.[1]).toMatchObject({
      exerciseId: 'ex-pasadas',
      targetDistanceMeters: 400,
      targetTimeSeconds: null,
    });

    // Round-trip: simular respuesta del back con blocks y reabrir con toDraft + planDraftToDays
    const typeMap: Record<string, 'Weight' | 'Time' | 'Distance' | 'Reps'> = {
      'ex-trote': 'Time',
      'ex-pasadas': 'Distance',
      'ex-squat': 'Weight',
    };
    const backendDetail: TrainingPlanDetail = {
      id: 'plan-kan655',
      name: saveRequest.name,
      objective: saveRequest.objective ?? '',
      weeks: (saveRequest.weeks ?? []).map((w, wi) => ({
        id: `w-${wi}`,
        weekNumber: w.weekNumber,
        sessions: (w.sessions ?? []).map((s, si) => ({
          id: `s-${si}`,
          name: s.name,
          order: s.order,
          dayOfWeek: s.dayOfWeek,
          coachNotes: s.coachNotes ?? null,
          blocks: (s.blocks ?? []).map((b, bi) => ({
            id: `b-${bi}`,
            title: b.title,
            order: b.order,
            exercises: (b.exercises ?? []).map((ex, ei) => ({
              id: `pe-${ei}`,
              exerciseId: ex.exerciseId,
              exerciseName: ex.exerciseId,
              exerciseType: typeMap[ex.exerciseId],
              order: ex.order,
              sets: ex.sets,
              reps: ex.reps,
              targetPercentage: ex.targetPercentage ?? null,
              intensityType: ex.intensityType,
              targetRpe: ex.targetRpe ?? null,
              targetRir: ex.targetRir ?? null,
              targetDistanceMeters: ex.targetDistanceMeters ?? null,
              targetTimeSeconds: ex.targetTimeSeconds ?? null,
              notes: ex.notes ?? null,
            })),
          })),
          exercises: [],
        })),
      })),
    };

    const reopenedDays = planDraftToDays(toDraft(backendDetail));
    const reopenedExercises = reopenedDays[0].blocks[0].exercises;
    expect(reopenedExercises[0].weeklyProgression[1].targetTimeSeconds).toBe(300);
    expect(reopenedExercises[1].weeklyProgression[1].targetDistanceMeters).toBe(400);
  });

  it('daysToPlanDraft preserva reps: 0 cuando se vacía el input en bloques y validateDraft rechaza guardar', () => {
    const troteCat: CatalogExercise = {
      id: 'ex-trote',
      name: 'Trote',
      muscleGroup: 'Cardio',
      equipment: null,
      images: [],
      exerciseType: 'Time',
    };
    const pasadasCat: CatalogExercise = {
      id: 'ex-pasadas',
      name: 'Pasadas',
      muscleGroup: 'Piernas',
      equipment: null,
      images: [],
      exerciseType: 'Distance',
    };

    const troteEx = createBlockExercise(troteCat, 1, [1]);
    troteEx.weeklyProgression[1] = {
      ...troteEx.weeklyProgression[1],
      targetTimeSeconds: null,
      reps: 0,
      repsRange: '',
    };

    const baseDraft: PlanDraft = {
      id: 'plan-empty-target',
      name: 'Plan vacío',
      objective: '',
      weeks: [{ key: 'w1', id: null, weekNumber: 1, nextSessionOrder: 1, sessions: [] }],
    };

    const timeDraft = daysToPlanDraft(
      [
        {
          dayOfWeek: 1,
          blocks: [{ key: 'b1', title: 'Principal', order: 1, exercises: [troteEx] }],
        },
      ],
      baseDraft,
    );

    expect(timeDraft.weeks[0].sessions[0].exercises[0].reps).toBe(0);
    expect(validateDraft(timeDraft)).toContain('el tiempo de "Trote" tiene que ser 1 seg o más');

    const pasadasEx = createBlockExercise(pasadasCat, 1, [1]);
    pasadasEx.weeklyProgression[1] = {
      ...pasadasEx.weeklyProgression[1],
      targetDistanceMeters: null,
      reps: 0,
      repsRange: '',
    };

    const distDraft = daysToPlanDraft(
      [
        {
          dayOfWeek: 1,
          blocks: [{ key: 'b1', title: 'Principal', order: 1, exercises: [pasadasEx] }],
        },
      ],
      baseDraft,
    );

    expect(distDraft.weeks[0].sessions[0].exercises[0].reps).toBe(0);
    expect(validateDraft(distDraft)).toContain('la distancia de "Pasadas" tiene que ser 1 m o más');
  });
});
