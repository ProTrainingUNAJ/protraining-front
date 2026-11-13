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
  NoData: 'Sin datos',
};

// Colores de marca para los segmentos del gráfico apilado (KAN-417).
export const RELIABILITY_GROUP_COLORS: Record<RecordReliabilityGroupKey, string> = {
  Tested: 'var(--stat-green)',
  Reported: 'var(--secondary)',
  Estimated: 'var(--stat-amber)',
  NoData: 'var(--text-muted)',
};
