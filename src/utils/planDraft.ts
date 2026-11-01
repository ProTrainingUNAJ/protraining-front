import { SaveTrainingPlanRequest, TrainingPlanDetail } from '../api/generated/entrenamiento';
import {
  PlanDraftResponse,
  PlanDraftSession,
  UpdatePlanDraftRequest,
} from '../api/generated/asistente';
import {
  CatalogExercise,
  DraftExercise,
  DraftSession,
  DraftWeek,
  PlanDraft,
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
      sessions: week.sessions.map((session) => ({
        key: newKey(),
        id: session.id,
        name: session.name,
        order: session.order,
        dayOfWeek: session.dayOfWeek,
        coachNotes: session.coachNotes ?? '',
        nextExerciseOrder: nextOrder(session.exercises.map((e) => e.order)),
        exercises: session.exercises.map((exercise) => ({
          key: newKey(),
          id: exercise.id,
          exerciseId: exercise.exerciseId,
          exerciseName: exercise.exerciseName,
          order: exercise.order,
          sets: exercise.sets,
          reps: exercise.reps,
          targetPercentage: exercise.targetPercentage ?? null,
        })),
      })),
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
      sessions: week.sessions.map((session) => ({
        id: session.id,
        name: session.name.trim(),
        order: session.order,
        dayOfWeek: session.dayOfWeek,
        coachNotes: session.coachNotes.trim() || null,
        exercises: session.exercises.map((exercise) => ({
          id: exercise.id,
          exerciseId: exercise.exerciseId,
          order: exercise.order,
          sets: exercise.sets,
          reps: exercise.reps,
          targetPercentage: exercise.targetPercentage,
        })),
      })),
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
  return {
    key: newKey(),
    id: null,
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    order: session.nextExerciseOrder,
    sets: 3,
    reps: 10,
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
        if (!Number.isInteger(exercise.sets) || exercise.sets < 1) {
          return `${where}: las series de "${exercise.exerciseName}" tienen que ser 1 o más.`;
        }
        if (!Number.isInteger(exercise.reps) || exercise.reps < 1) {
          return `${where}: las repeticiones de "${exercise.exerciseName}" tienen que ser 1 o más.`;
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
      sessions: week.sessions.map((session) => ({
        key: newKey(),
        id: null,
        name: session.name,
        order: session.order,
        dayOfWeek: assistantDayToNumber(session.dayOfWeek),
        coachNotes: session.coachNotes ?? '',
        nextExerciseOrder: nextOrder(session.exercises.map((e) => e.order)),
        exercises: session.exercises.map((exercise) => ({
          key: newKey(),
          id: null,
          exerciseId: exercise.exerciseId,
          exerciseName:
            (exerciseNames && exerciseNames[exercise.exerciseId]) || `Ejercicio #${exercise.order}`,
          order: exercise.order,
          sets: exercise.sets,
          reps: exercise.reps,
          targetPercentage: exercise.targetPercentage ?? null,
        })),
      })),
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
      sessions: week.sessions.map((session) => ({
        name: session.name.trim(),
        order: session.order,
        dayOfWeek: numberToAssistantDay(session.dayOfWeek),
        coachNotes: session.coachNotes.trim() || null,
        exercises: session.exercises.map((exercise) => ({
          exerciseId: exercise.exerciseId,
          order: exercise.order,
          sets: exercise.sets,
          reps: exercise.reps,
          targetPercentage: exercise.targetPercentage,
        })),
      })),
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
