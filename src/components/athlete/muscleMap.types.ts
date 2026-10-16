/**
 * ProTraining — Interactive SVG Vector Anatomical Map Types
 * Defines the 12 official muscle groups, 8 joint regions,
 * color system, and component contracts.
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
  'abdominales' | 'espalda_alta' | 'espalda_media' | 'espalda_baja' | 'cuello_trapecios';

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
 * Centralized official color palette for the muscle map (Section 8)
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
  /** Pain registry per muscle group or joint (1 to 5) */
  musclePains?: Record<string, number>;
  /** Direct custom colors assigned to each region */
  muscleColors?: Record<string, string>;
  /** Currently selected regions */
  selectedMuscles?: string[];
  /** Callback triggered when active selection changes */
  onSelectionChange?: (selectedIds: string[]) => void;
  /** Callback to assign pain level to an individual region */
  onPainChange?: (regionId: string, level: number) => void;
  /** Callback to batch assign pain level or color to multiple regions */
  onBatchPainChange?: (regionIds: string[], level: number) => void;
  /** Callback triggered when direct color changes */
  onColorChange?: (regionId: string, color: string) => void;
  /** Clear all pains and custom colors */
  onClearAll?: () => void;
  /** Clear active selection only */
  onClearSelection?: () => void;
  /** Default view mode */
  initialView?: ViewMode;
  /** Read-only mode flag */
  readOnly?: boolean;
  /** Additional CSS class name */
  className?: string;
}
