import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Loader2,
  ShieldAlert,
  Sparkles,
  X,
} from 'lucide-react';
import {
  athleteAdaptationsService,
  type AdaptationChangeWithSubstitutes,
  type AthleteAdaptationContextResponse,
  type AuthorizedSubstituteContext,
  type RoutineAdaptationResponseWithBase,
  type SuggestedRoutineExercise,
} from '../../api/athleteAdaptations';
import { trainingPlansService } from '../../api/trainingPlans';
import type { TrainingPlanDetail, TrainingSessionDetail } from '../../api/generated/entrenamiento';
import { todayInArgentina } from '../../utils/argentinaDate';

export interface AthleteAdaptationDiffModalProps {
  isOpen: boolean;
  planId: string;
  planName: string;
  athleteId: string;
  athleteName: string;
  onClose: () => void;
  onAdaptationApproved?: () => void;
}

interface FlattenedPlanSession {
  weekNumber: number;
  session: TrainingSessionDetail;
}

function formatZoneLabel(zone?: string | null): string {
  if (!zone) return 'Zona afectada';
  const normalized = zone.trim().toLowerCase().replace(/_/g, ' ');
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export const AthleteAdaptationDiffModal: React.FC<AthleteAdaptationDiffModalProps> = ({
  isOpen,
  planId,
  planName,
  athleteId,
  athleteName,
  onClose,
  onAdaptationApproved,
}) => {
  const [loadingPlan, setLoadingPlan] = useState<boolean>(true);
  const [loadingProposal, setLoadingProposal] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const [planDetail, setPlanDetail] = useState<TrainingPlanDetail | null>(null);
  const [context, setContext] = useState<AthleteAdaptationContextResponse | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [proposal, setProposal] = useState<RoutineAdaptationResponseWithBase | null>(null);
  const [selectedSubstitutes, setSelectedSubstitutes] = useState<Record<string, string>>({});
  const [isApproved, setIsApproved] = useState<boolean>(false);

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const flattenedSessions = useMemo<FlattenedPlanSession[]>(() => {
    if (!planDetail?.weeks) return [];
    const list: FlattenedPlanSession[] = [];
    for (const week of planDetail.weeks) {
      for (const session of week.sessions ?? []) {
        list.push({ weekNumber: week.weekNumber, session });
      }
    }
    return list;
  }, [planDetail]);

  const activeSessionEntry = useMemo<FlattenedPlanSession | null>(() => {
    if (flattenedSessions.length === 0) return null;
    return (
      flattenedSessions.find((item) => item.session.id === selectedSessionId) ??
      flattenedSessions[0]
    );
  }, [flattenedSessions, selectedSessionId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !submitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, submitting, onClose]);

  // 1. Cargar detalle del plan y contexto médico/deportivo del atleta
  useEffect(() => {
    if (!isOpen || !planId || !athleteId) return;

    let active = true;

    async function loadPlanAndContext() {
      setLoadingPlan(true);
      setError(null);
      setSuccessMessage(null);
      setProposal(null);
      setIsApproved(false);

      try {
        const [loadedPlan, loadedContext] = await Promise.all([
          trainingPlansService.get(planId),
          athleteAdaptationsService.getAdaptationContext(athleteId).catch(() => null),
        ]);

        if (!active) return;
        setPlanDetail(loadedPlan);
        setContext(loadedContext);

        const firstWithExercises =
          loadedPlan.weeks
            ?.flatMap((w) => w.sessions ?? [])
            .find((s) => (s.exercises?.length ?? 0) > 0) ??
          loadedPlan.weeks?.[0]?.sessions?.[0] ??
          null;

        setSelectedSessionId(firstWithExercises?.id ?? '');
      } catch (err: unknown) {
        if (!active) return;
        setError(
          err instanceof Error
            ? err.message
            : 'No se pudo cargar la planificación para comparar la adaptación.',
        );
      } finally {
        if (active) setLoadingPlan(false);
      }
    }

    loadPlanAndContext();

    return () => {
      active = false;
    };
  }, [isOpen, planId, athleteId]);

  // 2. Generar la propuesta de adaptación para la sesión seleccionada
  useEffect(() => {
    if (!isOpen || loadingPlan || !athleteId) return;

    let active = true;

    async function loadProposalForSession() {
      setLoadingProposal(true);
      setError(null);
      setSuccessMessage(null);
      setIsApproved(false);

      const session = activeSessionEntry?.session ?? null;
      const baseExercises: SuggestedRoutineExercise[] = (session?.exercises ?? []).map((ex) => ({
        exerciseId: ex.exerciseId,
        exerciseName: ex.exerciseName,
        sets: ex.sets,
        reps: ex.reps,
        suggestedPercentage: ex.targetPercentage ?? 0,
        isReference: false,
      }));

      const goal =
        planDetail?.objective?.trim() ||
        planDetail?.name?.trim() ||
        session?.name?.trim() ||
        'Adaptación individual de rutina base';

      try {
        const [adaptationData, existingAdjustment] = await Promise.all([
          athleteAdaptationsService.generateAdaptation(athleteId, {
            goal,
            baseExercises: baseExercises.length > 0 ? baseExercises : undefined,
          }),
          session?.id
            ? athleteAdaptationsService.getSessionAdjustment(session.id, athleteId)
            : Promise.resolve(null),
        ]);

        if (!active) return;
        setProposal(adaptationData);

        const initialSubstitutes: Record<string, string> = {};
        for (const change of adaptationData.adaptationChanges ?? []) {
          const key = change.originalExerciseId || change.originalExerciseName;
          initialSubstitutes[key] = change.finalExerciseId;
        }
        if (existingAdjustment?.items?.length) {
          for (const item of existingAdjustment.items) {
            initialSubstitutes[item.originalExerciseId] = item.substituteExerciseId;
          }
          setIsApproved(true);
        }
        setSelectedSubstitutes(initialSubstitutes);
      } catch (err: unknown) {
        if (!active) return;
        setError(
          err instanceof Error
            ? err.message
            : 'No se pudo generar la comparativa de adaptación para el atleta.',
        );
      } finally {
        if (active) setLoadingProposal(false);
      }
    }

    loadProposalForSession();

    return () => {
      active = false;
    };
  }, [isOpen, loadingPlan, athleteId, activeSessionEntry, planDetail]);

  if (!isOpen) return null;

  const baseExercisesList: SuggestedRoutineExercise[] =
    proposal?.baseExercises && proposal.baseExercises.length > 0
      ? proposal.baseExercises
      : (activeSessionEntry?.session.exercises ?? []).map((ex) => ({
          exerciseId: ex.exerciseId,
          exerciseName: ex.exerciseName,
          sets: ex.sets,
          reps: ex.reps,
          suggestedPercentage: ex.targetPercentage ?? 0,
          isReference: false,
        }));

  const findChangeForBaseExercise = (
    baseEx: SuggestedRoutineExercise,
    index: number,
  ): AdaptationChangeWithSubstitutes | null => {
    const changes = proposal?.adaptationChanges ?? [];
    if (changes.length === 0) return null;

    if (baseEx.exerciseId) {
      const byId = changes.find((c) => c.originalExerciseId === baseEx.exerciseId);
      if (byId) return byId;
    }

    const byName = changes.find(
      (c) =>
        c.originalExerciseName.trim().toLowerCase() === baseEx.exerciseName.trim().toLowerCase(),
    );
    if (byName) return byName;

    const adaptedAtIdx = proposal?.exercises?.[index];
    if (
      adaptedAtIdx &&
      adaptedAtIdx.exerciseName.trim().toLowerCase() !== baseEx.exerciseName.trim().toLowerCase()
    ) {
      return (
        changes.find((c) => c.finalExerciseId === adaptedAtIdx.exerciseId) ?? changes[0] ?? null
      );
    }

    return null;
  };

  const getAvailableSubstitutes = (
    baseEx: SuggestedRoutineExercise,
    change: AdaptationChangeWithSubstitutes,
  ): AuthorizedSubstituteContext[] => {
    if (change.availableSubstitutes && change.availableSubstitutes.length > 0) {
      return change.availableSubstitutes;
    }
    const fromContext = context?.restrictions?.find(
      (r) => r.exerciseId === baseEx.exerciseId || r.exerciseId === change.originalExerciseId,
    )?.substitutes;
    if (fromContext && fromContext.length > 0) {
      return fromContext;
    }
    return [{ exerciseId: change.finalExerciseId, name: change.finalExerciseName }];
  };

  const handleSubstituteChange = (key: string, substituteExerciseId: string) => {
    setSelectedSubstitutes((prev) => ({
      ...prev,
      [key]: substituteExerciseId,
    }));
    setIsApproved(false);
    setSuccessMessage(null);
  };

  const handleApproveAdaptation = async () => {
    if (!proposal) return;

    const changes = proposal.adaptationChanges ?? [];
    const sessionId = activeSessionEntry?.session.id;

    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (sessionId && changes.length > 0) {
        const items = changes
          .map((change) => {
            const key = change.originalExerciseId || change.originalExerciseName;
            const chosenSubstituteId = selectedSubstitutes[key] || change.finalExerciseId;
            return {
              originalExerciseId: change.originalExerciseId ?? '',
              substituteExerciseId: chosenSubstituteId,
            };
          })
          .filter((item) => Boolean(item.originalExerciseId && item.substituteExerciseId));

        if (items.length > 0) {
          const note = changes.map((c) => c.reason).join(' ') || proposal.justificationSummary;

          await athleteAdaptationsService.applySessionAdjustment(sessionId, {
            athleteId,
            trainingPlanId: planId,
            date: todayInArgentina(),
            note,
            items,
          });
        }
      }

      setIsApproved(true);
      setSuccessMessage(
        `¡Variante adaptada aprobada y guardada para ${athleteName} en la planificación!`,
      );
      onAdaptationApproved?.();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'No se pudo aprobar la adaptación. Probá de nuevo.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const isLoading = loadingPlan || loadingProposal;
  const activeInjuries = context?.activeInjuries ?? [];
  const hasAdaptations =
    Boolean(proposal?.wasAdapted) || (proposal?.adaptationChanges?.length ?? 0) > 0;

  const modalContent = (
    <div
      className="manage-assignments-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="athlete-adaptation-diff-title"
      onClick={submitting ? undefined : onClose}
      data-testid="athlete-adaptation-diff-modal"
    >
      <div
        className="manage-assignments-modal-card adaptation-diff-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="manage-assignments-close-btn"
          aria-label="Cerrar comparativa de adaptación"
        >
          <X size={20} />
        </button>

        {/* Cabecera */}
        <header className="manage-assignments-header">
          <div className="manage-assignments-icon-box adaptation-diff-icon-box">
            <Sparkles size={22} />
          </div>
          <div>
            <div className="adaptation-diff-title-row">
              <h3 id="athlete-adaptation-diff-title" className="manage-assignments-title">
                Comparativa Base vs. Adaptada
              </h3>
              <span className={`badge ${isApproved ? 'badge-success' : 'badge-primary'}`}>
                {isApproved ? 'Variante aprobada' : 'Propuesta individual'}
              </span>
            </div>
            <p className="manage-assignments-subtitle">
              Plan «<strong>{planName}</strong>» · Atleta: <strong>{athleteName}</strong>
            </p>
          </div>
        </header>

        {/* Selector de sesión cuando el plan tiene varias sesiones */}
        {flattenedSessions.length > 1 && (
          <div
            className="adaptation-diff-sessions-bar"
            role="tablist"
            aria-label="Sesiones del plan"
          >
            {flattenedSessions.map(({ weekNumber, session }) => {
              const isSelected = activeSessionEntry?.session.id === session.id;
              return (
                <button
                  key={session.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  className={`plan-tab-btn btn-sm ${isSelected ? 'active' : ''}`}
                  onClick={() => setSelectedSessionId(session.id)}
                  disabled={isLoading || submitting}
                >
                  <span>
                    Sem. {weekNumber} · {session.name}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Estado de carga */}
        {isLoading && (
          <div className="adaptation-diff-loading">
            <Loader2 size={28} className="plan-spin" />
            <span>Analizando rutina base, lesiones activas y sustitutos autorizados…</span>
          </div>
        )}

        {/* Mensajes de error o éxito */}
        {!isLoading && error && (
          <div className="alert-banner danger" role="alert">
            <span className="plan-inline">
              <AlertTriangle size={16} aria-hidden="true" />
              {error}
            </span>
          </div>
        )}

        {!isLoading && successMessage && (
          <div className="alert-banner success" role="status">
            <span className="plan-inline">
              <CheckCircle2 size={16} aria-hidden="true" />
              {successMessage}
            </span>
          </div>
        )}

        {/* Contenido principal de la comparativa */}
        {!isLoading && proposal && (
          <div className="adaptation-diff-body">
            {/* Contexto médico y justificación general */}
            <div className="adaptation-diff-context-card">
              <div className="adaptation-diff-context-header">
                <span className="adaptation-diff-context-title">
                  <ShieldAlert size={15} aria-hidden="true" />
                  <span>Justificación médica y deportiva ({proposal.aiProvider})</span>
                </span>
                {activeInjuries.map((injury) => (
                  <span key={injury.id} className="badge adaptation-diff-injury-badge">
                    Lesión activa: {formatZoneLabel(injury.zone)}
                    {injury.description ? ` · ${injury.description}` : ''}
                  </span>
                ))}
              </div>
              <p className="adaptation-diff-justification-text">{proposal.justificationSummary}</p>
            </div>

            {/* Encabezado de columnas del Diff */}
            <div className="adaptation-diff-columns-header" aria-hidden="true">
              <span>Rutina Base (Categoría)</span>
              <span>Variante Propuesta ({athleteName})</span>
            </div>

            {/* Lista comparativa ejercicio por ejercicio */}
            <div className="adaptation-diff-list" role="list">
              {(baseExercisesList.length > 0 ? baseExercisesList : proposal.exercises).map(
                (baseEx, idx) => {
                  const change = findChangeForBaseExercise(baseEx, idx);
                  const adaptedEx = proposal.exercises[idx] ?? baseEx;

                  if (!change) {
                    return (
                      <div
                        key={baseEx.exerciseId || `${baseEx.exerciseName}-${idx}`}
                        className="adaptation-diff-row unchanged"
                        role="listitem"
                      >
                        <div className="adaptation-diff-grid">
                          <div className="adaptation-diff-col base">
                            <span className="adaptation-diff-col-label">Rutina Base</span>
                            <strong className="adaptation-diff-ex-name">
                              {baseEx.exerciseName}
                            </strong>
                            <span className="adaptation-diff-ex-meta">
                              {baseEx.sets} series × {baseEx.reps} reps
                              {baseEx.suggestedPercentage
                                ? ` · ${baseEx.suggestedPercentage}% 1RM`
                                : ''}
                            </span>
                          </div>

                          <div className="adaptation-diff-arrow" aria-hidden="true">
                            <ArrowRight size={16} />
                          </div>

                          <div className="adaptation-diff-col adapted">
                            <div className="adaptation-diff-col-top">
                              <span className="adaptation-diff-col-label">Variante Adaptada</span>
                              <span className="badge badge-subtle">Sin cambios</span>
                            </div>
                            <strong className="adaptation-diff-ex-name">
                              {adaptedEx.exerciseName}
                            </strong>
                            <span className="adaptation-diff-ex-meta">
                              {adaptedEx.sets} series × {adaptedEx.reps} reps
                              {adaptedEx.suggestedPercentage
                                ? ` · ${adaptedEx.suggestedPercentage}% 1RM`
                                : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  const changeKey = change.originalExerciseId || change.originalExerciseName;
                  const substitutes = getAvailableSubstitutes(baseEx, change);
                  const chosenId = selectedSubstitutes[changeKey] || change.finalExerciseId;
                  const chosenName =
                    substitutes.find((s) => s.exerciseId === chosenId)?.name ??
                    change.finalExerciseName;

                  return (
                    <div
                      key={changeKey}
                      className="adaptation-diff-row modified"
                      role="listitem"
                      data-testid={`adaptation-diff-item-${changeKey}`}
                    >
                      <div className="adaptation-diff-grid">
                        {/* Columna Base */}
                        <div className="adaptation-diff-col base replaced">
                          <div className="adaptation-diff-col-top">
                            <span className="adaptation-diff-col-label">
                              Rutina Base (Categoría)
                            </span>
                            <span className="badge adaptation-diff-replaced-badge">
                              Reemplazado
                            </span>
                          </div>
                          <strong className="adaptation-diff-ex-name strikethrough">
                            {change.originalExerciseName}
                          </strong>
                          <span className="adaptation-diff-ex-meta">
                            {baseEx.sets} series × {baseEx.reps} reps
                            {baseEx.suggestedPercentage
                              ? ` · ${baseEx.suggestedPercentage}% 1RM`
                              : ''}
                          </span>
                        </div>

                        <div className="adaptation-diff-arrow active" aria-hidden="true">
                          <ArrowRight size={18} />
                        </div>

                        {/* Columna Adaptada */}
                        <div className="adaptation-diff-col adapted replacement">
                          <div className="adaptation-diff-col-top">
                            <span className="adaptation-diff-col-label">Variante Propuesta</span>
                            <span className="badge badge-success">Sustituto autorizado</span>
                          </div>
                          <strong className="adaptation-diff-ex-name highlight">
                            {chosenName}
                          </strong>
                          <span className="adaptation-diff-ex-meta">
                            {adaptedEx.sets} series × {adaptedEx.reps} reps
                            {adaptedEx.suggestedPercentage
                              ? ` · ${adaptedEx.suggestedPercentage}% 1RM`
                              : ''}
                          </span>
                        </div>
                      </div>

                      {/* Motivo y justificación médica */}
                      <div className="adaptation-diff-reason-box">
                        <div className="adaptation-diff-reason-tags">
                          <span className="badge adaptation-diff-zone-badge">
                            Zona protegida: {formatZoneLabel(change.zone)}
                          </span>
                        </div>
                        <p className="adaptation-diff-reason-text">
                          <strong>Motivo médico / biomecánico:</strong> {change.reason}
                        </p>

                        {substitutes.length > 1 && (
                          <div className="adaptation-diff-substitute-picker">
                            <label htmlFor={`adaptation-sub-select-${changeKey}`}>
                              Ajustar sustituto autorizado:
                            </label>
                            <div className="adaptation-diff-select-wrap">
                              <select
                                id={`adaptation-sub-select-${changeKey}`}
                                value={chosenId}
                                onChange={(e) => handleSubstituteChange(changeKey, e.target.value)}
                                disabled={submitting}
                              >
                                {substitutes.map((sub) => (
                                  <option key={sub.exerciseId} value={sub.exerciseId}>
                                    {sub.name}
                                    {sub.exerciseId === change.finalExerciseId
                                      ? ' (Sugerido por el Asistente)'
                                      : ''}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown
                                size={14}
                                className="adaptation-diff-select-icon"
                                aria-hidden="true"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          </div>
        )}

        {/* Pie del modal: acción en 1 clic */}
        <footer className="manage-assignments-footer adaptation-diff-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={submitting}
          >
            Cerrar
          </button>

          {!isLoading && proposal && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleApproveAdaptation}
              disabled={submitting || (!hasAdaptations && isApproved)}
            >
              {submitting ? (
                <>
                  <Loader2 size={15} className="plan-spin" aria-hidden="true" />
                  <span>Aprobando…</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} aria-hidden="true" />
                  <span>{isApproved ? 'Actualizar adaptación' : 'Aprobar adaptación'}</span>
                </>
              )}
            </button>
          )}
        </footer>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
