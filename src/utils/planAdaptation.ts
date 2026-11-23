import type {
  ApplyAthleteSessionAdjustmentResponse,
  TrainingPlanDetail,
} from '../api/generated/entrenamiento';

export type AthleteAdaptationDecision = 'approved' | 'rejected';

export interface AthletePlanDecisionSummary {
  decision: AthleteAdaptationDecision;
  sessionId: string;
}

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
 * Devuelve todos los IDs de sesión únicos de una planificación, priorizando
 * la sesión por defecto y conservando luego el orden de semanas y sesiones.
 */
export function getPlanSessionIds(plan: TrainingPlanDetail): string[] {
  const defaultSessionId = getDefaultPlanSessionId(plan);
  const orderedIds: string[] = [];
  const seen = new Set<string>();

  if (defaultSessionId) {
    orderedIds.push(defaultSessionId);
    seen.add(defaultSessionId);
  }

  for (const week of plan.weeks ?? []) {
    for (const session of week.sessions ?? []) {
      if (session.id && !seen.has(session.id)) {
        orderedIds.push(session.id);
        seen.add(session.id);
      }
    }
  }

  return orderedIds;
}

/**
 * Resume la decisión visible del atleta a nivel de planificación considerando todas las sesiones:
 * prioriza cualquier sesión aprobada sobre una rechazada, siguiendo el orden del plan.
 */
export function summarizeAthletePlanDecisions(
  decisionsBySession?: Record<string, AthleteAdaptationDecision>,
  orderedSessionIds?: string[],
): AthletePlanDecisionSummary | null {
  if (!decisionsBySession) return null;

  const sessionOrder =
    orderedSessionIds && orderedSessionIds.length > 0
      ? [
          ...orderedSessionIds,
          ...Object.keys(decisionsBySession).filter((id) => !orderedSessionIds.includes(id)),
        ]
      : Object.keys(decisionsBySession);

  for (const sessionId of sessionOrder) {
    if (decisionsBySession[sessionId] === 'approved') {
      return { decision: 'approved', sessionId };
    }
  }

  for (const sessionId of sessionOrder) {
    if (decisionsBySession[sessionId] === 'rejected') {
      return { decision: 'rejected', sessionId };
    }
  }

  return null;
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
