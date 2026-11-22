import type {
  ApplyAthleteSessionAdjustmentResponse,
  TrainingPlanDetail,
} from '../api/generated/entrenamiento';

export type AthleteAdaptationDecision = 'approved' | 'rejected';

/**
 * Obtiene la sesión por defecto de una planificación para revisar o consultar
 * adaptaciones individuales: la primera con ejercicios o, en su defecto, la primera disponible.
 */
export function getDefaultPlanSessionId(plan: TrainingPlanDetail): string | null {
  const firstWithExercises =
    plan.weeks?.flatMap((w) => w.sessions ?? []).find((s) => (s.exercises?.length ?? 0) > 0) ??
    plan.weeks?.[0]?.sessions?.[0] ??
    null;

  return firstWithExercises?.id ?? null;
}

/**
 * Determina si la respuesta de ajuste de sesión corresponde a una adaptación
 * efectivamente aprobada (con sustituciones de ejercicios o reducción de carga).
 */
export function hasApprovedSessionAdjustment(
  adjustment?: ApplyAthleteSessionAdjustmentResponse | null,
): boolean {
  if (!adjustment) return false;
  if (adjustment.status?.toLowerCase() === 'rejected') return false;
  return (adjustment.items?.length ?? 0) > 0 || (adjustment.loadReductionPercentage ?? 0) > 0;
}

/**
 * Resuelve la decisión persistida del PF para la sesión y atleta:
 * 'approved', 'rejected' o null si aún no fue evaluada.
 */
export function resolveSessionAdjustmentDecision(
  adjustment?: ApplyAthleteSessionAdjustmentResponse | null,
): AthleteAdaptationDecision | null {
  if (!adjustment) return null;
  if (adjustment.status?.toLowerCase() === 'rejected') return 'rejected';
  if (hasApprovedSessionAdjustment(adjustment)) return 'approved';
  return null;
}
