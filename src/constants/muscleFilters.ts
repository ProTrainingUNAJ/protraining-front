export const CHIP_CATEGORIES = [
  'Todos',
  'Piernas',
  'Pecho',
  'Espalda',
  'Hombros',
  'Brazos',
  'Core',
] as const;

export type ChipCategory = (typeof CHIP_CATEGORIES)[number];

export const GROUP_SUB_MUSCLES: Record<string, string[]> = {
  Piernas: ['Cuádriceps', 'Isquiotibiales', 'Glúteos', 'Gemelos', 'Aductores'],
  Pecho: ['Pecho'],
  Espalda: ['Dorsales', 'Espalda media', 'Espalda baja', 'Trapecios'],
  Hombros: ['Hombros', 'Cuello'],
  Brazos: ['Bíceps', 'Tríceps', 'Antebrazos'],
  Core: ['Abdominales'],
};
