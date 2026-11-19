import { describe, expect, it } from 'vitest';
import {
  createBlockExercise,
  createDefaultBlocks,
  daysToPlanDraft,
  duplicateBlock,
  planDraftToDays,
  reorderBlocks,
  toDraft,
  toSaveRequest,
} from '../planDraft';
import { CatalogExercise, DayBlock, DayPlan, PlanDraft } from '../../types/trainingPlans';
import { TrainingPlanDetail } from '../../api/generated/entrenamiento';

describe('PlanDraft Blocks & Weekly Grid (KAN-587)', () => {
  const catSquat: CatalogExercise = {
    id: 'ex-squat',
    name: 'Sentadilla Trasera',
    muscleGroup: 'Piernas',
    equipment: 'Barra',
    images: [],
    exerciseType: 'Weight',
  };
  const catBench: CatalogExercise = {
    id: 'ex-bench',
    name: 'Press de Banca',
    muscleGroup: 'Pecho',
    equipment: 'Barra',
    images: [],
    exerciseType: 'Weight',
  };
  const catPullup: CatalogExercise = {
    id: 'ex-pullup',
    name: 'Dominadas',
    muscleGroup: 'Espalda',
    equipment: 'Barra de dominadas',
    images: [],
    exerciseType: 'Weight',
  };
  const catRow: CatalogExercise = {
    id: 'ex-row',
    name: 'Remo con Barra',
    muscleGroup: 'Espalda',
    equipment: 'Barra',
    images: [],
    exerciseType: 'Weight',
  };
  const catPlank: CatalogExercise = {
    id: 'ex-plank',
    name: 'Plancha Isométrica',
    muscleGroup: 'Core',
    equipment: null,
    images: [],
    exerciseType: 'Time',
  };
  const catHollow: CatalogExercise = {
    id: 'ex-hollow',
    name: 'Hollow Hold',
    muscleGroup: 'Core',
    equipment: null,
    images: [],
    exerciseType: 'Time',
  };

  it('Criterio de aceptación 1: El PF arma un día con 3 bloques y 2 ejercicios por bloque, lo guarda y al volver a abrirlo está exactamente igual', () => {
    // 1. Armar el día con 3 bloques
    const block1: DayBlock = {
      key: 'b-warmup',
      title: 'Entrada en calor / Movilidad',
      order: 1,
      exercises: [
        createBlockExercise(catPlank, 1, [1, 2, 3, 4]),
        createBlockExercise(catHollow, 2, [1, 2, 3, 4]),
      ],
    };

    const block2: DayBlock = {
      key: 'b-fuerza-a',
      title: 'Fuerza A',
      order: 2,
      exercises: [
        createBlockExercise(catSquat, 1, [1, 2, 3, 4]),
        createBlockExercise(catBench, 2, [1, 2, 3, 4]),
      ],
    };

    const block3: DayBlock = {
      key: 'b-fuerza-b',
      title: 'Fuerza B',
      order: 3,
      exercises: [
        createBlockExercise(catPullup, 1, [1, 2, 3, 4]),
        createBlockExercise(catRow, 2, [1, 2, 3, 4]),
      ],
    };

    // Personalizar progresiones y métricas RPE vs RIR
    // Sentadilla: RPE
    block2.exercises[0].intensityType = 'RPE';
    block2.exercises[0].weeklyProgression[1] = {
      weekNumber: 1,
      sets: 3,
      reps: 8,
      repsRange: '8',
      targetPercentage: 70,
      intensityType: 'RPE',
      targetRpe: 7.5,
      targetRir: null,
      notes: 'Adaptación',
    };
    block2.exercises[0].weeklyProgression[3] = {
      weekNumber: 3,
      sets: 4,
      reps: 6,
      repsRange: '6-8',
      targetPercentage: 82.5,
      intensityType: 'RPE',
      targetRpe: 9,
      targetRir: null,
      notes: 'Pico de carga',
    };

    // Press de banca: RIR
    block2.exercises[1].intensityType = 'RIR';
    block2.exercises[1].weeklyProgression[3] = {
      weekNumber: 3,
      sets: 4,
      reps: 8,
      repsRange: '8',
      targetPercentage: 77.5,
      intensityType: 'RIR',
      targetRpe: null,
      targetRir: 1,
      notes: 'Cerca del fallo técnico',
    };

    const dayPlan: DayPlan = {
      dayOfWeek: 1, // Lunes
      blocks: [block1, block2, block3],
    };

    // 2. Convertir a PlanDraft (4 semanas)
    const baseDraft: PlanDraft = {
      id: 'plan-base',
      name: 'Plan de prueba',
      objective: 'Fuerza',
      weeks: [1, 2, 3, 4].map((wn) => ({
        key: `w${wn}`,
        id: null,
        weekNumber: wn,
        nextSessionOrder: 1,
        sessions: [],
      })),
    };
    const planDraft = daysToPlanDraft([dayPlan], baseDraft);

    // Verificar que generó 4 semanas y cada semana tiene las sesiones correspondientes
    expect(planDraft.weeks).toHaveLength(4);

    // 3. Simular Guardado: transformar a toSaveRequest (contrato de entrenamiento)
    const saveRequest = toSaveRequest(planDraft);

    // 4. Simular respuesta del Backend de KAN-585 (TrainingPlanDetail con blocks) y reapertura del plan
    const catalogMap: Record<string, string> = {
      'ex-squat': 'Sentadilla Trasera',
      'ex-bench': 'Press de Banca',
      'ex-pullup': 'Dominadas',
      'ex-row': 'Remo con Barra',
      'ex-plank': 'Plancha Isométrica',
      'ex-hollow': 'Hollow Hold',
    };
    const simulatedResponse: TrainingPlanDetail = {
      id: 'plan-123',
      name: saveRequest.name,
      objective: saveRequest.objective ?? '',
      weeks: (saveRequest.weeks ?? []).map((w, wIdx) => ({
        id: `week-${wIdx + 1}`,
        planId: 'plan-123',
        weekNumber: w.weekNumber,
        sessions: (w.sessions ?? []).map((s, sIdx) => ({
          id: `sess-${wIdx + 1}-${sIdx + 1}`,
          trainingPlanWeekId: `week-${wIdx + 1}`,
          name: s.name,
          dayOfWeek: s.dayOfWeek,
          order: s.order,
          coachNotes: s.coachNotes,
          blocks: (s.blocks ?? []).map((b, bIdx) => ({
            id: b.id || `b-${wIdx + 1}-${sIdx + 1}-${bIdx + 1}`,
            title: b.title,
            order: b.order,
            exercises: (b.exercises ?? []).map((ex, exIdx) => ({
              id: ex.id || `ex-${wIdx + 1}-${sIdx + 1}-${bIdx + 1}-${exIdx + 1}`,
              exerciseId: ex.exerciseId,
              exerciseName: catalogMap[ex.exerciseId] || ex.exerciseId,
              order: ex.order,
              sets: ex.sets,
              reps: String(ex.reps),
              targetPercentage: ex.targetPercentage,
              intensityType: ex.intensityType,
              targetRpe: ex.targetRpe,
              targetRir: ex.targetRir,
              notes: ex.notes,
            })),
          })),
          exercises: (s.exercises ?? []).map((ex, exIdx) => ({
            id: `ex-${wIdx + 1}-${sIdx + 1}-${exIdx + 1}`,
            trainingSessionId: `sess-${wIdx + 1}-${sIdx + 1}`,
            exerciseId: ex.exerciseId,
            exerciseName: catalogMap[ex.exerciseId] || ex.exerciseId,
            order: ex.order,
            sets: ex.sets,
            reps: String(ex.reps),
            targetPercentage: ex.targetPercentage,
            intensityType: ex.intensityType,
            targetRpe: ex.targetRpe,
            targetRir: ex.targetRir,
            notes: ex.notes,
          })),
        })),
      })),
    };

    // 5. Cargar en el front con toDraft y convertir a bloques con planDraftToDays
    const reloadedDraft = toDraft(simulatedResponse);
    const reloadedDays = planDraftToDays(reloadedDraft);

    // 6. Verificar persistencia 100% idéntica
    expect(reloadedDays).toHaveLength(1);
    const reloadedDay = reloadedDays[0];
    expect(reloadedDay.dayOfWeek).toBe(1);
    expect(reloadedDay.blocks).toHaveLength(3);

    // Verificar nombres de los 3 bloques
    expect(reloadedDay.blocks[0].title).toBe('Entrada en calor / Movilidad');
    expect(reloadedDay.blocks[1].title).toBe('Fuerza A');
    expect(reloadedDay.blocks[2].title).toBe('Fuerza B');

    // Verificar que cada bloque tiene exactamente 2 ejercicios
    expect(reloadedDay.blocks[0].exercises).toHaveLength(2);
    expect(reloadedDay.blocks[1].exercises).toHaveLength(2);
    expect(reloadedDay.blocks[2].exercises).toHaveLength(2);

    // Verificar datos de progresión y métrica RPE en Sentadilla
    const reloadedSquat = reloadedDay.blocks[1].exercises[0];
    expect(reloadedSquat.exerciseName).toBe('Sentadilla Trasera');
    expect(reloadedSquat.intensityType).toBe('RPE');
    expect(reloadedSquat.weeklyProgression[1].sets).toBe(3);
    expect(reloadedSquat.weeklyProgression[1].targetRpe).toBe(7.5);
    expect(reloadedSquat.weeklyProgression[1].notes).toBe('Adaptación');

    expect(reloadedSquat.weeklyProgression[3].sets).toBe(4);
    expect(reloadedSquat.weeklyProgression[3].repsRange).toBe('6-8');
    expect(reloadedSquat.weeklyProgression[3].targetPercentage).toBe(82.5);
    expect(reloadedSquat.weeklyProgression[3].targetRpe).toBe(9);
    expect(reloadedSquat.weeklyProgression[3].notes).toBe('Pico de carga');

    // Verificar datos de progresión y métrica RIR en Press de Banca
    const reloadedBench = reloadedDay.blocks[1].exercises[1];
    expect(reloadedBench.exerciseName).toBe('Press de Banca');
    expect(reloadedBench.intensityType).toBe('RIR');
    expect(reloadedBench.weeklyProgression[3].sets).toBe(4);
    expect(reloadedBench.weeklyProgression[3].repsRange).toBe('8');
    expect(reloadedBench.weeklyProgression[3].targetPercentage).toBe(77.5);
    expect(reloadedBench.weeklyProgression[3].targetRir).toBe(1);
    expect(reloadedBench.weeklyProgression[3].notes).toBe('Cerca del fallo técnico');
  });

  it('Criterio de aceptación 2: Cambiar los valores de la semana 3 no toca los de las otras semanas', () => {
    const exercise = createBlockExercise(catSquat, 1, [1, 2, 3, 4]);

    // Estado inicial en semanas 1, 2, 3, 4
    exercise.weeklyProgression[1] = {
      weekNumber: 1,
      sets: 3,
      reps: 10,
      repsRange: '10',
      targetPercentage: 60,
      intensityType: 'RPE',
      targetRpe: 7,
      targetRir: null,
      notes: 'Nota sem 1',
    };
    exercise.weeklyProgression[2] = {
      weekNumber: 2,
      sets: 3,
      reps: 10,
      repsRange: '10',
      targetPercentage: 65,
      intensityType: 'RPE',
      targetRpe: 7.5,
      targetRir: null,
      notes: 'Nota sem 2',
    };
    exercise.weeklyProgression[3] = {
      weekNumber: 3,
      sets: 4,
      reps: 8,
      repsRange: '8',
      targetPercentage: 70,
      intensityType: 'RPE',
      targetRpe: 8,
      targetRir: null,
      notes: 'Nota sem 3',
    };
    exercise.weeklyProgression[4] = {
      weekNumber: 4,
      sets: 3,
      reps: 12,
      repsRange: '12',
      targetPercentage: 55,
      intensityType: 'RPE',
      targetRpe: 6,
      targetRir: null,
      notes: 'Descarga',
    };

    // Copias de referencia profunda de las otras semanas
    const week1Original = { ...exercise.weeklyProgression[1] };
    const week2Original = { ...exercise.weeklyProgression[2] };
    const week4Original = { ...exercise.weeklyProgression[4] };

    // Modificar SOLO la semana 3 (series, repsRange, %RM, RPE, nota)
    exercise.weeklyProgression[3] = {
      ...exercise.weeklyProgression[3],
      sets: 5,
      reps: 5,
      repsRange: '5-5',
      targetPercentage: 85,
      targetRpe: 9.5,
      notes: 'Nueva nota semana 3',
    };

    // Verificar que semana 3 cambió
    expect(exercise.weeklyProgression[3].sets).toBe(5);
    expect(exercise.weeklyProgression[3].targetPercentage).toBe(85);
    expect(exercise.weeklyProgression[3].targetRpe).toBe(9.5);

    // Verificar que las semanas 1, 2 y 4 quedaron 100% inalteradas
    expect(exercise.weeklyProgression[1]).toEqual(week1Original);
    expect(exercise.weeklyProgression[2]).toEqual(week2Original);
    expect(exercise.weeklyProgression[4]).toEqual(week4Original);
  });

  it('reordenar bloques altera el orden y reasigna order secuencialmente', () => {
    const blocks: DayBlock[] = [
      { key: 'b1', title: 'Entrada en calor', order: 1, exercises: [] },
      { key: 'b2', title: 'Fuerza A', order: 2, exercises: [] },
      { key: 'b3', title: 'Accesorios', order: 3, exercises: [] },
    ];

    // Mover Fuerza A (índice 1) arriba (índice 0)
    const reordered = reorderBlocks(blocks, 1, 0);
    expect(reordered.map((b) => b.title)).toEqual(['Fuerza A', 'Entrada en calor', 'Accesorios']);
    expect(reordered.map((b) => b.order)).toEqual([1, 2, 3]);

    // Mover de nuevo hacia abajo al final
    const reorderedEnd = reorderBlocks(reordered, 0, 2);
    expect(reorderedEnd.map((b) => b.title)).toEqual([
      'Entrada en calor',
      'Accesorios',
      'Fuerza A',
    ]);
    expect(reorderedEnd.map((b) => b.order)).toEqual([1, 2, 3]);
  });

  it('duplicar bloque crea una copia con nueva clave y ejercicios clonados con nuevos keys', () => {
    const original: DayBlock = {
      key: 'block-orig',
      title: 'Fuerza A',
      order: 1,
      exercises: [createBlockExercise(catSquat, 1, [1, 2])],
    };

    const duplicated = duplicateBlock(original);

    expect(duplicated.key).not.toBe(original.key);
    expect(duplicated.title).toBe('Fuerza A (copia)');
    expect(duplicated.exercises).toHaveLength(1);
    expect(duplicated.exercises[0].key).not.toBe(original.exercises[0].key);
    expect(duplicated.exercises[0].exerciseName).toBe('Sentadilla Trasera');
    expect(duplicated.exercises[0].weeklyProgression[1].sets).toBe(
      original.exercises[0].weeklyProgression[1].sets,
    );
  });

  it('daysToPlanDraft con multiples dias asigna ordenes unicos secuenciales por semana (evita colision IX)', () => {
    const monday: DayPlan = {
      dayOfWeek: 1,
      name: 'Lunes',
      startTime: null,
      blocks: [{ key: 'b-mon', title: 'Piernas', order: 1, exercises: [] }],
    };
    const wednesday: DayPlan = {
      dayOfWeek: 3,
      name: 'Miércoles',
      startTime: null,
      blocks: [{ key: 'b-wed', title: 'Empuje', order: 1, exercises: [] }],
    };
    const thursday: DayPlan = {
      dayOfWeek: 4,
      name: 'Jueves',
      startTime: null,
      blocks: [{ key: 'b-thu', title: 'Tracción', order: 1, exercises: [] }],
    };

    const baseDraft: PlanDraft = {
      id: 'plan-multi',
      name: 'Plan 3 dias',
      objective: 'Fuerza',
      weeks: [{ key: 'w1', id: null, weekNumber: 1, nextSessionOrder: 1, sessions: [] }],
    };

    const result = daysToPlanDraft([thursday, monday, wednesday], baseDraft);
    const sessions = result.weeks[0].sessions;

    expect(sessions).toHaveLength(3);
    // Deben estar ordenadas secuencialmente por semana
    expect(sessions[0].dayOfWeek).toBe(1);
    expect(sessions[0].order).toBe(1);
    expect(sessions[1].dayOfWeek).toBe(3);
    expect(sessions[1].order).toBe(2);
    expect(sessions[2].dayOfWeek).toBe(4);
    expect(sessions[2].order).toBe(3);
  });

  it('crear bloques por defecto genera los 4 bloques esperados por el PM', () => {
    const defaultBlocks = createDefaultBlocks();
    expect(defaultBlocks.map((b) => b.title)).toEqual([
      'Entrada en calor / Movilidad',
      'Fuerza A',
      'Fuerza B',
      'Accesorios',
    ]);
    expect(defaultBlocks.every((b) => b.exercises.length === 0)).toBe(true);
  });

  it('toSaveRequest serializa blocks nativos con TrainingBlockRequest segun KAN-585', () => {
    const block1: DayBlock = {
      key: 'b1',
      title: 'Fuerza A',
      order: 1,
      exercises: [
        {
          key: 'ex1',
          exerciseId: 'ex-squat',
          exerciseName: 'Sentadilla Trasera',
          order: 1,
          intensityType: 'RPE',
          weeklyProgression: {
            1: {
              weekNumber: 1,
              sets: 4,
              reps: 6,
              repsRange: '6-8',
              targetPercentage: 80,
              intensityType: 'RPE',
              targetRpe: 8.5,
              targetRir: null,
              notes: 'Pausa abajo',
            },
          },
        },
      ],
    };

    const day: DayPlan = {
      dayOfWeek: 1,
      blocks: [block1],
    };

    const baseDraft: PlanDraft = {
      id: 'plan-blocks-test',
      name: 'Plan Bloques',
      objective: 'Fuerza',
      weeks: [{ key: 'w1', id: null, weekNumber: 1, nextSessionOrder: 1, sessions: [] }],
    };

    const draft = daysToPlanDraft([day], baseDraft);
    const saveRequest = toSaveRequest(draft);

    expect(saveRequest.weeks).toHaveLength(1);
    const weekReq = saveRequest.weeks![0];
    expect(weekReq.sessions).toHaveLength(1);

    const sessionReq = weekReq.sessions![0];
    expect(sessionReq.blocks).toBeDefined();
    expect(sessionReq.blocks).toHaveLength(1);

    const blockReq = sessionReq.blocks![0];
    expect(blockReq.title).toBe('Fuerza A');
    expect(blockReq.order).toBe(1);
    expect(blockReq.exercises).toHaveLength(1);

    const exReq = blockReq.exercises![0];
    expect(exReq.exerciseId).toBe('ex-squat');
    expect(exReq.sets).toBe(4);
    expect(exReq.reps).toBe('6-8');
    expect(exReq.targetPercentage).toBe(80);
    expect(exReq.intensityType).toBe('RPE');
    expect(exReq.targetRpe).toBe(8.5);
    expect(exReq.notes).toBe('Pausa abajo');
  });
});
