import type { TodayRoutineResponse } from '../../api/generated/entrenamiento';
import { METRIC_PRESENTATION, type MetricDefinition } from '../../utils/evolutionMetrics';

// Lógica de las tarjetas del Inicio del atleta (KAN-594), aparte para testearla sola.

export const routineStartTime = (routine: TodayRoutineResponse): string | null =>
  routine.startTime ? routine.startTime.slice(0, 5) : null;

/**
 * Primer día con rutina a partir de hoy. Hoy solo cuenta si la sesión todavía no empezó (o no
 * tiene hora): una vez pasada, el atleta ya ve la del próximo día.
 */
export function pickNextRoutine(
  routines: TodayRoutineResponse[],
  today: string,
  nowTime: string,
): TodayRoutineResponse | null {
  const sorted = [...routines].sort((a, b) => a.date.localeCompare(b.date));
  for (const routine of sorted) {
    const date = routine.date.slice(0, 10);
    if (date < today || routine.exercises.length === 0) continue;
    const start = routineStartTime(routine);
    if (date === today && start !== null && start < nowTime) continue;
    return routine;
  }
  return null;
}

export interface MetricChange {
  /** "+8,3 %" o "−2,7 %" */
  text: string;
  /** Mejoró, empeoró o quedó igual, según si en esa métrica más es mejor o peor */
  trend: 'better' | 'worse' | 'same';
}

/**
 * Variación de la última medición contra la ANTERIOR (no contra la primera): es lo que el atleta
 * quiere saber al entrar ("¿mejoré desde la última vez?"). En sprint menos tiempo es mejor.
 */
export function changeFromPrevious(metric: MetricDefinition): MetricChange | null {
  const points = metric.data;
  if (points.length < 2) return null;
  const previous = points[points.length - 2].value;
  const current = points[points.length - 1].value;
  if (previous === 0) return null;
  const diff = current - previous;
  const percent = Math.abs((diff / previous) * 100);
  const sign = diff > 0 ? '+' : diff < 0 ? '−' : '';
  const text = `${sign}${percent.toLocaleString('es-AR', { maximumFractionDigits: 1 })} %`;
  if (diff === 0) return { text, trend: 'same' };
  const lowerIsBetter = METRIC_PRESENTATION[metric.key].lowerIsBetter;
  const improved = lowerIsBetter ? diff < 0 : diff > 0;
  return { text, trend: improved ? 'better' : 'worse' };
}
