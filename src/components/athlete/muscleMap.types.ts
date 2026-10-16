/**
 * ProTraining — Tipos del Mapa Anatómico Vectorial SVG Interactivo
 * Define los 12 grupos musculares oficiales, las 8 regiones articulares,
 * el sistema de colores y los contratos de componentes.
 */

export type BilateralMuscleId =
  | 'pecho_derecho'
  | 'pecho_izquierdo'
  | 'hombro_derecho'
  | 'hombro_izquierdo'
  | 'cuello_trapecio_derecho'
  | 'cuello_trapecio_izquierdo'
  | 'biceps_derecho'
  | 'biceps_izquierdo'
  | 'triceps_derecho'
  | 'triceps_izquierdo'
  | 'antebrazo_derecho'
  | 'antebrazo_izquierdo'
  | 'mano_derecha'
  | 'mano_izquierda'
  | 'cuadriceps_derecho'
  | 'cuadriceps_izquierdo'
  | 'gluteo_derecho'
  | 'gluteo_izquierdo'
  | 'isquiotibial_derecho'
  | 'isquiotibial_izquierdo'
  | 'gemelo_derecho'
  | 'gemelo_izquierdo'
  | 'pie_derecho'
  | 'pie_izquierdo';

export type CentralMuscleId =
  | 'abdominales'
  | 'espalda_alta'
  | 'espalda_media'
  | 'espalda_baja'
  | 'cuello_trapecios';

export type LegacyMuscleId =
  | 'pecho'
  | 'hombros'
  | 'biceps'
  | 'cuadriceps'
  | 'gemelos'
  | 'triceps'
  | 'gluteos'
  | 'isquiotibiales'
  | 'antebrazos'
  | 'manos'
  | 'pies'
  | 'trapecios';

export type OfficialMuscleId = BilateralMuscleId | CentralMuscleId | LegacyMuscleId;

export type JointId =
  | 'rodilla_izquierda'
  | 'rodilla_derecha'
  | 'codo_izquierdo'
  | 'codo_derecho'
  | 'muneca_izquierda'
  | 'muneca_derecha'
  | 'tobillo_izquierdo'
  | 'tobillo_derecho';

export type AnatomicalRegionId = OfficialMuscleId | JointId;

export type ViewMode = 'front' | 'back' | 'both';

/**
 * Paleta centralizada oficial de colores para el mapa muscular (Sección 8)
 */
export const MUSCLE_COLORS = {
  white: '#FFFFFF',
  darkGreen: '#006B45',
  lightGreen: '#55B83F',
  yellow: '#FFD600',
  orange: '#FF7900',
  red: '#E50914',
} as const;

export type MuscleColorKey = keyof typeof MUSCLE_COLORS;
export type MuscleColorValue = (typeof MUSCLE_COLORS)[MuscleColorKey];

export interface ColorPaletteItem {
  id: MuscleColorKey;
  name: string;
  hex: string;
  colorVar: string;
  level: number;
  description: string;
}

export interface OfficialMuscleGroup {
  id: OfficialMuscleId;
  name: string;
  view: ViewMode;
  category: 'Tren Superior' | 'Tren Inferior' | 'Zona Media';
  frontCenter?: { x: number; y: number } | null;
  backCenter?: { x: number; y: number } | null;
  frontPath?: string;
  backPath?: string;
}

export interface JointRegion {
  id: JointId;
  name: string;
  view: ViewMode;
  frontCenter?: { x: number; y: number } | null;
  backCenter?: { x: number; y: number } | null;
  frontPath?: string;
  backPath?: string;
}

export interface InteractiveMuscleMapProps {
  /** Registro de dolor por grupo muscular o articulación (1 a 5) */
  musclePains?: Record<string, number>;
  /** Colores personalizados directos asignados a cada región */
  muscleColors?: Record<string, string>;
  /** Regiones seleccionadas actualmente */
  selectedMuscles?: string[];
  /** Callback al cambiar la selección activa */
  onSelectionChange?: (selectedIds: string[]) => void;
  /** Callback al asignar nivel de dolor individual */
  onPainChange?: (regionId: string, level: number) => void;
  /** Callback para asignar color o nivel a múltiples regiones */
  onBatchPainChange?: (regionIds: string[], level: number) => void;
  /** Callback al cambiar color directo */
  onColorChange?: (regionId: string, color: string) => void;
  /** Limpiar todos los dolores y colores */
  onClearAll?: () => void;
  /** Limpiar solo la selección */
  onClearSelection?: () => void;
  /** Vista predeterminada */
  initialView?: ViewMode;
  /** Modo solo lectura */
  readOnly?: boolean;
  /** Clase CSS adicional */
  className?: string;
}
