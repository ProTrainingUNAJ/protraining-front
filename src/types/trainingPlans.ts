// Tipos del editor de planificaciones. Lo que viene y va al back usa los tipos
// del SDK generado (TrainingPlanDetail, SaveTrainingPlanRequest); estos son el
// borrador que edita el PF antes de guardar.

export interface PlanListItem {
  id: string;
  name: string;
  objective: string | null;
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  targetMuscles?: string[];
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
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  exerciseType?: 'Weight' | 'Time' | 'Distance' | 'Reps';
  // Variantes (KAN-554): la etiqueta si es una variante ("Agarre cerrado"), y sus variantes si
  // es un ejercicio base (solo cuando se pide el catálogo agrupado).
  variantLabel?: string | null;
  variants?: CatalogExercise[];
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
  exerciseId: string | null;
  isReference?: boolean;
  exerciseName: string;
  order: number;
  exerciseType?: 'Weight' | 'Time' | 'Distance' | 'Reps';
  sets: number;
  reps: number;
  targetDistanceMeters?: number | null;
  targetTimeSeconds?: number | null;
  targetPercentage: number | null;
  // Métricas avanzadas de intensidad y notas (KAN-587)
  intensityType?: 'RPE' | 'RIR';
  targetRpe?: number | null;
  targetRir?: number | null;
  repsRange?: string | null;
  notes?: string | null;
  images?: string[];
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  muscleGroup?: string;
}

export type IntensityMetric = 'RPE' | 'RIR';

export interface WeeklyExerciseProgression {
  weekNumber: number;
  sets: number;
  reps: number;
  repsRange?: string | null;
  targetPercentage: number | null;
  intensityType: IntensityMetric;
  targetRpe?: number | null;
  targetRir?: number | null;
  targetDistanceMeters?: number | null;
  targetTimeSeconds?: number | null;
  notes?: string | null;
}

export interface BlockExercise {
  key: string;
  exerciseId: string | null;
  isReference?: boolean;
  exerciseName: string;
  exerciseType?: 'Weight' | 'Time' | 'Distance' | 'Reps';
  order: number;
  intensityType: IntensityMetric;
  weeklyProgression: Record<number, WeeklyExerciseProgression>;
  images?: string[];
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  muscleGroup?: string;
}

export interface DayBlock {
  key: string;
  title: string;
  order: number;
  exercises: BlockExercise[];
}

export interface DayPlan {
  dayOfWeek: number;
  name?: string;
  startTime?: string | null;
  blocks: DayBlock[];
}

export const DEFAULT_BLOCK_TITLES: string[] = [
  'Entrada en calor / Movilidad',
  'Fuerza A',
  'Fuerza B',
  'Accesorios',
];

export interface DraftSession {
  key: string;
  id: string | null;
  name: string;
  order: number;
  // 0 = domingo, 1 = lunes, ..., 6 = sábado (igual que el contrato).
  dayOfWeek: number;
  coachNotes: string;
  startTime?: string | null;
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

export interface PlanTemplateItem {
  id: string;
  name: string;
  objective: string | null;
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  targetMuscles?: string[];
}

export interface ApplyPlanTemplatePayload {
  startDate: string; // Formato AAAA-MM-DD
  categoryId?: string | null;
  athleteId?: string | null;
}
