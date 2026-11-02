// Resumen de confiabilidad de los récords de una categoría (KAN-416).
// Tipado directamente desde el contrato oficial de Entrenamiento.
import type {
  RecordReliabilityAthlete as ApiRecordReliabilityAthlete,
  RecordReliabilityGroup as ApiRecordReliabilityGroup,
  RecordReliabilitySummary as ApiRecordReliabilitySummary,
} from '../api/generated/entrenamiento';

export type RecordReliabilityGroupKey = 'Tested' | 'Reported' | 'Estimated' | 'NoData';

export type RecordReliabilityAthlete = ApiRecordReliabilityAthlete;
export type RecordReliabilityGroup = ApiRecordReliabilityGroup;
export type RecordsReliabilitySummary = ApiRecordReliabilitySummary;

// Orden fijo de los grupos, del más confiable al menos confiable.
export const RELIABILITY_GROUP_ORDER: RecordReliabilityGroupKey[] = [
  'Tested',
  'Reported',
  'Estimated',
  'NoData',
];

// Etiquetas en español para la UI.
export const RELIABILITY_GROUP_LABELS: Record<RecordReliabilityGroupKey, string> = {
  Tested: 'Testeado',
  Reported: 'Reportado',
  Estimated: 'Estimado',
  NoData: 'Sin dato',
};

// Descripción corta de cada grupo para la UI.
export const RELIABILITY_GROUP_DESCRIPTIONS: Record<RecordReliabilityGroupKey, string> = {
  Tested: 'Medido en una sesión de test (incluye Epley).',
  Reported: 'Lo dijo el atleta o lo cargó el PF.',
  Estimated: 'Declarado en el onboarding.',
  NoData: 'No hay de dónde calcular el peso.',
};
