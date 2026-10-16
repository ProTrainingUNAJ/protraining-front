import { OFFICIAL_MUSCLE_GROUPS, OFFICIAL_JOINTS } from './muscleMap.config';
import { OfficialMuscleGroup, JointRegion } from './muscleMap.types';

export interface MuscleGroupItem {
  id: string;
  name: string;
  view: 'front' | 'back' | 'both';
  category: 'Tren Superior' | 'Tren Inferior' | 'Zona Media' | 'Articulaciones';
  frontCenter?: { x: number; y: number } | null;
  backCenter?: { x: number; y: number } | null;
  polygons?: string[];
}

export interface PainLevelOption {
  level: number;
  name: string;
  color: string;
  desc: string;
}

/**
 * Escala de dolor oficial de ProTraining mapeada a tokens.css
 */
export const PAIN_LEVELS: PainLevelOption[] = [
  {
    level: 1,
    name: 'Leve',
    color: 'var(--muscle-color-dark-green)',
    desc: 'Sensación leve / ligera tirantez',
  },
  {
    level: 2,
    name: 'Molestia',
    color: 'var(--muscle-color-light-green)',
    desc: 'Molestia perceptible al movimiento',
  },
  {
    level: 3,
    name: 'Moderado',
    color: 'var(--muscle-color-yellow)',
    desc: 'Dolor limitante pero tolerable',
  },
  {
    level: 4,
    name: 'Fuerte',
    color: 'var(--muscle-color-orange)',
    desc: 'Dolor agudo que restringe la carga',
  },
  {
    level: 5,
    name: 'Agudo',
    color: 'var(--muscle-color-red)',
    desc: 'Dolor severo / impedimento total',
  },
];

export const getPainColor = (level?: number): string => {
  const item = PAIN_LEVELS.find((p) => p.level === level);
  return item ? item.color : 'var(--brand-navy)';
};

// Combined muscles: includes both legacy generic groups and detailed anatomical regions
const LEGACY_GROUPS: MuscleGroupItem[] = [
  { id: 'pecho', name: 'Pecho', view: 'front', category: 'Tren Superior' },
  { id: 'hombros', name: 'Hombros', view: 'both', category: 'Tren Superior' },
  { id: 'biceps', name: 'Bíceps', view: 'front', category: 'Tren Superior' },
  { id: 'abdominales', name: 'Abdominales', view: 'front', category: 'Zona Media' },
  { id: 'cuadriceps', name: 'Cuádriceps', view: 'front', category: 'Tren Inferior' },
  { id: 'espalda_alta', name: 'Espalda alta', view: 'back', category: 'Tren Superior' },
  { id: 'espalda_media', name: 'Espalda media', view: 'back', category: 'Tren Superior' },
  { id: 'espalda_baja', name: 'Espalda baja', view: 'back', category: 'Zona Media' },
  { id: 'triceps', name: 'Tríceps', view: 'back', category: 'Tren Superior' },
  { id: 'gluteos', name: 'Glúteos', view: 'back', category: 'Tren Inferior' },
  { id: 'isquiotibiales', name: 'Isquiotibiales', view: 'back', category: 'Tren Inferior' },
  { id: 'gemelos', name: 'Gemelos', view: 'both', category: 'Tren Inferior' },
  { id: 'trapecios', name: 'Trapecios', view: 'back', category: 'Tren Superior' },
  { id: 'dorsales', name: 'Dorsales', view: 'back', category: 'Tren Superior' },
  { id: 'oblicuos', name: 'Oblicuos', view: 'front', category: 'Zona Media' },
  { id: 'antebrazos', name: 'Antebrazos', view: 'both', category: 'Tren Superior' },
];

// Integrate independent SVG regions into the muscle catalog
const ANATOMICAL_ITEMS: MuscleGroupItem[] = OFFICIAL_MUSCLE_GROUPS.map(
  (r: OfficialMuscleGroup) => ({
    id: r.id,
    name: r.name,
    view: r.view,
    category: r.category,
    frontCenter: r.frontCenter,
    backCenter: r.backCenter,
  }),
);

// Integrate independent joint regions into the catalog
const JOINT_ITEMS: MuscleGroupItem[] = OFFICIAL_JOINTS.map((j: JointRegion) => ({
  id: j.id,
  name: j.name,
  view: j.view,
  category: 'Articulaciones',
  frontCenter: j.frontCenter,
  backCenter: j.backCenter,
}));

export const PROTRAINING_MUSCLES: MuscleGroupItem[] = [
  ...ANATOMICAL_ITEMS,
  ...JOINT_ITEMS,
  ...LEGACY_GROUPS,
];

