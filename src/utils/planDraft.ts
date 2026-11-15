import { SaveTrainingPlanRequest, TrainingPlanDetail } from '../api/generated/entrenamiento';
import {
  PlanDraftResponse,
  PlanDraftSession,
  UpdatePlanDraftRequest,
} from '../api/generated/asistente';
import {
  BlockExercise,
  CatalogExercise,
  DayBlock,
  DayPlan,
  DEFAULT_BLOCK_TITLES,
  DraftExercise,
  DraftSession,
  DraftWeek,
  IntensityMetric,
  PlanDraft,
  WeeklyExerciseProgression,
} from '../types/trainingPlans';

// Días en el orden en que los ve el PF (lunes primero). El valor es el del
// contrato: 0 = domingo, 1 = lunes, ..., 6 = sábado.
export const WEEK_DAYS: { value: number; label: string }[] = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
];

export const PERCENTAGE_MAX = 150;

export const META_PREFIX = '<!--PT_BLOCK_META:';
export const META_SUFFIX = '-->';

export interface ExerciseMetadataItem {
  exerciseName?: string;
  intensityType?: IntensityMetric;
  targetRpe?: number | null;
  targetRir?: number | null;
  repsRange?: string | null;
  notes?: string | null;
}

export interface SessionBlockMeta {
  exercises?: Record<string, ExerciseMetadataItem>;
}

export function packCoachNotes(cleanNotes: string, meta?: SessionBlockMeta): string {
  const trimmed = cleanNotes.trim();
  if (!meta || !meta.exercises || Object.keys(meta.exercises).length === 0) {
    return trimmed;
  }
  const serialized = JSON.stringify(meta);
  return trimmed
    ? `${trimmed}\n${META_PREFIX}${serialized}${META_SUFFIX}`
    : `${META_PREFIX}${serialized}${META_SUFFIX}`;
}

export function unpackCoachNotes(rawNotes?: string | null): {
  cleanNotes: string;
  meta: SessionBlockMeta;
} {
  if (!rawNotes) return { cleanNotes: '', meta: {} };
  const startIdx = rawNotes.indexOf(META_PREFIX);
  if (startIdx === -1) {
    return { cleanNotes: rawNotes, meta: {} };
  }
  const endIdx = rawNotes.indexOf(META_SUFFIX, startIdx + META_PREFIX.length);
  if (endIdx === -1) {
    return { cleanNotes: rawNotes, meta: {} };
  }
  const clean = rawNotes.substring(0, startIdx).trim();
  const jsonStr = rawNotes.substring(startIdx + META_PREFIX.length, endIdx);
  try {
    const meta = JSON.parse(jsonStr) as SessionBlockMeta;
    return { cleanNotes: clean, meta };
  } catch {
    return { cleanNotes: rawNotes, meta: {} };
  }
}

export function parseRepsNumber(repsRange?: string | null, fallbackReps = 10): number {
  if (
    repsRange &&
    (repsRange.includes('-') || repsRange.includes('/') || repsRange.includes('a'))
  ) {
    const match = repsRange.match(/\d+/);
    if (match) {
      const parsed = parseInt(match[0], 10);
      return parsed >= 1 ? parsed : fallbackReps;
    }
  }
  if (typeof fallbackReps === 'number' && fallbackReps >= 1) {
    return fallbackReps;
  }
  if (repsRange) {
    const match = repsRange.match(/\d+/);
    if (match) {
      const parsed = parseInt(match[0], 10);
      return parsed >= 1 ? parsed : 10;
    }
  }
  return fallbackReps || 10;
}

let keyCounter = 0;
function newKey(): string {
  keyCounter += 1;
  return `draft-${keyCounter}`;
}

function nextOrder(orders: number[]): number {
  return orders.length === 0 ? 1 : Math.max(...orders) + 1;
}

// Posición del día en la semana del PF (lunes = 0, domingo = 6), para ordenar.
export function dayPosition(dayOfWeek: number): number {
  return (dayOfWeek + 6) % 7;
}

export function dayLabel(dayOfWeek: number): string {
  return WEEK_DAYS.find((day) => day.value === dayOfWeek)?.label ?? '';
}

export function toDraft(plan: TrainingPlanDetail): PlanDraft {
  return {
    id: plan.id,
    name: plan.name,
    objective: plan.objective ?? '',
    weeks: plan.weeks.map((week) => ({
      key: newKey(),
      id: week.id,
      weekNumber: week.weekNumber,
      nextSessionOrder: nextOrder(week.sessions.map((s) => s.order)),
      sessions: week.sessions.map((session) => {
        const { cleanNotes, meta } = unpackCoachNotes(session.coachNotes);
        return {
          key: newKey(),
          id: session.id,
          name: session.name,
          order: session.order,
          dayOfWeek: session.dayOfWeek,
          coachNotes: cleanNotes,
          nextExerciseOrder: nextOrder(session.exercises.map((e) => e.order)),
          exercises: session.exercises.map((exercise) => {
            const ex = exercise as unknown as Record<string, unknown>;
            const exType = (ex.exerciseType as DraftExercise['exerciseType']) ?? 'Weight';
            const exMeta = meta.exercises?.[exercise.exerciseId] || {};
            return {
              key: newKey(),
              id: exercise.id,
              exerciseId: exercise.exerciseId,
              exerciseName: exercise.exerciseName || exMeta.exerciseName || '',
              order: exercise.order,
              exerciseType: exType,
              sets: exercise.sets,
              reps: exercise.reps ?? 0,
              targetDistanceMeters:
                exType === 'Distance'
                  ? (exercise.reps ?? null)
                  : ((ex.targetDistanceMeters as number) ?? null),
              targetTimeSeconds:
                exType === 'Time'
                  ? (exercise.reps ?? null)
                  : ((ex.targetTimeSeconds as number) ?? null),
              targetPercentage: exercise.targetPercentage ?? null,
              intensityType: exMeta.intensityType ?? 'RPE',
              targetRpe: exMeta.targetRpe ?? null,
              targetRir: exMeta.targetRir ?? null,
              repsRange: exMeta.repsRange ?? (exercise.reps ? exercise.reps.toString() : null),
              notes: exMeta.notes ?? null,
            };
          }),
        };
      }),
    })),
  };
}

export function toSaveRequest(draft: PlanDraft): SaveTrainingPlanRequest {
  // Se mandan siempre los id de lo que ya existe, así el back actualiza en el
  // lugar y no depende de emparejar por posición.
  return {
    name: draft.name.trim(),
    objective: draft.objective.trim() || null,
    weeks: draft.weeks.map((week) => ({
      id: week.id,
      weekNumber: week.weekNumber,
      sessions: week.sessions.map((session) => {
        const metaPayload: SessionBlockMeta = { exercises: {} };
        session.exercises.forEach((ex) => {
          if (
            ex.intensityType ||
            ex.targetRpe != null ||
            ex.targetRir != null ||
            ex.repsRange ||
            ex.notes ||
            ex.exerciseName
          ) {
            metaPayload.exercises![ex.exerciseId] = {
              exerciseName: ex.exerciseName,
              intensityType: ex.intensityType,
              targetRpe: ex.targetRpe,
              targetRir: ex.targetRir,
              repsRange: ex.repsRange,
              notes: ex.notes,
            };
          }
        });
        const packedNotes = packCoachNotes(session.coachNotes, metaPayload);

        return {
          id: session.id,
          name: session.name.trim(),
          order: session.order,
          dayOfWeek: session.dayOfWeek,
          coachNotes: packedNotes || null,
          exercises: session.exercises.map((exercise) => {
            const type = exercise.exerciseType ?? 'Weight';
            const repsVal =
              type === 'Distance'
                ? (exercise.targetDistanceMeters ?? exercise.reps ?? 0)
                : type === 'Time'
                  ? (exercise.targetTimeSeconds ?? exercise.reps ?? 0)
                  : (parseRepsNumber(exercise.repsRange, exercise.reps) ?? 0);
            return {
              id: exercise.id,
              exerciseId: exercise.exerciseId,
              order: exercise.order,
              sets: exercise.sets,
              reps: repsVal,
              targetPercentage: exercise.targetPercentage,
            };
          }),
        };
      }),
    })),
  };
}

export function createWeek(weeks: DraftWeek[]): DraftWeek {
  return {
    key: newKey(),
    id: null,
    weekNumber: nextOrder(weeks.map((w) => w.weekNumber)),
    sessions: [],
    nextSessionOrder: 1,
  };
}

export function createSession(week: DraftWeek): DraftSession {
  // Por defecto, el primer día de la semana que todavía no tiene sesión.
  const usedDays = new Set(week.sessions.map((s) => s.dayOfWeek));
  const freeDay = WEEK_DAYS.find((day) => !usedDays.has(day.value)) ?? WEEK_DAYS[0];
  return {
    key: newKey(),
    id: null,
    name: `Sesión ${freeDay.label.toLowerCase()}`,
    order: week.nextSessionOrder,
    dayOfWeek: freeDay.value,
    coachNotes: '',
    exercises: [],
    nextExerciseOrder: 1,
  };
}

export function createExercise(session: DraftSession, exercise: CatalogExercise): DraftExercise {
  const type = exercise.exerciseType ?? 'Weight';

  return {
    key: newKey(),
    id: null,
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    order: session.nextExerciseOrder,
    exerciseType: type,
    sets: type === 'Distance' ? 6 : type === 'Time' ? 4 : 3,
    reps: type === 'Distance' ? 100 : type === 'Time' ? 30 : 10,
    targetDistanceMeters: type === 'Distance' ? 100 : null,
    targetTimeSeconds: type === 'Time' ? 30 : null,
    targetPercentage: null,
  };
}

// Devuelve el primer problema que impediría guardar, o null si está todo bien.
// Son las mismas reglas que valida el back, para avisar antes de mandar.
export function validateDraft(draft: PlanDraft): string | null {
  if (!draft.name.trim()) return 'La planificación necesita un nombre.';

  for (const week of draft.weeks) {
    for (const session of week.sessions) {
      const where = `Semana ${week.weekNumber}, ${dayLabel(session.dayOfWeek).toLowerCase()}`;
      if (!session.name.trim()) return `${where}: la sesión necesita un nombre.`;

      for (const exercise of session.exercises) {
        const type = exercise.exerciseType ?? 'Weight';
        if (!Number.isInteger(exercise.sets) || exercise.sets < 1) {
          return `${where}: las series o pasadas de "${exercise.exerciseName}" tienen que ser 1 o más.`;
        }
        if (type === 'Distance') {
          const dist = exercise.targetDistanceMeters || exercise.reps;
          if (!dist || dist < 1) {
            return `${where}: la distancia de "${exercise.exerciseName}" tiene que ser 1 m o más.`;
          }
        } else if (type === 'Time') {
          const time = exercise.targetTimeSeconds || exercise.reps;
          if (!time || time < 1) {
            return `${where}: el tiempo de "${exercise.exerciseName}" tiene que ser 1 seg o más.`;
          }
        } else {
          if (!Number.isInteger(exercise.reps) || exercise.reps < 1) {
            return `${where}: las repeticiones de "${exercise.exerciseName}" tienen que ser 1 o más.`;
          }
        }
        const percentage = exercise.targetPercentage;
        if (percentage !== null && (percentage <= 0 || percentage > PERCENTAGE_MAX)) {
          return `${where}: el % de "${exercise.exerciseName}" tiene que estar entre 1 y ${PERCENTAGE_MAX}.`;
        }
      }
    }
  }
  return null;
}

export type MoveDirection = -1 | 1;

// Sube (-1) o baja (+1) un ejercicio dentro de su sesión (KAN-542). Intercambia la posición y
// también los `order` de los dos ejercicios: así no aparece un orden repetido ni se reusa el de
// uno que se quitó en el mismo guardado. Es el orden en que el atleta los ve en "Mi rutina".
export function moveExercise(
  session: DraftSession,
  exerciseKey: string,
  direction: MoveDirection,
): DraftSession {
  const from = session.exercises.findIndex((e) => e.key === exerciseKey);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= session.exercises.length) return session;

  const exercises = [...session.exercises];
  const moving = exercises[from];
  const other = exercises[to];
  exercises[from] = { ...other, order: moving.order };
  exercises[to] = { ...moving, order: other.order };
  return { ...session, exercises };
}

// Sesiones del mismo día que `session`, en el orden en que se muestran.
export function sameDaySessions(week: DraftWeek, dayOfWeek: number): DraftSession[] {
  return week.sessions.filter((s) => s.dayOfWeek === dayOfWeek).sort((a, b) => a.order - b.order);
}

// Sube (-1) o baja (+1) una sesión entre las del mismo día (KAN-542): intercambia sus `order`.
// Las de otros días no cambian, porque las sesiones se muestran por día.
export function moveSession(
  week: DraftWeek,
  sessionKey: string,
  direction: MoveDirection,
): DraftWeek {
  const session = week.sessions.find((s) => s.key === sessionKey);
  if (!session) return week;

  const siblings = sameDaySessions(week, session.dayOfWeek);
  const index = siblings.findIndex((s) => s.key === sessionKey);
  const other = siblings[index + direction];
  if (!other) return week;

  return {
    ...week,
    sessions: week.sessions.map((s) => {
      if (s.key === session.key) return { ...s, order: other.order };
      if (s.key === other.key) return { ...s, order: session.order };
      return s;
    }),
  };
}

export type AssistantDayOfWeek = PlanDraftSession['dayOfWeek'];

export const ASSISTANT_DAY_TO_NUMBER: Record<AssistantDayOfWeek, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

export const NUMBER_TO_ASSISTANT_DAY: AssistantDayOfWeek[] = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export function assistantDayToNumber(day: string): number {
  if (day in ASSISTANT_DAY_TO_NUMBER) {
    return ASSISTANT_DAY_TO_NUMBER[day as AssistantDayOfWeek];
  }
  return 1;
}

export function numberToAssistantDay(dayOfWeek: number): AssistantDayOfWeek {
  const normalized = ((dayOfWeek % 7) + 7) % 7;
  return NUMBER_TO_ASSISTANT_DAY[normalized] ?? 'Monday';
}

export function aiDraftToEditableDraft(
  draft: PlanDraftResponse,
  exerciseNames?: Record<string, string>,
): PlanDraft {
  return {
    id: draft.id,
    name: draft.name || 'Borrador generado con IA',
    objective: draft.objective || draft.goal || '',
    weeks: draft.weeks.map((week) => ({
      key: newKey(),
      id: null,
      weekNumber: week.weekNumber,
      nextSessionOrder: nextOrder(week.sessions.map((s) => s.order)),
      sessions: week.sessions.map((session) => {
        const { cleanNotes, meta } = unpackCoachNotes(session.coachNotes);
        return {
          key: newKey(),
          id: null,
          name: session.name,
          order: session.order,
          dayOfWeek: assistantDayToNumber(session.dayOfWeek),
          coachNotes: cleanNotes,
          nextExerciseOrder: nextOrder(session.exercises.map((e) => e.order)),
          exercises: session.exercises.map((exercise) => {
            const exMeta = meta.exercises?.[exercise.exerciseId] || {};
            return {
              key: newKey(),
              id: null,
              exerciseId: exercise.exerciseId,
              exerciseName:
                (exerciseNames && exerciseNames[exercise.exerciseId]) ||
                `Ejercicio #${exercise.order}`,
              order: exercise.order,
              exerciseType: 'Weight',
              sets: exercise.sets,
              reps: exercise.reps,
              targetPercentage: exercise.targetPercentage ?? null,
              intensityType: exMeta.intensityType ?? 'RPE',
              targetRpe: exMeta.targetRpe ?? null,
              targetRir: exMeta.targetRir ?? null,
              repsRange: exMeta.repsRange ?? (exercise.reps ? exercise.reps.toString() : null),
              notes: exMeta.notes ?? null,
            };
          }),
        };
      }),
    })),
  };
}

export function toUpdateDraftRequest(
  draft: PlanDraft,
  justificationSummary: string,
): UpdatePlanDraftRequest {
  return {
    name: draft.name.trim(),
    objective: draft.objective.trim(),
    justificationSummary: justificationSummary.trim(),
    weeks: draft.weeks.map((week) => ({
      weekNumber: week.weekNumber,
      sessions: week.sessions.map((session) => {
        const metaPayload: SessionBlockMeta = { exercises: {} };
        session.exercises.forEach((ex) => {
          if (
            ex.intensityType ||
            ex.targetRpe != null ||
            ex.targetRir != null ||
            ex.repsRange ||
            ex.notes ||
            ex.exerciseName
          ) {
            metaPayload.exercises![ex.exerciseId] = {
              exerciseName: ex.exerciseName,
              intensityType: ex.intensityType,
              targetRpe: ex.targetRpe,
              targetRir: ex.targetRir,
              repsRange: ex.repsRange,
              notes: ex.notes,
            };
          }
        });
        const packedNotes = packCoachNotes(session.coachNotes, metaPayload);

        return {
          name: session.name.trim(),
          order: session.order,
          dayOfWeek: numberToAssistantDay(session.dayOfWeek),
          coachNotes: packedNotes || null,
          exercises: session.exercises.map((exercise) => ({
            exerciseId: exercise.exerciseId,
            order: exercise.order,
            sets: exercise.sets,
            reps: parseRepsNumber(exercise.repsRange, exercise.reps),
            targetPercentage: exercise.targetPercentage,
          })),
        };
      }),
    })),
  };
}

export function swapExercise(
  session: DraftSession,
  exerciseKey: string,
  newExercise: CatalogExercise,
): DraftSession {
  return {
    ...session,
    exercises: session.exercises.map((ex) =>
      ex.key === exerciseKey
        ? {
            ...ex,
            exerciseId: newExercise.id,
            exerciseName: newExercise.name,
          }
        : ex,
    ),
  };
}

// ---------------------------------------------------------------------------
// Block Model & Weekly Progression Grid (KAN-587)
// ---------------------------------------------------------------------------

export function createDefaultBlocks(): DayBlock[] {
  return DEFAULT_BLOCK_TITLES.map((title, index) => ({
    key: newKey(),
    title,
    order: index + 1,
    exercises: [],
  }));
}

export function createDayPlan(dayOfWeek: number, dayName?: string): DayPlan {
  const label = dayLabel(dayOfWeek);
  const plan: DayPlan = {
    dayOfWeek,
    name: dayName || (label ? `Día ${label}` : `Día ${dayOfWeek}`),
    blocks: createDefaultBlocks(),
  };
  // Ensure default blocks have keys
  return plan;
}

export function createBlockExercise(
  catalogExercise: CatalogExercise,
  order: number,
  weekNumbers: number[],
  intensityType: IntensityMetric = 'RPE',
): BlockExercise {
  const type = catalogExercise.exerciseType ?? 'Weight';
  const defaultSets = type === 'Distance' ? 6 : type === 'Time' ? 4 : 3;
  const defaultReps = type === 'Distance' ? 100 : type === 'Time' ? 30 : 10;

  const weeklyProgression: Record<number, WeeklyExerciseProgression> = {};
  weekNumbers.forEach((w) => {
    weeklyProgression[w] = {
      weekNumber: w,
      sets: defaultSets,
      reps: defaultReps,
      repsRange: defaultReps.toString(),
      targetPercentage: null,
      intensityType,
      targetRpe: intensityType === 'RPE' ? 8 : null,
      targetRir: intensityType === 'RIR' ? 2 : null,
      targetDistanceMeters: type === 'Distance' ? 100 : null,
      targetTimeSeconds: type === 'Time' ? 30 : null,
      notes: null,
    };
  });

  return {
    key: newKey(),
    exerciseId: catalogExercise.id,
    exerciseName: catalogExercise.name,
    exerciseType: type,
    order,
    intensityType,
    weeklyProgression,
  };
}

export function reorderBlocks(blocks: DayBlock[], fromIndex: number, toIndex: number): DayBlock[] {
  if (fromIndex < 0 || fromIndex >= blocks.length || toIndex < 0 || toIndex >= blocks.length) {
    return blocks;
  }
  const updated = [...blocks];
  const [moved] = updated.splice(fromIndex, 1);
  updated.splice(toIndex, 0, moved);
  return updated.map((b, idx) => ({ ...b, order: idx + 1 }));
}

export function duplicateBlock(block: DayBlock): DayBlock {
  return {
    key: newKey(),
    title: `${block.title} (copia)`,
    order: block.order + 1,
    exercises: block.exercises.map((ex) => ({
      ...ex,
      key: newKey(),
      weeklyProgression: Object.fromEntries(
        Object.entries(ex.weeklyProgression).map(([weekNum, prog]) => [
          Number(weekNum),
          { ...prog },
        ]),
      ),
    })),
  };
}

export function planDraftToDays(draft: PlanDraft): DayPlan[] {
  const weekCount = Math.max(1, draft.weeks.length);
  const weekNumbers = draft.weeks.map((w) => w.weekNumber).sort((a, b) => a - b);
  if (weekNumbers.length === 0) {
    for (let i = 1; i <= weekCount; i++) weekNumbers.push(i);
  }

  // 1. Group sessions by day of week
  const dayOfWeekMap = new Map<number, DraftSession[]>();
  draft.weeks.forEach((week) => {
    week.sessions.forEach((session) => {
      if (!dayOfWeekMap.has(session.dayOfWeek)) {
        dayOfWeekMap.set(session.dayOfWeek, []);
      }
      dayOfWeekMap.get(session.dayOfWeek)!.push(session);
    });
  });

  // If no sessions yet, create Monday with default blocks
  if (dayOfWeekMap.size === 0) {
    return [createDayPlan(1, 'Lunes')];
  }

  // Sort days following Argentine calendar (Monday = 1 first)
  const sortedDays = Array.from(dayOfWeekMap.keys()).sort(
    (a, b) => dayPosition(a) - dayPosition(b),
  );

  return sortedDays.map((dayOfWeek) => {
    const label = dayLabel(dayOfWeek);
    const blockMap = new Map<
      string,
      { title: string; order: number; exercisesMap: Map<string, BlockExercise> }
    >();

    draft.weeks.forEach((week) => {
      const weekSessionsForDay = week.sessions
        .filter((s) => s.dayOfWeek === dayOfWeek)
        .sort((a, b) => a.order - b.order);

      weekSessionsForDay.forEach((session, sessionIdx) => {
        const blockOrder = session.order || sessionIdx + 1;
        const blockKey = `order-${blockOrder}`;

        if (!blockMap.has(blockKey)) {
          blockMap.set(blockKey, {
            title: session.name || `Bloque ${blockOrder}`,
            order: blockOrder,
            exercisesMap: new Map<string, BlockExercise>(),
          });
        }

        const blockData = blockMap.get(blockKey)!;
        if ((!blockData.title || blockData.title.startsWith('Bloque ')) && session.name) {
          blockData.title = session.name;
        }

        session.exercises.forEach((ex) => {
          if (!blockData.exercisesMap.has(ex.exerciseId)) {
            blockData.exercisesMap.set(ex.exerciseId, {
              key: newKey(),
              exerciseId: ex.exerciseId,
              exerciseName: ex.exerciseName,
              exerciseType: ex.exerciseType,
              order: ex.order,
              intensityType: ex.intensityType ?? 'RPE',
              weeklyProgression: {},
            });
          }

          const blockExercise = blockData.exercisesMap.get(ex.exerciseId)!;
          if (ex.intensityType) {
            blockExercise.intensityType = ex.intensityType;
          }

          blockExercise.weeklyProgression[week.weekNumber] = {
            weekNumber: week.weekNumber,
            sets: ex.sets,
            reps: ex.reps,
            repsRange: ex.repsRange ?? (ex.reps ? ex.reps.toString() : null),
            targetPercentage: ex.targetPercentage,
            intensityType: ex.intensityType ?? blockExercise.intensityType ?? 'RPE',
            targetRpe: ex.targetRpe ?? null,
            targetRir: ex.targetRir ?? null,
            targetDistanceMeters: ex.targetDistanceMeters ?? null,
            targetTimeSeconds: ex.targetTimeSeconds ?? null,
            notes: ex.notes ?? null,
          };
        });
      });
    });

    let dayBlocks: DayBlock[];
    if (blockMap.size === 0) {
      dayBlocks = createDefaultBlocks();
    } else {
      dayBlocks = Array.from(blockMap.values())
        .sort((a, b) => a.order - b.order)
        .map((b, idx) => {
          const exercises = Array.from(b.exercisesMap.values()).sort(
            (e1, e2) => e1.order - e2.order,
          );

          // Ensure each exercise has defined values for each week
          exercises.forEach((ex) => {
            weekNumbers.forEach((w) => {
              if (!ex.weeklyProgression[w]) {
                const baseProg = ex.weeklyProgression[1] || {
                  weekNumber: w,
                  sets: 3,
                  reps: 10,
                  repsRange: '10',
                  targetPercentage: null,
                  intensityType: ex.intensityType,
                  targetRpe: null,
                  targetRir: null,
                  notes: null,
                };
                ex.weeklyProgression[w] = { ...baseProg, weekNumber: w };
              }
            });
          });

          return {
            key: newKey(),
            title: b.title,
            order: idx + 1,
            exercises,
          };
        });
    }

    return {
      dayOfWeek,
      name: label ? `Día ${label}` : `Día ${dayOfWeek}`,
      blocks: dayBlocks,
    };
  });
}

export function daysToPlanDraft(days: DayPlan[], existingDraft: PlanDraft): PlanDraft {
  const weekCount = Math.max(1, existingDraft.weeks.length);
  const weekNumbers = existingDraft.weeks.map((w) => w.weekNumber).sort((a, b) => a - b);
  if (weekNumbers.length === 0) {
    for (let i = 1; i <= weekCount; i++) weekNumbers.push(i);
  }

  const updatedWeeks: DraftWeek[] = weekNumbers.map((w) => {
    const existingWeek = existingDraft.weeks.find((week) => week.weekNumber === w);
    const weekKey = existingWeek?.key || newKey();
    const weekId = existingWeek?.id || null;

    const sessions: DraftSession[] = [];
    let nextSessionOrder = 1;

    days.forEach((day) => {
      day.blocks.forEach((block, blockIndex) => {
        const sessionOrder = block.order || blockIndex + 1;
        const existingSession = existingWeek?.sessions.find(
          (s) =>
            s.dayOfWeek === day.dayOfWeek && (s.order === sessionOrder || s.name === block.title),
        );

        const exercises: DraftExercise[] = block.exercises.map((bEx, exIndex) => {
          const prog = bEx.weeklyProgression[w] || {
            weekNumber: w,
            sets: 3,
            reps: 10,
            repsRange: '10',
            targetPercentage: null,
            intensityType: bEx.intensityType,
            targetRpe: null,
            targetRir: null,
            notes: null,
          };

          const existingExercise = existingSession?.exercises.find(
            (e) => e.exerciseId === bEx.exerciseId,
          );

          return {
            key: existingExercise?.key || newKey(),
            id: existingExercise?.id || null,
            exerciseId: bEx.exerciseId,
            exerciseName: bEx.exerciseName,
            order: bEx.order || exIndex + 1,
            exerciseType: bEx.exerciseType || 'Weight',
            sets: prog.sets,
            reps: parseRepsNumber(prog.repsRange, prog.reps),
            targetPercentage: prog.targetPercentage,
            targetDistanceMeters: prog.targetDistanceMeters ?? null,
            targetTimeSeconds: prog.targetTimeSeconds ?? null,
            intensityType: bEx.intensityType,
            targetRpe: prog.targetRpe ?? null,
            targetRir: prog.targetRir ?? null,
            repsRange: prog.repsRange ?? (prog.reps ? prog.reps.toString() : null),
            notes: prog.notes ?? null,
          };
        });

        sessions.push({
          key: existingSession?.key || newKey(),
          id: existingSession?.id || null,
          name: block.title,
          order: sessionOrder,
          dayOfWeek: day.dayOfWeek,
          coachNotes: existingSession?.coachNotes || '',
          exercises,
          nextExerciseOrder: exercises.length + 1,
        });

        if (sessionOrder >= nextSessionOrder) {
          nextSessionOrder = sessionOrder + 1;
        }
      });
    });

    return {
      key: weekKey,
      id: weekId,
      weekNumber: w,
      sessions,
      nextSessionOrder,
    };
  });

  return {
    ...existingDraft,
    weeks: updatedWeeks,
  };
}
