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

export function packCoachNotes(cleanNotes: string): string {
  return cleanNotes.trim();
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

export function parseRepsNumber(
  repsRange?: string | number | null,
  fallbackReps: number | string = 10,
): number {
  const fallbackNum =
    typeof fallbackReps === 'number' ? fallbackReps : parseInt(String(fallbackReps), 10) || 10;

  if (typeof repsRange === 'number') {
    return repsRange >= 1 ? repsRange : fallbackNum;
  }

  if (typeof repsRange === 'string' && repsRange.trim().length > 0) {
    const match = repsRange.match(/\d+/);
    if (match) {
      const parsed = parseInt(match[0], 10);
      return parsed >= 1 ? parsed : fallbackNum;
    }
  }

  return fallbackNum >= 1 ? fallbackNum : 10;
}

let keyCounter = 0;
function newKey(): string {
  keyCounter += 1;
  return `draft-${keyCounter}`;
}

function nextOrder(orders: number[]): number {
  return orders.length === 0 ? 1 : Math.max(...orders) + 1;
}

/**
 * Normaliza de forma bidireccional cualquier representación de día de semana a número de contrato
 * (0 = Domingo, 1 = Lunes, ..., 6 = Sábado).
 * Soporta:
 * - Números 0..6 (Sunday=0 .. Saturday=6)
 * - 7 (ISO Sunday -> 0)
 * - Strings numéricos ("0".."7")
 * - Strings en inglés de .NET enum DayOfWeek ("Sunday", "Monday", "Friday", etc., case-insensitive)
 * - Strings en español ("Domingo", "Lunes", "Viernes", etc., con o sin tildes)
 * Si no es reconocido o es nulo/inválido, devuelve 1 (Lunes) por defecto.
 */
export function parseDayOfWeek(day: unknown): number {
  if (typeof day === 'number') {
    if (Number.isFinite(day)) {
      if (day === 7) return 0;
      const normalized = Math.round(day);
      if (normalized >= 0 && normalized <= 6) return normalized;
      return ((normalized % 7) + 7) % 7;
    }
    return 1;
  }

  if (typeof day === 'string') {
    const trimmed = day.trim().toLowerCase();
    if (!trimmed) return 1;

    // String numérico ("0".."7")
    const parsedNum = parseInt(trimmed, 10);
    if (!isNaN(parsedNum) && String(parsedNum) === trimmed) {
      if (parsedNum === 7) return 0;
      if (parsedNum >= 0 && parsedNum <= 6) return parsedNum;
      return ((parsedNum % 7) + 7) % 7;
    }

    switch (trimmed) {
      case 'sunday':
      case 'domingo':
        return 0;
      case 'monday':
      case 'lunes':
        return 1;
      case 'tuesday':
      case 'martes':
        return 2;
      case 'wednesday':
      case 'miercoles':
      case 'miércoles':
        return 3;
      case 'thursday':
      case 'jueves':
        return 4;
      case 'friday':
      case 'viernes':
        return 5;
      case 'saturday':
      case 'sabado':
      case 'sábado':
        return 6;
      default:
        return 1;
    }
  }

  return 1;
}

// Posición del día en la semana del PF (lunes = 0, domingo = 6), para ordenar.
export function dayPosition(dayOfWeek: number | string): number {
  const normalized = parseDayOfWeek(dayOfWeek);
  return (normalized + 6) % 7;
}

export function dayLabel(dayOfWeek: number | string): string {
  const normalized = parseDayOfWeek(dayOfWeek);
  return WEEK_DAYS.find((day) => day.value === normalized)?.label ?? '';
}

// Ordena sesiones: por día (lunes primero) y, dentro del mismo día, las que tienen hora
// van antes de las que no tienen, ordenadas de más temprano a más tarde (KAN-559).
export function sortSessionsByDayAndTime(sessions: DraftSession[]): DraftSession[] {
  return [...sessions].sort((a, b) => {
    const dayDiff = dayPosition(a.dayOfWeek) - dayPosition(b.dayOfWeek);
    if (dayDiff !== 0) return dayDiff;

    if (a.startTime && b.startTime) {
      const timeDiff = a.startTime.localeCompare(b.startTime);
      if (timeDiff !== 0) return timeDiff;
    } else if (a.startTime && !b.startTime) {
      return -1;
    } else if (!a.startTime && b.startTime) {
      return 1;
    }

    return a.order - b.order;
  });
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
        const sessionBlocksRaw = session.blocks ?? [];

        const blocks: DayBlock[] = sessionBlocksRaw.map((b) => {
          return {
            key: newKey(),
            id: b.id,
            title: b.title,
            order: b.order,
            exercises: (b.exercises ?? []).map((exercise) => {
              const exType = (exercise.exerciseType as DraftExercise['exerciseType']) ?? 'Weight';
              const repsStr = exercise.reps != null ? String(exercise.reps) : '10';
              const parsedReps = parseRepsNumber(repsStr, 10);
              const intensity = (exercise.intensityType as IntensityMetric) || 'RPE';
              const targetDistanceMeters =
                exType === 'Distance'
                  ? (exercise.targetDistanceMeters ?? parsedReps)
                  : (exercise.targetDistanceMeters ?? null);
              const targetTimeSeconds =
                exType === 'Time'
                  ? (exercise.targetTimeSeconds ?? parsedReps)
                  : (exercise.targetTimeSeconds ?? null);
              return {
                key: newKey(),
                id: exercise.id,
                exerciseId: exercise.exerciseId,
                exerciseName: exercise.exerciseName || '',
                exerciseType: exType,
                order: exercise.order,
                intensityType: intensity,
                weeklyProgression: {
                  [week.weekNumber]: {
                    weekNumber: week.weekNumber,
                    sets: exercise.sets,
                    reps: parsedReps,
                    repsRange: repsStr,
                    targetPercentage: exercise.targetPercentage ?? null,
                    intensityType: intensity,
                    targetRpe: exercise.targetRpe ?? null,
                    targetRir: exercise.targetRir ?? null,
                    targetDistanceMeters,
                    targetTimeSeconds,
                    notes: exercise.notes ?? null,
                  },
                },
                images: exercise.images ?? [],
                primaryMuscles: exercise.primaryMuscles ?? [],
                secondaryMuscles: exercise.secondaryMuscles ?? [],
                muscleGroup: exercise.muscleGroup ?? undefined,
              };
            }),
          };
        });

        // Ejercicios planos para compatibilidad con vistas tradicionales
        const exercisesSource =
          blocks.length > 0
            ? blocks.flatMap((b) => b.exercises)
            : session.exercises.map((e) => {
                const exType = (e.exerciseType as DraftExercise['exerciseType']) ?? 'Weight';
                const exMeta = meta.exercises?.[e.exerciseId] || {};
                const repsStr = e.reps != null ? String(e.reps) : null;
                return {
                  key: newKey(),
                  id: e.id,
                  exerciseId: e.exerciseId,
                  exerciseName: e.exerciseName || exMeta.exerciseName || '',
                  order: e.order,
                  exerciseType: exType,
                  sets: e.sets,
                  reps: parseRepsNumber(repsStr, 10),
                  targetDistanceMeters:
                    exType === 'Distance'
                      ? parseRepsNumber(repsStr, 10)
                      : (e.targetDistanceMeters ?? null),
                  targetTimeSeconds:
                    exType === 'Time'
                      ? parseRepsNumber(repsStr, 10)
                      : (e.targetTimeSeconds ?? null),
                  targetPercentage: e.targetPercentage ?? null,
                  intensityType:
                    (e.intensityType as IntensityMetric) ?? exMeta.intensityType ?? 'RPE',
                  targetRpe: e.targetRpe ?? exMeta.targetRpe ?? null,
                  targetRir: e.targetRir ?? exMeta.targetRir ?? null,
                  repsRange: repsStr ?? exMeta.repsRange ?? null,
                  notes: e.notes ?? exMeta.notes ?? null,
                  images: e.images ?? [],
                  primaryMuscles: e.primaryMuscles ?? [],
                  secondaryMuscles: e.secondaryMuscles ?? [],
                  muscleGroup: e.muscleGroup ?? undefined,
                };
              });

        const flatExercises: DraftExercise[] = exercisesSource.map((exItem) => {
          const prog =
            'weeklyProgression' in exItem
              ? (exItem as BlockExercise).weeklyProgression?.[week.weekNumber]
              : null;
          const exType = exItem.exerciseType ?? 'Weight';
          const rawReps =
            prog?.repsRange ?? ('reps' in exItem && exItem.reps != null ? exItem.reps : 10);
          const parsedReps = parseRepsNumber(rawReps, 10);
          const finalReps = exType === 'Distance' || exType === 'Time' ? parsedReps : rawReps;

          return {
            key: exItem.key,
            id: exItem.id || null,
            exerciseId: exItem.exerciseId,
            exerciseName: exItem.exerciseName,
            order: exItem.order,
            exerciseType: exType,
            sets: prog?.sets ?? ('sets' in exItem ? Number(exItem.sets) : 3),
            reps: finalReps,
            targetDistanceMeters:
              prog?.targetDistanceMeters ??
              ('targetDistanceMeters' in exItem ? exItem.targetDistanceMeters : null) ??
              (exType === 'Distance' ? parsedReps : null),
            targetTimeSeconds:
              prog?.targetTimeSeconds ??
              ('targetTimeSeconds' in exItem ? exItem.targetTimeSeconds : null) ??
              (exType === 'Time' ? parsedReps : null),
            targetPercentage:
              prog?.targetPercentage ??
              ('targetPercentage' in exItem && exItem.targetPercentage != null
                ? exItem.targetPercentage
                : null),
            intensityType: prog?.intensityType ?? exItem.intensityType,
            targetRpe: prog?.targetRpe ?? ('targetRpe' in exItem ? exItem.targetRpe : null),
            targetRir: prog?.targetRir ?? ('targetRir' in exItem ? exItem.targetRir : null),
            repsRange: prog?.repsRange ?? ('repsRange' in exItem ? exItem.repsRange : null),
            notes: prog?.notes ?? ('notes' in exItem ? exItem.notes : null),
            images: exItem.images ?? [],
            primaryMuscles: exItem.primaryMuscles ?? [],
            secondaryMuscles: exItem.secondaryMuscles ?? [],
            muscleGroup: exItem.muscleGroup,
          };
        });

        return {
          key: newKey(),
          id: session.id,
          name: session.name,
          order: session.order,
          dayOfWeek: parseDayOfWeek(session.dayOfWeek),
          coachNotes: cleanNotes,
          startTime: session.startTime ? session.startTime.slice(0, 5) : null,
          blocks: blocks.length > 0 ? blocks : undefined,
          nextExerciseOrder: nextOrder(flatExercises.map((e) => e.order)),
          exercises: flatExercises,
        };
      }),
    })),
  };
}

function mapExerciseToSaveRequest(
  exercise: DraftExercise | BlockExercise,
  weekNumber: number,
  idx: number,
) {
  const isBlockEx = 'weeklyProgression' in exercise;
  const prog = isBlockEx ? (exercise as BlockExercise).weeklyProgression?.[weekNumber] : null;
  const exType = exercise.exerciseType ?? 'Weight';

  const repsVal = prog?.repsRange
    ? String(prog.repsRange).trim()
    : prog?.reps != null
      ? String(prog.reps).trim()
      : 'repsRange' in exercise && exercise.repsRange
        ? String(exercise.repsRange).trim()
        : 'reps' in exercise && exercise.reps != null
          ? String(exercise.reps).trim()
          : '10';

  const setsVal =
    prog?.sets ?? ('sets' in exercise && typeof exercise.sets === 'number' ? exercise.sets : 3);
  const intensityVal: IntensityMetric =
    exercise.intensityType === 'RIR' || prog?.intensityType === 'RIR' ? 'RIR' : 'RPE';

  const rawDist =
    prog?.targetDistanceMeters ??
    ('targetDistanceMeters' in exercise ? exercise.targetDistanceMeters : null);
  const rawTime =
    prog?.targetTimeSeconds ??
    ('targetTimeSeconds' in exercise ? exercise.targetTimeSeconds : null);

  const targetDistanceMeters =
    exType === 'Distance'
      ? rawDist != null && rawDist > 0
        ? rawDist
        : parseRepsNumber(repsVal, 100)
      : null;
  const targetTimeSeconds =
    exType === 'Time'
      ? rawTime != null && rawTime > 0
        ? rawTime
        : parseRepsNumber(repsVal, 30)
      : null;

  return {
    id: exercise.id || null,
    exerciseId: exercise.exerciseId!.trim(),
    order: exercise.order || idx + 1,
    sets: setsVal,
    reps: repsVal || '10',
    targetPercentage:
      prog?.targetPercentage ?? ('targetPercentage' in exercise ? exercise.targetPercentage : null),
    intensityType: intensityVal,
    targetRpe:
      intensityVal === 'RPE'
        ? (prog?.targetRpe ?? ('targetRpe' in exercise ? exercise.targetRpe : null))
        : null,
    targetRir:
      intensityVal === 'RIR'
        ? (prog?.targetRir ?? ('targetRir' in exercise ? exercise.targetRir : null))
        : null,
    targetDistanceMeters,
    targetTimeSeconds,
    notes: prog?.notes ?? ('notes' in exercise ? exercise.notes : null),
  };
}

export function toSaveRequest(draft: PlanDraft): SaveTrainingPlanRequest {
  return {
    name: draft.name.trim(),
    objective: draft.objective.trim() || null,
    weeks: draft.weeks.map((week) => ({
      id: week.id,
      weekNumber: week.weekNumber,
      sessions: week.sessions.map((session) => {
        const cleanSessionNotes = unpackCoachNotes(session.coachNotes).cleanNotes.trim();
        const sessionExercises: (DraftExercise | BlockExercise)[] =
          session.blocks && session.blocks.length > 0
            ? session.blocks.flatMap((b) => b.exercises)
            : session.exercises;

        const formattedStartTime = session.startTime
          ? session.startTime.length === 5
            ? `${session.startTime}:00`
            : session.startTime
          : null;

        const mappedBlocks =
          session.blocks && session.blocks.length > 0
            ? session.blocks.map((block) => ({
                id: block.id || null,
                title: block.title.trim(),
                order: block.order,
                exercises: block.exercises
                  .filter((exercise) => Boolean(exercise.exerciseId?.trim()))
                  .map((exercise, idx) => mapExerciseToSaveRequest(exercise, week.weekNumber, idx)),
              }))
            : undefined;

        const flatExercises = sessionExercises
          .filter((exercise) => Boolean(exercise.exerciseId?.trim()))
          .map((exercise, idx) => mapExerciseToSaveRequest(exercise, week.weekNumber, idx));

        return {
          id: session.id,
          name: session.name.trim(),
          order: session.order,
          dayOfWeek: parseDayOfWeek(session.dayOfWeek),
          coachNotes: cleanSessionNotes || null,
          startTime: formattedStartTime,
          blocks: mappedBlocks,
          exercises: flatExercises,
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
  const usedDays = new Set(week.sessions.map((s) => parseDayOfWeek(s.dayOfWeek)));
  const freeDay = WEEK_DAYS.find((day) => !usedDays.has(day.value)) ?? WEEK_DAYS[0];
  return {
    key: newKey(),
    id: null,
    name: `Sesión ${freeDay.label.toLowerCase()}`,
    order: week.nextSessionOrder,
    dayOfWeek: freeDay.value,
    coachNotes: '',
    startTime: null,
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
    images: exercise.images ?? [],
    primaryMuscles: exercise.primaryMuscles ?? [],
    secondaryMuscles: exercise.secondaryMuscles ?? [],
    muscleGroup: exercise.muscleGroup,
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
        const repsNum =
          typeof exercise.reps === 'number'
            ? exercise.reps
            : parseRepsNumber(exercise.repsRange, exercise.reps);

        if (type === 'Distance') {
          const dist = exercise.targetDistanceMeters || repsNum;
          if (!dist || dist < 1) {
            return `${where}: la distancia de "${exercise.exerciseName}" tiene que ser 1 m o más.`;
          }
        } else if (type === 'Time') {
          const time = exercise.targetTimeSeconds || repsNum;
          if (!time || time < 1) {
            return `${where}: el tiempo de "${exercise.exerciseName}" tiene que ser 1 seg o más.`;
          }
        } else {
          if (!Number.isInteger(repsNum) || repsNum < 1) {
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
export function sameDaySessions(week: DraftWeek, dayOfWeek: number | string): DraftSession[] {
  const targetDay = parseDayOfWeek(dayOfWeek);
  return week.sessions
    .filter((s) => parseDayOfWeek(s.dayOfWeek) === targetDay)
    .sort((a, b) => a.order - b.order);
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

export function assistantDayToNumber(day: unknown): number {
  return parseDayOfWeek(day);
}

export function numberToAssistantDay(dayOfWeek: number | string): AssistantDayOfWeek {
  const normalized = parseDayOfWeek(dayOfWeek);
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
            const exRaw = exercise as unknown as Record<string, unknown>;
            const exMeta =
              (exercise.exerciseId ? meta.exercises?.[exercise.exerciseId] : undefined) || {};
            return {
              key: newKey(),
              id: null,
              exerciseId: exercise.exerciseId ?? null,
              isReference: Boolean(exercise.isReference || !exercise.exerciseId),
              exerciseName:
                exercise.exerciseName ||
                (exercise.exerciseId && exerciseNames?.[exercise.exerciseId]) ||
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
              images: (exRaw.images as string[]) ?? [],
              primaryMuscles: (exRaw.primaryMuscles as string[]) ?? [],
              secondaryMuscles: (exRaw.secondaryMuscles as string[]) ?? [],
              muscleGroup: exercise.muscleGroup ?? (exRaw.muscleGroup as string) ?? undefined,
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
        const cleanSessionNotes = unpackCoachNotes(session.coachNotes).cleanNotes.trim();

        return {
          name: session.name.trim(),
          order: session.order,
          dayOfWeek: numberToAssistantDay(session.dayOfWeek),
          coachNotes: cleanSessionNotes || null,
          exercises: session.exercises.map((exercise) => ({
            exerciseId: exercise.exerciseId,
            order: exercise.order,
            sets: exercise.sets,
            reps:
              typeof exercise.reps === 'number'
                ? exercise.reps
                : parseRepsNumber(exercise.reps ?? exercise.repsRange, 10),
            targetPercentage: exercise.targetPercentage,
            exerciseName: exercise.exerciseName,
            isReference: Boolean(exercise.isReference || !exercise.exerciseId),
            muscleGroup: exercise.muscleGroup ?? null,
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
            isReference: false,
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

export function createDayPlan(dayOfWeek: number | string, dayName?: string): DayPlan {
  const normalized = parseDayOfWeek(dayOfWeek);
  const label = dayLabel(normalized);
  const plan: DayPlan = {
    dayOfWeek: normalized,
    name: dayName || (label ? `Día ${label}` : `Día ${normalized}`),
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
    images: catalogExercise.images ?? [],
    primaryMuscles: catalogExercise.primaryMuscles ?? [],
    secondaryMuscles: catalogExercise.secondaryMuscles ?? [],
    muscleGroup: catalogExercise.muscleGroup,
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

  // 1. Group sessions by day of week (normalizado a número 0..6)
  const dayOfWeekMap = new Map<number, DraftSession[]>();
  draft.weeks.forEach((week) => {
    week.sessions.forEach((session) => {
      const normalizedDay = parseDayOfWeek(session.dayOfWeek);
      if (!dayOfWeekMap.has(normalizedDay)) {
        dayOfWeekMap.set(normalizedDay, []);
      }
      dayOfWeekMap.get(normalizedDay)!.push(session);
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

  return sortedDays.map((rawDayOfWeek) => {
    const dayOfWeek = parseDayOfWeek(rawDayOfWeek);
    const label = dayLabel(dayOfWeek);
    const sessionsForDay = dayOfWeekMap.get(dayOfWeek) || [];
    const hasNativeBlocks = sessionsForDay.some((s) => s.blocks && s.blocks.length > 0);

    const blockMap = new Map<
      string,
      { id?: string | null; title: string; order: number; exercisesMap: Map<string, BlockExercise> }
    >();

    if (hasNativeBlocks) {
      draft.weeks.forEach((week) => {
        const weekSessions = week.sessions.filter((s) => parseDayOfWeek(s.dayOfWeek) === dayOfWeek);
        weekSessions.forEach((session) => {
          (session.blocks || []).forEach((b, bIdx) => {
            const blockOrder = b.order || bIdx + 1;
            const blockKey = `order-${blockOrder}`;

            if (!blockMap.has(blockKey)) {
              blockMap.set(blockKey, {
                id: b.id || null,
                title: b.title,
                order: blockOrder,
                exercisesMap: new Map<string, BlockExercise>(),
              });
            }

            const blockData = blockMap.get(blockKey)!;
            if (b.title && (!blockData.title || blockData.title.startsWith('Bloque '))) {
              blockData.title = b.title;
            }

            b.exercises.forEach((ex) => {
              const refKey = ex.exerciseId ?? `ref:${ex.exerciseName}`;
              if (!blockData.exercisesMap.has(refKey)) {
                blockData.exercisesMap.set(refKey, {
                  key: newKey(),
                  id: ex.id || null,
                  exerciseId: ex.exerciseId,
                  isReference: Boolean(ex.isReference || !ex.exerciseId),
                  exerciseName: ex.exerciseName,
                  exerciseType: ex.exerciseType,
                  order: ex.order,
                  intensityType: ex.intensityType ?? 'RPE',
                  weeklyProgression: {},
                  images: ex.images ?? [],
                  primaryMuscles: ex.primaryMuscles ?? [],
                  secondaryMuscles: ex.secondaryMuscles ?? [],
                  muscleGroup: ex.muscleGroup,
                });
              }

              const blockExercise = blockData.exercisesMap.get(refKey)!;
              if (ex.intensityType === 'RIR') {
                blockExercise.intensityType = 'RIR';
              } else if (!blockExercise.intensityType) {
                blockExercise.intensityType = ex.intensityType || 'RPE';
              }

              const weekProg = ex.weeklyProgression?.[week.weekNumber];
              const repsStr =
                weekProg?.repsRange ??
                (weekProg?.reps != null ? String(weekProg.reps) : String(ex.reps ?? '10'));
              const setsVal = weekProg?.sets ?? (typeof ex.sets === 'number' ? ex.sets : 3);
              const intensityVal =
                weekProg?.intensityType ?? ex.intensityType ?? blockExercise.intensityType ?? 'RPE';

              blockExercise.weeklyProgression[week.weekNumber] = {
                weekNumber: week.weekNumber,
                sets: setsVal,
                reps: parseRepsNumber(repsStr, 10),
                repsRange: repsStr,
                targetPercentage: weekProg?.targetPercentage ?? ex.targetPercentage ?? null,
                intensityType: intensityVal,
                targetRpe: weekProg?.targetRpe ?? ex.targetRpe ?? null,
                targetRir: weekProg?.targetRir ?? ex.targetRir ?? null,
                targetDistanceMeters:
                  weekProg?.targetDistanceMeters ?? ex.targetDistanceMeters ?? null,
                targetTimeSeconds: weekProg?.targetTimeSeconds ?? ex.targetTimeSeconds ?? null,
                notes: weekProg?.notes ?? ex.notes ?? null,
              };
            });
          });
        });
      });
    } else {
      // Rama legada (cuando cada sesión representaba un bloque)
      draft.weeks.forEach((week) => {
        const weekSessionsForDay = week.sessions
          .filter((s) => parseDayOfWeek(s.dayOfWeek) === dayOfWeek)
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
            const refKey = ex.exerciseId ?? `ref:${ex.exerciseName}`;
            if (!blockData.exercisesMap.has(refKey)) {
              blockData.exercisesMap.set(refKey, {
                key: newKey(),
                exerciseId: ex.exerciseId,
                isReference: Boolean(ex.isReference || !ex.exerciseId),
                exerciseName: ex.exerciseName,
                exerciseType: ex.exerciseType,
                order: ex.order,
                intensityType: ex.intensityType ?? 'RPE',
                weeklyProgression: {},
                images: ex.images ?? [],
                primaryMuscles: ex.primaryMuscles ?? [],
                secondaryMuscles: ex.secondaryMuscles ?? [],
                muscleGroup: ex.muscleGroup,
              });
            }

            const blockExercise = blockData.exercisesMap.get(refKey)!;
            if (
              (!blockExercise.images || blockExercise.images.length === 0) &&
              ex.images &&
              ex.images.length > 0
            ) {
              blockExercise.images = ex.images;
            }
            if (
              (!blockExercise.primaryMuscles || blockExercise.primaryMuscles.length === 0) &&
              ex.primaryMuscles &&
              ex.primaryMuscles.length > 0
            ) {
              blockExercise.primaryMuscles = ex.primaryMuscles;
            }
            if (
              (!blockExercise.secondaryMuscles || blockExercise.secondaryMuscles.length === 0) &&
              ex.secondaryMuscles &&
              ex.secondaryMuscles.length > 0
            ) {
              blockExercise.secondaryMuscles = ex.secondaryMuscles;
            }
            if (!blockExercise.muscleGroup && ex.muscleGroup) {
              blockExercise.muscleGroup = ex.muscleGroup;
            }
            if (ex.intensityType) {
              blockExercise.intensityType = ex.intensityType;
            }

            blockExercise.weeklyProgression[week.weekNumber] = {
              weekNumber: week.weekNumber,
              sets: ex.sets,
              reps: parseRepsNumber(ex.repsRange, ex.reps),
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
    }

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
                  targetDistanceMeters: ex.exerciseType === 'Distance' ? 100 : null,
                  targetTimeSeconds: ex.exerciseType === 'Time' ? 30 : null,
                  notes: null,
                };
                ex.weeklyProgression[w] = { ...baseProg, weekNumber: w };
              }
            });
          });

          return {
            key: newKey(),
            id: b.id || null,
            title: b.title,
            order: idx + 1,
            exercises,
          };
        });
    }

    const dayStartTime = sessionsForDay.find((s) => s.startTime)?.startTime || null;

    return {
      dayOfWeek,
      name: label ? `Día ${label}` : `Día ${dayOfWeek}`,
      startTime: dayStartTime,
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

  // Ordenamos los días por su posición en la semana (Lunes primero)
  const sortedDays = [...days].sort((a, b) => dayPosition(a.dayOfWeek) - dayPosition(b.dayOfWeek));

  const updatedWeeks: DraftWeek[] = weekNumbers.map((w) => {
    const existingWeek = existingDraft.weeks.find((week) => week.weekNumber === w);
    const weekKey = existingWeek?.key || newKey();
    const weekId = existingWeek?.id || null;

    const sessions: DraftSession[] = [];
    let sessionCounter = 1;

    sortedDays.forEach((day) => {
      const normalizedDay = parseDayOfWeek(day.dayOfWeek);
      const sortedBlocks = [...day.blocks].sort((a, b) => a.order - b.order);
      const existingSession = (existingWeek?.sessions || []).find(
        (s) => parseDayOfWeek(s.dayOfWeek) === normalizedDay,
      );
      const sessionOrder = sessionCounter++;

      const mappedBlocks: DayBlock[] = sortedBlocks.map((block, bIdx) => {
        const existingBlock = (existingSession?.blocks || []).find(
          (b) => b.title === block.title || b.order === block.order,
        );

        const exercises: BlockExercise[] = block.exercises.map((bEx, exIndex) => {
          const prog = bEx.weeklyProgression[w] || {
            weekNumber: w,
            sets: 3,
            reps: 10,
            repsRange: '10',
            targetPercentage: null,
            intensityType: bEx.intensityType,
            targetRpe: null,
            targetRir: null,
            targetDistanceMeters: null,
            targetTimeSeconds: null,
            notes: null,
          };

          const existingEx = existingBlock?.exercises.find((e) =>
            bEx.exerciseId ? e.exerciseId === bEx.exerciseId : e.exerciseName === bEx.exerciseName,
          );

          return {
            ...bEx,
            key: existingEx?.key || bEx.key || newKey(),
            id: existingEx?.id || bEx.id || null,
            order: bEx.order || exIndex + 1,
            sets: prog.sets,
            reps: parseRepsNumber(prog.repsRange, prog.reps),
            repsRange: prog.repsRange ?? String(prog.reps ?? '10'),
            targetPercentage: prog.targetPercentage,
            intensityType: bEx.intensityType,
            targetRpe: bEx.intensityType === 'RPE' ? (prog.targetRpe ?? null) : null,
            targetRir: bEx.intensityType === 'RIR' ? (prog.targetRir ?? null) : null,
            targetDistanceMeters: prog.targetDistanceMeters ?? null,
            targetTimeSeconds: prog.targetTimeSeconds ?? null,
            notes: prog.notes ?? null,
          };
        });

        return {
          key: existingBlock?.key || block.key || newKey(),
          id: existingBlock?.id || block.id || null,
          title: block.title,
          order: block.order || bIdx + 1,
          exercises,
        };
      });

      const flatExercises: DraftExercise[] = mappedBlocks.flatMap((b) =>
        b.exercises.map((bEx) => {
          const prog = bEx.weeklyProgression[w] || {
            weekNumber: w,
            sets: 3,
            reps: 10,
            repsRange: '10',
            targetPercentage: null,
            intensityType: bEx.intensityType,
            targetRpe: null,
            targetRir: null,
            targetDistanceMeters: null,
            targetTimeSeconds: null,
            notes: null,
          };

          return {
            key: bEx.key,
            id: bEx.id || null,
            exerciseId: bEx.exerciseId,
            isReference: Boolean(bEx.isReference || !bEx.exerciseId),
            exerciseName: bEx.exerciseName,
            order: bEx.order,
            exerciseType: bEx.exerciseType || 'Weight',
            sets: prog.sets,
            reps:
              prog.reps === 0 && (prog.repsRange === '' || prog.repsRange == null)
                ? 0
                : parseRepsNumber(prog.repsRange, prog.reps),
            targetPercentage: prog.targetPercentage,
            targetDistanceMeters: prog.targetDistanceMeters ?? null,
            targetTimeSeconds: prog.targetTimeSeconds ?? null,
            intensityType: bEx.intensityType,
            targetRpe: prog.targetRpe ?? null,
            targetRir: prog.targetRir ?? null,
            repsRange: prog.repsRange ?? (prog.reps ? prog.reps.toString() : null),
            notes: prog.notes ?? null,
            images: bEx.images ?? [],
            primaryMuscles: bEx.primaryMuscles ?? [],
            secondaryMuscles: bEx.secondaryMuscles ?? [],
            muscleGroup: bEx.muscleGroup,
          };
        }),
      );

      sessions.push({
        key: existingSession?.key || newKey(),
        id: existingSession?.id || null,
        name: day.name || `Sesión ${dayLabel(normalizedDay)}`,
        order: sessionOrder,
        dayOfWeek: normalizedDay,
        coachNotes: existingSession?.coachNotes || '',
        startTime: existingSession?.startTime ?? day.startTime ?? null,
        blocks: mappedBlocks,
        exercises: flatExercises,
        nextExerciseOrder: flatExercises.length + 1,
      });
    });

    return {
      key: weekKey,
      id: weekId,
      weekNumber: w,
      sessions,
      nextSessionOrder: sessionCounter,
    };
  });

  return {
    ...existingDraft,
    weeks: updatedWeeks,
  };
}
