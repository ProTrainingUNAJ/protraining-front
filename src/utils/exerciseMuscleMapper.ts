/**
 * ProTraining — Exercise Muscle Mapping Utility (KAN-320)
 * Translates muscle names from free-exercise-db and API endpoints
 * into the vector SVG anatomical region IDs of the body silhouette.
 */

export interface ExerciseMuscleHighlight {
  muscleColors: Record<string, string>;
  hasMuscles: boolean;
  recommendedView: 'front' | 'back' | 'both';
  primaryCount: number;
  secondaryCount: number;
}

/**
 * Standard mapping from free-exercise-db (17 muscle names) and common Spanish synonyms
 * to the official SVG anatomical IDs.
 */
export const MUSCLE_NAME_TO_SVG_IDS: Record<string, string[]> = {
  // 1. Chest
  chest: ['pecho_derecho', 'pecho_izquierdo', 'pecho'],
  pecho: ['pecho_derecho', 'pecho_izquierdo', 'pecho'],
  pectoral: ['pecho_derecho', 'pecho_izquierdo', 'pecho'],
  pectorales: ['pecho_derecho', 'pecho_izquierdo', 'pecho'],

  // 2. Biceps
  biceps: ['biceps_derecho', 'biceps_izquierdo', 'biceps'],
  bíceps: ['biceps_derecho', 'biceps_izquierdo', 'biceps'],
  brazos: ['biceps_derecho', 'biceps_izquierdo', 'triceps_derecho', 'triceps_izquierdo'],

  // 3. Quadriceps
  quadriceps: ['cuadriceps_derecho', 'cuadriceps_izquierdo', 'cuadriceps'],
  cuadriceps: ['cuadriceps_derecho', 'cuadriceps_izquierdo', 'cuadriceps'],
  cuádriceps: ['cuadriceps_derecho', 'cuadriceps_izquierdo', 'cuadriceps'],
  piernas: ['cuadriceps_derecho', 'cuadriceps_izquierdo', 'cuadriceps'],
  pierna: ['cuadriceps_derecho', 'cuadriceps_izquierdo', 'cuadriceps'],

  // 4. Lats / Latissimus dorsi
  lats: ['espalda_alta', 'espalda_media'],
  dorsales: ['espalda_alta', 'espalda_media'],
  dorsal: ['espalda_alta', 'espalda_media'],
  espalda: ['espalda_alta', 'espalda_media', 'espalda_baja'],

  // 5. Middle back
  'middle back': ['espalda_media'],
  'espalda media': ['espalda_media'],
  'espalda alta': ['espalda_alta'],

  // 6. Calves
  calves: ['gemelo_derecho', 'gemelo_izquierdo', 'gemelos'],
  gemelos: ['gemelo_derecho', 'gemelo_izquierdo', 'gemelos'],
  gemelo: ['gemelo_derecho', 'gemelo_izquierdo', 'gemelos'],
  pantorrillas: ['gemelo_derecho', 'gemelo_izquierdo', 'gemelos'],
  pantorrilla: ['gemelo_derecho', 'gemelo_izquierdo', 'gemelos'],

  // 7. Glutes
  glutes: ['gluteo_derecho', 'gluteo_izquierdo', 'gluteos'],
  gluteos: ['gluteo_derecho', 'gluteo_izquierdo', 'gluteos'],
  glúteos: ['gluteo_derecho', 'gluteo_izquierdo', 'gluteos'],
  gluteo: ['gluteo_derecho', 'gluteo_izquierdo', 'gluteos'],
  glúteo: ['gluteo_derecho', 'gluteo_izquierdo', 'gluteos'],

  // 8. Hamstrings
  hamstrings: ['isquiotibial_derecho', 'isquiotibial_izquierdo', 'isquiotibiales'],
  isquiotibiales: ['isquiotibial_derecho', 'isquiotibial_izquierdo', 'isquiotibiales'],
  isquiotibial: ['isquiotibial_derecho', 'isquiotibial_izquierdo', 'isquiotibiales'],
  isquios: ['isquiotibial_derecho', 'isquiotibial_izquierdo', 'isquiotibiales'],
  femorales: ['isquiotibial_derecho', 'isquiotibial_izquierdo', 'isquiotibiales'],
  femoral: ['isquiotibial_derecho', 'isquiotibial_izquierdo', 'isquiotibiales'],

  // 9. Abdominals / Core
  abdominals: ['abdominales'],
  abdominales: ['abdominales'],
  abdomen: ['abdominales'],
  core: ['abdominales', 'espalda_baja'],

  // 10. Shoulders
  shoulders: ['hombro_derecho', 'hombro_izquierdo', 'hombros'],
  hombros: ['hombro_derecho', 'hombro_izquierdo', 'hombros'],
  hombro: ['hombro_derecho', 'hombro_izquierdo', 'hombros'],
  deltoides: ['hombro_derecho', 'hombro_izquierdo', 'hombros'],

  // 11. Triceps
  triceps: ['triceps_derecho', 'triceps_izquierdo', 'triceps'],
  tríceps: ['triceps_derecho', 'triceps_izquierdo', 'triceps'],

  // 12. Forearms
  forearms: ['antebrazo_derecho', 'antebrazo_izquierdo', 'antebrazos'],
  antebrazos: ['antebrazo_derecho', 'antebrazo_izquierdo', 'antebrazos'],
  antebrazo: ['antebrazo_derecho', 'antebrazo_izquierdo', 'antebrazos'],

  // 13. Traps / Trapezius
  traps: ['cuello_trapecio_derecho', 'cuello_trapecio_izquierdo', 'trapecios'],
  trapecios: ['cuello_trapecio_derecho', 'cuello_trapecio_izquierdo', 'trapecios'],
  trapecio: ['cuello_trapecio_derecho', 'cuello_trapecio_izquierdo', 'trapecios'],

  // 14. Lower back
  'lower back': ['espalda_baja'],
  'espalda baja': ['espalda_baja'],
  lumbar: ['espalda_baja'],
  lumbares: ['espalda_baja'],
  'zona lumbar': ['espalda_baja'],

  // 15. Adductors
  adductors: ['cuadriceps_derecho', 'cuadriceps_izquierdo', 'cuadriceps'],
  aductores: ['cuadriceps_derecho', 'cuadriceps_izquierdo', 'cuadriceps'],
  aductor: ['cuadriceps_derecho', 'cuadriceps_izquierdo', 'cuadriceps'],

  // 16. Abductors
  abductors: ['gluteo_derecho', 'gluteo_izquierdo', 'gluteos'],
  abductores: ['gluteo_derecho', 'gluteo_izquierdo', 'gluteos'],
  abductor: ['gluteo_derecho', 'gluteo_izquierdo', 'gluteos'],

  // 17. Neck
  neck: ['cuello_trapecio_derecho', 'cuello_trapecio_izquierdo', 'trapecios'],
  cuello: ['cuello_trapecio_derecho', 'cuello_trapecio_izquierdo', 'trapecios'],
};

/**
 * Categorizes which anatomical plane (front, back, or both) contains each SVG region.
 */
const FRONT_ONLY_REGIONS = new Set([
  'pecho_derecho',
  'pecho_izquierdo',
  'pecho',
  'biceps_derecho',
  'biceps_izquierdo',
  'biceps',
  'abdominales',
  'cuadriceps_derecho',
  'cuadriceps_izquierdo',
  'cuadriceps',
]);

const BACK_ONLY_REGIONS = new Set([
  'espalda_alta',
  'espalda_media',
  'espalda_baja',
  'triceps_derecho',
  'triceps_izquierdo',
  'triceps',
  'gluteo_derecho',
  'gluteo_izquierdo',
  'gluteos',
  'isquiotibial_derecho',
  'isquiotibial_izquierdo',
  'isquiotibiales',
  'gemelo_derecho',
  'gemelo_izquierdo',
  'gemelos',
]);

/**
 * Normalizes an arbitrary muscle string (lowercased, trimmed, accents handled).
 */
export function normalizeMuscleString(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Canonical dictionary mapping normalized muscle names to official Spanish labels (KAN-557).
 */
export const MUSCLE_SPANISH_NAMES: Record<string, string> = {
  // 1. Chest
  chest: 'Pectorales',
  pecho: 'Pectorales',
  pectoral: 'Pectorales',
  pectorales: 'Pectorales',

  // 2. Biceps
  biceps: 'Bíceps',
  brazos: 'Bíceps',

  // 3. Quadriceps
  quadriceps: 'Cuádriceps',
  cuadriceps: 'Cuádriceps',
  piernas: 'Cuádriceps',
  pierna: 'Cuádriceps',

  // 4. Lats
  lats: 'Dorsales',
  dorsales: 'Dorsales',
  dorsal: 'Dorsales',
  espalda: 'Dorsales',

  // 5. Middle back
  'middle back': 'Espalda media',
  'espalda media': 'Espalda media',
  'espalda alta': 'Espalda media',

  // 6. Calves
  calves: 'Gemelos',
  gemelos: 'Gemelos',
  gemelo: 'Gemelos',
  pantorrillas: 'Gemelos',
  pantorrilla: 'Gemelos',

  // 7. Glutes
  glutes: 'Glúteos',
  gluteos: 'Glúteos',
  gluteo: 'Glúteos',

  // 8. Hamstrings
  hamstrings: 'Isquiotibiales',
  isquiotibiales: 'Isquiotibiales',
  isquiotibial: 'Isquiotibiales',
  isquios: 'Isquiotibiales',
  femorales: 'Isquiotibiales',
  femoral: 'Isquiotibiales',

  // 9. Abdominals
  abdominals: 'Abdominales',
  abdominales: 'Abdominales',
  abdomen: 'Abdominales',
  core: 'Abdominales',

  // 10. Shoulders
  shoulders: 'Hombros',
  hombros: 'Hombros',
  hombro: 'Hombros',
  deltoides: 'Hombros',

  // 11. Triceps
  triceps: 'Tríceps',

  // 12. Forearms
  forearms: 'Antebrazos',
  antebrazos: 'Antebrazos',
  antebrazo: 'Antebrazos',

  // 13. Traps
  traps: 'Trapecios',
  trapecios: 'Trapecios',
  trapecio: 'Trapecios',

  // 14. Lower back
  'lower back': 'Espalda baja',
  'espalda baja': 'Espalda baja',
  lumbar: 'Espalda baja',
  lumbares: 'Espalda baja',
  'zona lumbar': 'Espalda baja',

  // 15. Adductors
  adductors: 'Aductores',
  aductores: 'Aductores',
  aductor: 'Aductores',

  // 16. Abductors
  abductors: 'Abductores',
  abductores: 'Abductores',
  abductor: 'Abductores',

  // 17. Neck
  neck: 'Cuello',
  cuello: 'Cuello',
};

/**
 * Translates an arbitrary muscle name (e.g. from API or free-exercise-db)
 * to its standard Spanish anatomical name (KAN-557).
 * If unknown, gracefully returns the trimmed name with first letter capitalized.
 */
export function getMuscleSpanishName(rawMuscle?: string | null): string {
  if (!rawMuscle || typeof rawMuscle !== 'string') return '';
  const trimmed = rawMuscle.trim();
  if (!trimmed) return '';

  const key = normalizeMuscleString(trimmed);

  // 1. Direct match in dictionary
  if (MUSCLE_SPANISH_NAMES[key]) {
    return MUSCLE_SPANISH_NAMES[key];
  }

  // 2. Partial / substring match
  for (const [dictKey, label] of Object.entries(MUSCLE_SPANISH_NAMES)) {
    if (key.includes(dictKey) || dictKey.includes(key)) {
      return label;
    }
  }

  // 3. Fallback: Capitalize first letter of unknown or custom muscles
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/**
 * Resolves a list of muscle names to SVG anatomical IDs.
 */
export function resolveMuscleIds(muscles: string[]): string[] {
  const ids = new Set<string>();

  for (const raw of muscles) {
    if (!raw) continue;
    const key = normalizeMuscleString(raw);

    // Direct match or partial search
    if (MUSCLE_NAME_TO_SVG_IDS[key]) {
      MUSCLE_NAME_TO_SVG_IDS[key].forEach((id) => ids.add(id));
      continue;
    }

    // Try finding matching substring
    for (const [dictKey, targetIds] of Object.entries(MUSCLE_NAME_TO_SVG_IDS)) {
      if (key.includes(dictKey) || dictKey.includes(key)) {
        targetIds.forEach((id) => ids.add(id));
      }
    }
  }

  return Array.from(ids);
}

/**
 * Computes highlighting configuration for an exercise with two visual intensities:
 * - Primary muscles: strong intensity ('var(--muscle-exercise-primary)')
 * - Secondary muscles: moderate intensity ('var(--muscle-exercise-secondary)')
 */
export function getExerciseMuscleHighlight(
  primaryMuscles?: string[] | null,
  secondaryMuscles?: string[] | null,
): ExerciseMuscleHighlight {
  const primaryList = primaryMuscles && Array.isArray(primaryMuscles) ? primaryMuscles : [];
  const secondaryList = secondaryMuscles && Array.isArray(secondaryMuscles) ? secondaryMuscles : [];

  const primaryIds = resolveMuscleIds(primaryList);
  const secondaryIds = resolveMuscleIds(secondaryList);

  const muscleColors: Record<string, string> = {};

  // Secondary muscles first so primary takes visual precedence
  for (const id of secondaryIds) {
    muscleColors[id] = 'var(--muscle-exercise-secondary)';
  }

  for (const id of primaryIds) {
    muscleColors[id] = 'var(--muscle-exercise-primary)';
  }

  const allActiveIds = Object.keys(muscleColors);
  const hasMuscles = allActiveIds.length > 0;

  let hasFront = false;
  let hasBack = false;

  for (const id of allActiveIds) {
    if (FRONT_ONLY_REGIONS.has(id)) {
      hasFront = true;
    } else if (BACK_ONLY_REGIONS.has(id)) {
      hasBack = true;
    } else {
      // Bilateral or dual view (shoulders, traps, forearms, etc.)
      hasFront = true;
      hasBack = true;
    }
  }

  let recommendedView: 'front' | 'back' | 'both' = 'both';
  if (hasFront && !hasBack) {
    recommendedView = 'front';
  } else if (hasBack && !hasFront) {
    recommendedView = 'back';
  }

  return {
    muscleColors,
    hasMuscles,
    recommendedView,
    primaryCount: primaryIds.length,
    secondaryCount: secondaryIds.length,
  };
}
