import {
  getExerciseMuscleHighlight,
  getMuscleSpanishName,
  type ExerciseMuscleHighlight,
} from './exerciseMuscleMapper';
import type { TodayRoutineExercise } from '../api/generated/entrenamiento';

export interface InferredExerciseMuscles {
  primary: string[];
  secondary: string[];
}

/**
 * Infiere músculos primarios y secundarios a partir de metadatos del ejercicio
 * o por su nombre y grupo muscular cuando no fueron cargados explícitamente.
 */
export function inferExerciseMuscles(exercise: {
  name?: string;
  muscleGroup?: string;
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
}): InferredExerciseMuscles {
  const hasExplicitPrimary = exercise.primaryMuscles && exercise.primaryMuscles.length > 0;
  const hasExplicitSecondary = exercise.secondaryMuscles && exercise.secondaryMuscles.length > 0;

  if (hasExplicitPrimary || hasExplicitSecondary) {
    return {
      primary: exercise.primaryMuscles ?? [],
      secondary: exercise.secondaryMuscles ?? [],
    };
  }

  const text = `${exercise.name || ''} ${exercise.muscleGroup || ''}`.toLowerCase();
  const inferredPrimary: string[] = [];
  const inferredSecondary: string[] = [];

  if (/sentadilla|squat|estocada|prensa|cu[aá]driceps/i.test(text)) {
    inferredPrimary.push('quadriceps');
    inferredSecondary.push('glutes', 'hamstrings');
  } else if (/press.*banca|bench|pecho|pectoral|apertura|flexi[oó]n/i.test(text)) {
    inferredPrimary.push('chest');
    inferredSecondary.push('triceps', 'shoulders');
  } else if (/peso muerto|deadlift|isquio|femoral/i.test(text)) {
    inferredPrimary.push('hamstrings');
    inferredSecondary.push('glutes', 'lower back');
  } else if (/remo|row|dominada|pull[- ]?up|dorsal|lat|jal[oó]n|espalda/i.test(text)) {
    inferredPrimary.push('lats');
    inferredSecondary.push('biceps', 'middle back');
  } else if (/press.*militar|overhead|hombro|deltoide/i.test(text)) {
    inferredPrimary.push('shoulders');
    inferredSecondary.push('triceps', 'traps');
  } else if (/b[ií]ceps|curl/i.test(text)) {
    inferredPrimary.push('biceps');
    inferredSecondary.push('forearms');
  } else if (/tr[ií]ceps|fondos|pushdown/i.test(text)) {
    inferredPrimary.push('triceps');
    inferredSecondary.push('shoulders');
  } else if (/gl[uú]teo|hip thrust/i.test(text)) {
    inferredPrimary.push('glutes');
    inferredSecondary.push('hamstrings');
  } else if (/gemelo|calves|pantorrilla/i.test(text)) {
    inferredPrimary.push('calves');
  } else if (/plank|abdominal|core|crunch/i.test(text)) {
    inferredPrimary.push('abdominals');
  }

  return {
    primary: inferredPrimary,
    secondary: inferredSecondary,
  };
}

export interface SessionMusclesSummary {
  primaryMuscles: string[];
  secondaryMuscles: string[];
  highlight: ExerciseMuscleHighlight;
  muscleNames: string[];
}

/**
 * Extrae y unifica todos los músculos trabajados en la sesión del día,
 * generando los colores para las siluetas anatómicas (frente y dorso)
 * y una lista legible de nombres de músculos en español.
 */
export function extractSessionMuscles(
  exercises: TodayRoutineExercise[] = [],
): SessionMusclesSummary {
  const primarySet = new Set<string>();
  const secondarySet = new Set<string>();

  for (const ex of exercises) {
    const { primary, secondary } = inferExerciseMuscles(ex);
    for (const m of primary) {
      if (m && typeof m === 'string') {
        primarySet.add(m.trim().toLowerCase());
      }
    }
    for (const m of secondary) {
      if (m && typeof m === 'string') {
        secondarySet.add(m.trim().toLowerCase());
      }
    }
  }

  // Eliminar de secundarios los que ya son primarios en algún ejercicio
  for (const p of primarySet) {
    secondarySet.delete(p);
  }

  const primaryMuscles = Array.from(primarySet);
  const secondaryMuscles = Array.from(secondarySet);

  const highlight = getExerciseMuscleHighlight(primaryMuscles, secondaryMuscles, {
    primary: '#0284c7', // Azul de foco según diseño
    secondary: '#94a3b8', // Gris azulado estabilizador
  });

  // Lista legible en español para la UI
  const spanishSet = new Set<string>();
  for (const m of primaryMuscles) {
    const name = getMuscleSpanishName(m);
    if (name) spanishSet.add(name);
  }
  for (const m of secondaryMuscles) {
    const name = getMuscleSpanishName(m);
    if (name) spanishSet.add(name);
  }

  return {
    primaryMuscles,
    secondaryMuscles,
    highlight,
    muscleNames: Array.from(spanishSet),
  };
}
