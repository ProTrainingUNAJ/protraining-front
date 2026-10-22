// Tipos del editor de planificaciones. Lo que viene y va al back usa los tipos
// del SDK generado (TrainingPlanDetail, SaveTrainingPlanRequest); estos son el
// borrador que edita el PF antes de guardar.

export interface PlanListItem {
  id: string;
  name: string;
  objective: string | null;
}

export interface PlanAssignmentTarget {
  type: 'category' | 'athlete';
  id: string;
}

export interface CatalogExercise {
  id: string;
  name: string;
  muscleGroup: string;
  equipment: string | null;
  images: string[];
}

export interface ExercisePage {
  items: CatalogExercise[];
  page: number;
  totalPages: number;
  totalCount: number;
}

export interface DraftExercise {
  // key es solo para React; id es el del back (no existe hasta guardar).
  key: string;
  id: string | null;
  exerciseId: string;
  exerciseName: string;
  order: number;
  sets: number;
  reps: number;
  targetPercentage: number | null;
}

export interface DraftSession {
  key: string;
  id: string | null;
  name: string;
  order: number;
  // 0 = domingo, 1 = lunes, ..., 6 = sábado (igual que el contrato).
  dayOfWeek: number;
  coachNotes: string;
  exercises: DraftExercise[];
  // Próximo orden libre para un ejercicio nuevo. Nunca baja: así un ejercicio
  // nuevo no reusa el orden de uno que se quitó en el mismo guardado.
  nextExerciseOrder: number;
}

export interface DraftWeek {
  key: string;
  id: string | null;
  weekNumber: number;
  sessions: DraftSession[];
  nextSessionOrder: number;
}

export interface PlanDraft {
  id: string;
  name: string;
  objective: string;
  weeks: DraftWeek[];
}
