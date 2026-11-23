import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Users,
  UserPlus,
  Trash2,
  Calendar,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  XCircle,
  Sparkles,
  Pencil,
} from 'lucide-react';
import { ProfileAvatar } from '../common/ProfileAvatar';
import { PlanAssigneeItem } from './PlanAssigneesStack';
import { AthleteAdaptationDiffModal } from './AthleteAdaptationDiffModal';
import { structureService } from '../../api/structureService';
import { getActiveInjuriesSummary } from '../../api/seguimientoService';
import { trainingPlansService } from '../../api/trainingPlans';
import { athleteAdaptationsService } from '../../api/athleteAdaptations';
import type { Athlete } from '../../types/structure';
import { formatDayMonth } from '../../utils/argentinaDate';
import {
  getPlanSessionIds,
  resolveSessionAdjustmentDecision,
  summarizeAthletePlanDecisions,
  type AthleteAdaptationDecision,
} from '../../utils/planAdaptation';

type AthleteInjuryCheckStatus = 'loading' | 'injured' | 'normal' | 'error';

interface AthleteInjuryCheckState {
  status: AthleteInjuryCheckStatus;
  activeCount: number;
}

export interface ManagePlanAssignmentsModalProps {
  isOpen: boolean;
  planId: string;
  planName: string;
  assignees: PlanAssigneeItem[];
  onClose: () => void;
  onUnassign: (assignmentId: string, assigneeName: string) => Promise<void>;
  onOpenAddAssignment: () => void;
}

const ManagePlanAssignmentsModalContent: React.FC<
  Omit<ManagePlanAssignmentsModalProps, 'isOpen'>
> = ({ planId, planName, assignees, onClose, onUnassign, onOpenAddAssignment }) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    text: string;
    variant: 'success' | 'danger';
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [categoryAthletes, setCategoryAthletes] = useState<Record<string, Athlete[]>>({});
  const [athleteInjuryStates, setAthleteInjuryStates] = useState<
    Record<string, AthleteInjuryCheckState>
  >({});
  const [planSessionIds, setPlanSessionIds] = useState<string[]>([]);
  const [adaptationDecisionsBySession, setAdaptationDecisionsBySession] = useState<
    Record<string, Record<string, AthleteAdaptationDecision>>
  >({});
  const [adaptationTarget, setAdaptationTarget] = useState<{
    athleteId: string;
    athleteName: string;
    initialSessionId?: string | null;
  } | null>(null);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showFeedbackMessage = (
    text: string,
    variant: 'success' | 'danger' = 'success',
    durationMs = 3500,
  ) => {
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }
    setFeedbackMessage({ text, variant });
    feedbackTimeoutRef.current = setTimeout(() => {
      setFeedbackMessage(null);
      feedbackTimeoutRef.current = null;
    }, durationMs);
  };

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, []);

  // Cerrar con Escape (si no está abierto el modal de comparativa de adaptación)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !deletingId && !adaptationTarget) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deletingId, adaptationTarget, onClose]);

  // Cargar atletas de las categorías asignadas y consultar sus lesiones activas en Seguimiento (KAN-464)
  useEffect(() => {
    const categoryItems = assignees.filter((a) => a.type === 'category' && Boolean(a.targetId));
    const directAthleteIds = assignees
      .filter((a) => a.type === 'athlete' && Boolean(a.targetId))
      .map((a) => a.targetId);

    if (categoryItems.length === 0 && directAthleteIds.length === 0) return;

    let active = true;

    async function loadAthletesAndInjuries() {
      const nextMap: Record<string, Athlete[]> = {};

      await Promise.all(
        categoryItems.map(async (catAssignee) => {
          const catId = catAssignee.targetId;
          try {
            let list: Athlete[] = [];
            if (typeof structureService.getCategoryAthletes === 'function') {
              list = await structureService.getCategoryAthletes(catId).catch(() => []);
            }
            if (list.length === 0 && typeof structureService.getAthletes === 'function') {
              const all = await structureService
                .getAthletes({ categoriaId: catId })
                .catch(() => []);
              list = all.filter(
                (ath) =>
                  ath.categories?.some((c) => c.id === catId || c.name === catAssignee.name) ||
                  ath.categoryNames?.includes(catAssignee.name),
              );
            }
            nextMap[catId] = list;
          } catch {
            nextMap[catId] = [];
          }
        }),
      );

      if (!active) return;
      setCategoryAthletes(nextMap);

      const allAthleteIds = Array.from(
        new Set([
          ...directAthleteIds,
          ...Object.values(nextMap).flatMap((list) => list.map((ath) => ath.id)),
        ]),
      ).filter(Boolean);

      if (allAthleteIds.length === 0) return;

      const loadingStates: Record<string, AthleteInjuryCheckState> = {};
      for (const id of allAthleteIds) {
        loadingStates[id] = { status: 'loading', activeCount: 0 };
      }
      setAthleteInjuryStates(loadingStates);

      try {
        const summaries = await getActiveInjuriesSummary(allAthleteIds);
        if (!active) return;

        const countsByAthlete = new Map<string, number>(
          summaries.map((item) => [item.athleteId, item.activeCount]),
        );

        const nextStates: Record<string, AthleteInjuryCheckState> = {};
        const injuredAthleteIds: string[] = [];
        for (const athleteId of allAthleteIds) {
          const activeCount = countsByAthlete.get(athleteId) ?? 0;
          const isInjured = activeCount > 0;
          if (isInjured) {
            injuredAthleteIds.push(athleteId);
          }
          nextStates[athleteId] = {
            status: isInjured ? 'injured' : 'normal',
            activeCount,
          };
        }

        // Consultar en paralelo si los atletas lesionados ya tienen adaptación aprobada o rechazada
        // en cualquiera de las sesiones del plan (KAN-636)
        const nextDecisionsBySession: Record<
          string,
          Record<string, AthleteAdaptationDecision>
        > = {};
        let nextPlanSessionIds: string[] = [];
        let nextErrorMessage: string | null = null;
        if (injuredAthleteIds.length > 0 && planId) {
          try {
            const plan = await trainingPlansService.get(planId);
            if (!active) return;

            nextPlanSessionIds = getPlanSessionIds(plan);
            if (nextPlanSessionIds.length > 0) {
              const adjustmentQueries = injuredAthleteIds.flatMap((athleteId) =>
                nextPlanSessionIds.map((sessionId) => ({ athleteId, sessionId })),
              );

              const adjustmentChecks = await Promise.allSettled(
                adjustmentQueries.map(async ({ athleteId, sessionId }) => {
                  const adjustment = await athleteAdaptationsService.getSessionAdjustment(
                    sessionId,
                    athleteId,
                  );
                  return {
                    athleteId,
                    sessionId,
                    decision: resolveSessionAdjustmentDecision(adjustment),
                  };
                }),
              );
              if (!active) return;

              let hasAdjustmentCheckError = false;
              for (const check of adjustmentChecks) {
                if (check.status === 'fulfilled') {
                  if (check.value.decision) {
                    if (!nextDecisionsBySession[check.value.athleteId]) {
                      nextDecisionsBySession[check.value.athleteId] = {};
                    }
                    nextDecisionsBySession[check.value.athleteId][check.value.sessionId] =
                      check.value.decision;
                  }
                } else {
                  hasAdjustmentCheckError = true;
                  console.error(
                    'No se pudo verificar si el atleta ya tiene una adaptación aprobada:',
                    check.reason,
                  );
                }
              }

              if (hasAdjustmentCheckError) {
                nextErrorMessage =
                  'No se pudo verificar el estado de adaptación aprobada de algunos atletas.';
              }
            }
          } catch (err: unknown) {
            if (!active) return;
            console.error(
              'No se pudo obtener la planificación para verificar adaptaciones aprobadas:',
              err,
            );
            nextErrorMessage =
              err instanceof Error
                ? err.message
                : 'No se pudo verificar si ya existen adaptaciones aprobadas para esta planificación.';
          }
        }

        setErrorMessage(nextErrorMessage);
        setPlanSessionIds(nextPlanSessionIds);
        setAdaptationDecisionsBySession(nextDecisionsBySession);
        setAthleteInjuryStates(nextStates);
      } catch {
        if (!active) return;
        const errorStates: Record<string, AthleteInjuryCheckState> = {};
        for (const athleteId of allAthleteIds) {
          errorStates[athleteId] = { status: 'error', activeCount: 0 };
        }
        setPlanSessionIds([]);
        setAdaptationDecisionsBySession({});
        setAthleteInjuryStates(errorStates);
      }
    }

    loadAthletesAndInjuries();

    return () => {
      active = false;
    };
  }, [planId, assignees]);

  const getAthleteDecisionSummary = (athleteId: string) =>
    summarizeAthletePlanDecisions(adaptationDecisionsBySession[athleteId], planSessionIds);

  const renderAdaptationStatusControl = (
    athleteId: string,
    athleteName: string,
    disabled = false,
  ) => {
    const injuryState = athleteInjuryStates[athleteId];

    if (!injuryState || injuryState.status === 'loading') {
      return (
        <span className="manage-assignments-checking-status">
          <Loader2 size={13} className="plan-spin" aria-hidden="true" />
          <span>Verificando estado…</span>
        </span>
      );
    }

    if (injuryState.status === 'injured') {
      const decisionSummary = getAthleteDecisionSummary(athleteId);
      if (decisionSummary) {
        const isApproved = decisionSummary.decision === 'approved';
        return (
          <div className="manage-assignments-decision-group">
            <span
              className={
                isApproved
                  ? 'manage-assignments-approved-status'
                  : 'manage-assignments-rejected-status'
              }
            >
              {isApproved ? (
                <CheckCircle2 size={14} aria-hidden="true" />
              ) : (
                <XCircle size={14} aria-hidden="true" />
              )}
              <span>{isApproved ? 'Adaptación aprobada' : 'Adaptación rechazada'}</span>
            </span>
            <button
              type="button"
              className="manage-assignments-edit-adaptation-btn"
              onClick={() =>
                setAdaptationTarget({
                  athleteId,
                  athleteName,
                  initialSessionId: decisionSummary.sessionId,
                })
              }
              disabled={disabled}
              title={`Revisar nuevamente la adaptación de ${athleteName}`}
              aria-label={`Revisar nuevamente la adaptación de ${athleteName}`}
            >
              <Pencil size={14} aria-hidden="true" />
            </button>
          </div>
        );
      }

      return (
        <button
          type="button"
          className="btn btn-secondary btn-sm manage-assignments-adapt-btn manage-assignments-action-btn"
          onClick={() =>
            setAdaptationTarget({
              athleteId,
              athleteName,
            })
          }
          disabled={disabled}
          title={`Comparar rutina base vs. adaptada de ${athleteName}`}
          aria-label={`Revisar adaptación de ${athleteName}`}
        >
          <Sparkles size={14} aria-hidden="true" />
          <span>Revisar adaptación</span>
        </button>
      );
    }

    if (injuryState.status === 'error') {
      return (
        <button
          type="button"
          className="btn btn-secondary btn-sm manage-assignments-adapt-btn manage-assignments-action-btn"
          onClick={() =>
            setAdaptationTarget({
              athleteId,
              athleteName,
            })
          }
          disabled={disabled}
          title="No se pudo verificar si tiene lesiones activas en Seguimiento"
          aria-label={`Revisar adaptación de ${athleteName}`}
        >
          <Sparkles size={14} aria-hidden="true" />
          <span>Revisar adaptación</span>
        </button>
      );
    }

    return (
      <span className="manage-assignments-normal-status manage-assignments-action-btn">
        <CheckCircle2 size={14} aria-hidden="true" />
        <span>En condiciones normales</span>
      </span>
    );
  };

  const getStatusPriority = (athleteId: string): number => {
    const status = athleteInjuryStates[athleteId]?.status;
    if (status === 'injured') {
      return getAthleteDecisionSummary(athleteId) ? 2 : 0;
    }
    if (status === 'error') return 1;
    if (status === 'loading') return 3;
    return 4;
  };

  const handleDelete = async (assignmentId: string, assigneeName: string) => {
    setDeletingId(assignmentId);
    setErrorMessage(null);
    try {
      await onUnassign(assignmentId, assigneeName);
      setConfirmDeleteId(null);
      showFeedbackMessage(`Se quitó a ${assigneeName} de la planificación.`, 'success', 3000);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'No se pudo quitar la asignación. Reintentá.',
      );
    } finally {
      setDeletingId(null);
    }
  };

  const modalContent = (
    <div
      className="manage-assignments-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="manage-assignments-modal-title"
      onClick={deletingId ? undefined : onClose}
    >
      <div className="manage-assignments-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Botón de cierre */}
        <button
          type="button"
          onClick={onClose}
          disabled={Boolean(deletingId)}
          className="manage-assignments-close-btn"
          aria-label="Cerrar modal de asignaciones"
        >
          <X size={20} />
        </button>

        {/* Cabecera */}
        <header className="manage-assignments-header">
          <div className="manage-assignments-icon-box">
            <Users size={22} className="manage-assignments-icon" />
          </div>
          <div>
            <h3 id="manage-assignments-modal-title" className="manage-assignments-title">
              Asignaciones de la planificación
            </h3>
            <p className="manage-assignments-subtitle">
              «<strong>{planName}</strong>» · {assignees.length}{' '}
              {assignees.length === 1 ? 'destinatario asignado' : 'destinatarios asignados'}
            </p>
          </div>
        </header>

        {/* Mensaje de éxito o error */}
        {feedbackMessage && (
          <div className={`alert-banner ${feedbackMessage.variant}`} role="status">
            <span className="plan-inline">
              {feedbackMessage.variant === 'danger' ? (
                <XCircle size={16} aria-hidden="true" />
              ) : (
                <CheckCircle2 size={16} aria-hidden="true" />
              )}
              {feedbackMessage.text}
            </span>
          </div>
        )}

        {errorMessage && (
          <div className="alert-banner danger" role="alert">
            <span className="plan-inline">
              <AlertTriangle size={16} aria-hidden="true" />
              {errorMessage}
            </span>
          </div>
        )}

        {/* Barra de acción para agregar */}
        <div className="manage-assignments-action-bar">
          <span className="manage-assignments-list-count">
            Plantel y atletas que tienen asignado este plan:
          </span>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={onOpenAddAssignment}
            disabled={Boolean(deletingId)}
          >
            <UserPlus size={15} aria-hidden="true" />
            <span>+ Asignar a otro atleta o categoría</span>
          </button>
        </div>

        {/* Listado de Asignaciones */}
        <div className="manage-assignments-list-wrap">
          {assignees.length === 0 ? (
            <div className="manage-assignments-empty-state">
              <Users size={40} className="manage-assignments-empty-icon" />
              <p className="manage-assignments-empty-text">
                No hay atletas ni categorías asignadas actualmente a este plan.
              </p>
              <button type="button" className="btn btn-primary" onClick={onOpenAddAssignment}>
                <UserPlus size={16} />
                <span>Asignar ahora</span>
              </button>
            </div>
          ) : (
            <ul className="manage-assignments-list" role="list">
              {assignees.map((assignee) => {
                const isThisDeleting = deletingId === assignee.assignmentId;
                const isConfirming = confirmDeleteId === assignee.assignmentId;
                const athletesOfCat =
                  assignee.type === 'category'
                    ? [...(categoryAthletes[assignee.targetId] ?? [])].sort(
                        (a, b) => getStatusPriority(a.id) - getStatusPriority(b.id),
                      )
                    : [];

                return (
                  <li key={assignee.assignmentId} className="manage-assignments-item-group">
                    <div className="manage-assignments-item">
                      <div className="manage-assignments-item-avatar">
                        <ProfileAvatar
                          src={assignee.photoUrl}
                          name={assignee.name}
                          size={44}
                          shape="circle"
                          alt={assignee.name}
                        />
                      </div>

                      <div className="manage-assignments-item-info">
                        <div className="manage-assignments-item-name-row">
                          <span className="manage-assignments-item-name">{assignee.name}</span>
                          {assignee.type === 'athlete' &&
                            assignee.targetId &&
                            athleteInjuryStates[assignee.targetId]?.status === 'injured' && (
                              <span
                                className="badge badge-danger manage-assignments-injury-badge"
                                title={`Lesión activa (${athleteInjuryStates[assignee.targetId]?.activeCount ?? 1})`}
                                data-testid={`injury-indicator-${assignee.targetId}`}
                                aria-label="Lesión activa"
                              >
                                <AlertTriangle size={12} aria-hidden="true" />
                                <span>Lesión</span>
                              </span>
                            )}
                          <span
                            className={`badge ${
                              assignee.type === 'athlete' ? 'badge-primary' : 'badge-secondary'
                            }`}
                          >
                            {assignee.type === 'athlete' ? 'Atleta' : 'Categoría'}
                          </span>
                          <span
                            className={`badge ${
                              assignee.status === 'Active' ? 'badge-success' : 'badge-subtle'
                            }`}
                          >
                            {assignee.status === 'Active' ? 'Activa' : 'Terminada'}
                          </span>
                        </div>

                        {assignee.secondaryInfo && (
                          <p className="manage-assignments-item-secondary">
                            {assignee.secondaryInfo}
                          </p>
                        )}

                        <p className="manage-assignments-item-dates">
                          <Calendar size={13} aria-hidden="true" />
                          <span>
                            Del {formatDayMonth(assignee.startDate)} al{' '}
                            {formatDayMonth(assignee.endDate)}
                          </span>
                        </p>
                      </div>

                      {/* Acciones: Estado de lesión / adaptación individual (KAN-464) y Quitar asignación alineados */}
                      <div className="manage-assignments-item-actions">
                        {assignee.type === 'athlete' &&
                          assignee.targetId &&
                          !isConfirming &&
                          renderAdaptationStatusControl(
                            assignee.targetId,
                            assignee.name,
                            Boolean(deletingId),
                          )}

                        {isConfirming ? (
                          <div className="manage-assignments-confirm-box">
                            <span className="manage-assignments-confirm-text">
                              ¿Quitar asignación?
                            </span>
                            <div className="manage-assignments-confirm-btns">
                              <button
                                type="button"
                                className="btn btn-danger btn-sm"
                                onClick={() => handleDelete(assignee.assignmentId, assignee.name)}
                                disabled={isThisDeleting}
                              >
                                {isThisDeleting ? (
                                  <Loader2 size={13} className="plan-spin" />
                                ) : (
                                  'Sí, quitar'
                                )}
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => setConfirmDeleteId(null)}
                                disabled={isThisDeleting}
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm manage-assignments-remove-btn manage-assignments-action-btn"
                            onClick={() => setConfirmDeleteId(assignee.assignmentId)}
                            disabled={Boolean(deletingId)}
                            title={`Quitar a ${assignee.name} de este plan`}
                            aria-label={`Quitar a ${assignee.name}`}
                          >
                            <Trash2 size={14} className="manage-assignments-remove-icon" />
                            <span>Quitar asignación</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Atletas dentro de la categoría asignada para revisar adaptación individual (KAN-464) */}
                    {assignee.type === 'category' && athletesOfCat.length > 0 && (
                      <div className="manage-assignments-category-athletes">
                        <span className="manage-assignments-category-athletes-title">
                          Atletas de {assignee.name} — Adaptación individual:
                        </span>
                        <ul className="manage-assignments-category-athletes-list" role="list">
                          {athletesOfCat.map((ath) => {
                            const fullName =
                              ath.fullName || `${ath.firstName} ${ath.lastName}`.trim();
                            return (
                              <li key={ath.id} className="manage-assignments-category-athlete-row">
                                <div className="manage-assignments-category-athlete-info">
                                  <span className="manage-assignments-category-athlete-name">
                                    {fullName}
                                  </span>
                                  {athleteInjuryStates[ath.id]?.status === 'injured' && (
                                    <span
                                      className="badge badge-danger manage-assignments-injury-badge"
                                      title={`Lesión activa (${athleteInjuryStates[ath.id]?.activeCount ?? 1})`}
                                      data-testid={`injury-indicator-${ath.id}`}
                                      aria-label="Lesión activa"
                                    >
                                      <AlertTriangle size={12} aria-hidden="true" />
                                      <span>Lesión</span>
                                    </span>
                                  )}
                                </div>
                                <div className="manage-assignments-category-athlete-actions">
                                  {renderAdaptationStatusControl(ath.id, fullName)}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Pie del modal */}
        <footer className="manage-assignments-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={Boolean(deletingId)}
          >
            Cerrar
          </button>
        </footer>
      </div>

      {/* Modal de comparativa base vs. adaptada con motivo (KAN-464) */}
      {adaptationTarget && (
        <AthleteAdaptationDiffModal
          isOpen={Boolean(adaptationTarget)}
          planId={planId}
          planName={planName}
          athleteId={adaptationTarget.athleteId}
          athleteName={adaptationTarget.athleteName}
          initialSessionId={adaptationTarget.initialSessionId}
          onClose={() => setAdaptationTarget(null)}
          onAdaptationApproved={(approvedSessionId) => {
            const { athleteId: approvedAthleteId, athleteName: approvedAthleteName } =
              adaptationTarget;
            const effectiveSessionId =
              approvedSessionId ||
              adaptationTarget.initialSessionId ||
              planSessionIds[0] ||
              'default';
            const wasAlreadyApproved =
              adaptationDecisionsBySession[approvedAthleteId]?.[effectiveSessionId] === 'approved';

            setAdaptationDecisionsBySession((prev) => ({
              ...prev,
              [approvedAthleteId]: {
                ...(prev[approvedAthleteId] ?? {}),
                [effectiveSessionId]: 'approved',
              },
            }));
            setErrorMessage(null);
            setAdaptationTarget(null);
            showFeedbackMessage(
              wasAlreadyApproved
                ? `Variante adaptada actualizada con éxito para ${approvedAthleteName}.`
                : `Variante adaptada aprobada con éxito para ${approvedAthleteName}.`,
            );
          }}
          onAdaptationRejected={(_reason, rejectedSessionId) => {
            const { athleteId: rejectedAthleteId, athleteName: rejectedAthleteName } =
              adaptationTarget;
            const effectiveSessionId =
              rejectedSessionId ||
              adaptationTarget.initialSessionId ||
              planSessionIds[0] ||
              'default';

            setAdaptationDecisionsBySession((prev) => ({
              ...prev,
              [rejectedAthleteId]: {
                ...(prev[rejectedAthleteId] ?? {}),
                [effectiveSessionId]: 'rejected',
              },
            }));
            setErrorMessage(null);
            setAdaptationTarget(null);
            showFeedbackMessage(
              `Propuesta de adaptación rechazada. Se mantiene la rutina base de la categoría para ${rejectedAthleteName}.`,
              'danger',
            );
          }}
        />
      )}
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};

export const ManagePlanAssignmentsModal: React.FC<ManagePlanAssignmentsModalProps> = ({
  isOpen,
  ...rest
}) => {
  if (!isOpen) return null;
  return <ManagePlanAssignmentsModalContent {...rest} />;
};
