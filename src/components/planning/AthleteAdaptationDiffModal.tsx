import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle,
  ArrowLeftRight,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Edit3,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  X,
  XCircle,
} from 'lucide-react';
import {
  athleteAdaptationsService,
  type AdaptationChange,
  type AdaptationRecordContext,
  type AthleteAdaptationContextResponse,
  type AuthorizedSubstituteContext,
  type RoutineAdaptationResponse,
  type SuggestedRoutineExercise,
} from '../../api/athleteAdaptations';
import { exercisesService } from '../../api/exercises';
import { trainingPlansService } from '../../api/trainingPlans';
import type { TrainingPlanDetail, TrainingSessionDetail } from '../../api/generated/entrenamiento';
import type { CatalogExercise } from '../../types/trainingPlans';
import { ExercisePickerModal } from './ExercisePickerModal';
import { AdaptationDiffItem } from './AdaptationDiffItem';
import { todayInArgentina } from '../../utils/argentinaDate';
import { parseRepsNumber } from '../../utils/planDraft';

const DEFAULT_CONSERVATIVE_ESTIMATED_RECORD_PERCENT = 90;

export interface AthleteAdaptationDiffModalProps {
  isOpen: boolean;
  planId: string;
  planName: string;
  athleteId: string;
  athleteName: string;
  onClose: () => void;
  onAdaptationApproved?: () => void;
  onAdaptationRejected?: (reason?: string) => void;
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

function cleanJustificationText(text?: string | null): string {
  if (!text) return '';
  return text
    .replace(
      /\s*Criterio activado como respaldo ante indisponibilidad de proveedores de IA\.?/gi,
      '',
    )
    .trim();
}

function isEstimatedRecordOrigin(origin?: string | null): boolean {
  if (!origin) return false;
  const normalized = origin.trim().toLowerCase();
  return normalized.includes('estimated') || normalized.includes('estimad');
}

export const AthleteAdaptationDiffModal: React.FC<AthleteAdaptationDiffModalProps> = ({
  isOpen,
  planId,
  planName,
  athleteId,
  athleteName,
  onClose,
  onAdaptationApproved,
  onAdaptationRejected,
}) => {
  const [loadingPlan, setLoadingPlan] = useState<boolean>(true);
  const [loadingProposal, setLoadingProposal] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const [planDetail, setPlanDetail] = useState<TrainingPlanDetail | null>(null);
  const [context, setContext] = useState<AthleteAdaptationContextResponse | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [proposal, setProposal] = useState<RoutineAdaptationResponse | null>(null);
  const [selectedSubstitutes, setSelectedSubstitutes] = useState<Record<string, string>>({});

  // Estados de decisión del PF: Aprobar / Editar / Rechazar (KAN-465, KAN-637)
  const [isApproved, setIsApproved] = useState<boolean>(false);
  const [isRejected, setIsRejected] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [hasEdited, setHasEdited] = useState<boolean>(false);
  const [customNote, setCustomNote] = useState<string>('');
  const [loadReductionPercentage, setLoadReductionPercentage] = useState<string>('');
  const [showRejectForm, setShowRejectForm] = useState<boolean>(false);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [customExerciseNames, setCustomExerciseNames] = useState<Record<string, string>>({});
  const [pickerTarget, setPickerTarget] = useState<{
    key: string;
    originalExerciseName: string;
    originalExerciseId?: string | null;
  } | null>(null);

  const [showGeneralJustification, setShowGeneralJustification] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const carouselRef = useRef<HTMLDivElement | null>(null);

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
      if (e.key === 'Escape' && isOpen && !submitting && !pickerTarget) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, submitting, pickerTarget, onClose]);

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
      setIsRejected(false);
      setIsEditing(false);
      setHasEdited(false);
      setShowRejectForm(false);
      setRejectionReason('');

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
      setIsRejected(false);
      setIsEditing(false);
      setHasEdited(false);
      setShowRejectForm(false);
      setRejectionReason('');

      const session = activeSessionEntry?.session ?? null;
      const baseExercises: SuggestedRoutineExercise[] = (session?.exercises ?? []).map((ex) => ({
        exerciseId: ex.exerciseId,
        exerciseName: ex.exerciseName,
        sets: ex.sets,
        reps: typeof ex.reps === 'string' ? parseRepsNumber(ex.reps, 10) : (ex.reps ?? 10),
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
        setPickerTarget(null);

        // Resolver nombres si hay ajustes previos con ejercicios elegidos manualmente desde catálogo
        if (existingAdjustment?.items?.length) {
          const knownIds = new Set<string>();
          for (const change of adaptationData.adaptationChanges ?? []) {
            change.availableSubstitutes?.forEach((s) => knownIds.add(s.exerciseId));
            if (change.finalExerciseId) knownIds.add(change.finalExerciseId);
          }
          context?.restrictions?.forEach((r) =>
            r.substitutes?.forEach((s) => knownIds.add(s.exerciseId)),
          );
          context?.currentRecords?.forEach((r) => knownIds.add(r.exerciseId));
          baseExercises.forEach((b) => {
            if (b.exerciseId) knownIds.add(b.exerciseId);
          });

          const missingIds = existingAdjustment.items
            .map((item) => item.substituteExerciseId)
            .filter((id) => Boolean(id) && !knownIds.has(id));

          if (missingIds.length > 0) {
            const loaded = await exercisesService.getByIds(missingIds).catch(() => []);
            if (!active) return;
            if (loaded.length > 0) {
              setCustomExerciseNames((prev) => {
                const next = { ...prev };
                for (const ex of loaded) {
                  next[ex.id] = ex.name;
                }
                return next;
              });
            }
          }
        }

        const defaultNote = cleanJustificationText(
          existingAdjustment?.note ||
            (adaptationData.adaptationChanges ?? []).map((c) => c.reason).join(' ') ||
            adaptationData.justificationSummary ||
            '',
        );
        setCustomNote(defaultNote);
        setLoadReductionPercentage(
          existingAdjustment?.loadReductionPercentage
            ? String(existingAdjustment.loadReductionPercentage)
            : '',
        );
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
  }, [
    isOpen,
    loadingPlan,
    athleteId,
    activeSessionEntry,
    planDetail,
    context?.restrictions,
    context?.currentRecords,
  ]);

  if (!isOpen) return null;

  const currentRecords: AdaptationRecordContext[] = context?.currentRecords ?? [];

  const findRecordForExercise = (
    exerciseId?: string | null,
    exerciseName?: string | null,
  ): AdaptationRecordContext | null => {
    if (currentRecords.length === 0) return null;
    if (exerciseId) {
      const byId = currentRecords.find((r) => r.exerciseId === exerciseId);
      if (byId) return byId;
    }
    if (exerciseName) {
      const normalized = exerciseName.trim().toLowerCase();
      const byName = currentRecords.find((r) => r.exerciseName.trim().toLowerCase() === normalized);
      if (byName) return byName;
    }
    return null;
  };

  const baseExercisesList: SuggestedRoutineExercise[] =
    proposal?.baseExercises && proposal.baseExercises.length > 0
      ? proposal.baseExercises
      : (activeSessionEntry?.session.exercises ?? []).map((ex) => ({
          exerciseId: ex.exerciseId,
          exerciseName: ex.exerciseName,
          sets: ex.sets,
          reps: typeof ex.reps === 'string' ? parseRepsNumber(ex.reps, 10) : (ex.reps ?? 10),
          suggestedPercentage: ex.targetPercentage ?? 0,
          isReference: false,
        }));

  // Detectar récords estimados relevantes para la alerta de dato estimado (KAN-465)
  const conservativeRecordPercent =
    context?.conservativeEstimatedRecordPercent ?? DEFAULT_CONSERVATIVE_ESTIMATED_RECORD_PERCENT;
  const estimatedRecordsInContext = currentRecords.filter((rec) =>
    isEstimatedRecordOrigin(rec.origin),
  );
  const estimatedWarningsFromProposal = (proposal?.adaptationWarnings ?? []).filter(
    (w) =>
      w.toLowerCase().includes('dato estimado') ||
      w.toLowerCase().includes('1rm estimado') ||
      w.toLowerCase().includes('es estimado'),
  );
  const hasEstimatedDataAlert =
    estimatedRecordsInContext.length > 0 || estimatedWarningsFromProposal.length > 0;

  const findChangeForBaseExercise = (
    baseEx: SuggestedRoutineExercise,
    index: number,
  ): AdaptationChange | null => {
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
    change: AdaptationChange,
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
    setHasEdited(true);
    setIsApproved(false);
    setIsRejected(false);
    setSuccessMessage(null);
  };

  const handleSelectCatalogExercise = (exercise: CatalogExercise) => {
    if (!pickerTarget) return;
    setCustomExerciseNames((prev) => ({
      ...prev,
      [exercise.id]: exercise.name,
    }));
    handleSubstituteChange(pickerTarget.key, exercise.id);
    setPickerTarget(null);
  };

  const handleRestoreBaseExercise = (key: string) => {
    setSelectedSubstitutes((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setHasEdited(true);
    setIsApproved(false);
    setIsRejected(false);
    setSuccessMessage(null);
  };

  const handleNoteChange = (value: string) => {
    setCustomNote(value);
    setHasEdited(true);
    setIsApproved(false);
    setIsRejected(false);
    setSuccessMessage(null);
  };

  const handleLoadReductionChange = (value: string) => {
    setLoadReductionPercentage(value);
    setHasEdited(true);
    setIsApproved(false);
    setIsRejected(false);
    setSuccessMessage(null);
  };

  const handleApproveAdaptation = async () => {
    if (!proposal) return;

    const changes = proposal.adaptationChanges ?? [];
    const sessionId = activeSessionEntry?.session.id;

    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    const parsedReduction =
      loadReductionPercentage.trim() !== ''
        ? Math.min(100, Math.max(1, Number(loadReductionPercentage)))
        : undefined;
    const validLoadReduction =
      parsedReduction !== undefined && !Number.isNaN(parsedReduction) ? parsedReduction : undefined;

    try {
      const itemsMap = new Map<string, string>();

      baseExercisesList.forEach((baseEx, idx) => {
        const change = findChangeForBaseExercise(baseEx, idx);
        const rowKey = change
          ? change.originalExerciseId || change.originalExerciseName
          : baseEx.exerciseId || baseEx.exerciseName;
        const originalId = change?.originalExerciseId ?? baseEx.exerciseId;
        const chosenId = selectedSubstitutes[rowKey] || change?.finalExerciseId;

        if (originalId && chosenId && chosenId !== originalId) {
          itemsMap.set(originalId, chosenId);
        }
      });

      for (const change of changes) {
        const key = change.originalExerciseId || change.originalExerciseName;
        const chosenSubstituteId = selectedSubstitutes[key] || change.finalExerciseId;
        if (
          change.originalExerciseId &&
          chosenSubstituteId &&
          !itemsMap.has(change.originalExerciseId)
        ) {
          itemsMap.set(change.originalExerciseId, chosenSubstituteId);
        }
      }

      const items = Array.from(itemsMap.entries()).map(
        ([originalExerciseId, substituteExerciseId]) => ({
          originalExerciseId,
          substituteExerciseId,
        }),
      );

      const noteToSave =
        customNote.trim() ||
        changes.map((c) => c.reason).join(' ') ||
        proposal.justificationSummary;

      if (sessionId && (items.length > 0 || validLoadReduction !== undefined || hasEdited)) {
        await athleteAdaptationsService.applySessionAdjustment(sessionId, {
          athleteId,
          trainingPlanId: planId,
          date: todayInArgentina(),
          note: noteToSave,
          items,
          ...(validLoadReduction !== undefined
            ? { loadReductionPercentage: validLoadReduction }
            : {}),
        });
      }

      setIsApproved(true);
      setIsRejected(false);
      setIsEditing(false);
      setShowRejectForm(false);
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

  const handleRejectAdaptation = () => {
    const trimmedReason = rejectionReason.trim();
    setIsRejected(true);
    setIsApproved(false);
    setIsEditing(false);
    setShowRejectForm(false);
    setError(null);
    setSuccessMessage(
      `Propuesta de adaptación rechazada. Se mantiene la rutina base de la categoría para ${athleteName}.`,
    );
    onAdaptationRejected?.(trimmedReason || undefined);
  };

  const handleScrollPrev = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: -220, behavior: 'smooth' });
    }
  };

  const handleScrollNext = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: 220, behavior: 'smooth' });
    }
  };

  const renderRecordOriginBadge = (
    exerciseId?: string | null,
    exerciseName?: string | null,
    isReference?: boolean,
  ) => {
    const record = findRecordForExercise(exerciseId, exerciseName);
    if (record) {
      if (isEstimatedRecordOrigin(record.origin)) {
        return (
          <span
            className="badge adaptation-diff-estimated-badge"
            title={`Marca estimada en el onboarding: se aplica escalón conservador del ${conservativeRecordPercent} %`}
          >
            Dato estimado: {record.weightOneRepMaxKg} kg ({conservativeRecordPercent} % conservador)
          </span>
        );
      }
      return <span className="badge badge-subtle">1RM: {record.weightOneRepMaxKg} kg</span>;
    }

    if (isReference || currentRecords.length > 0) {
      return (
        <span
          className="badge adaptation-diff-reference-badge"
          title="El atleta aún no registra 1RM en este ejercicio; se prescribe como serie de referencia"
        >
          Sin 1RM · Serie de referencia
        </span>
      );
    }

    return null;
  };

  const isLoading = loadingPlan || loadingProposal;
  const activeInjuries = context?.activeInjuries ?? [];
  const adaptationChangesCount = proposal?.adaptationChanges?.length ?? 0;
  const hasAdaptations =
    Boolean(proposal?.wasAdapted) ||
    adaptationChangesCount > 0 ||
    Object.keys(selectedSubstitutes).length > 0;

  const statusBadgeClass = isApproved
    ? 'badge-success'
    : isRejected
      ? 'adaptation-diff-rejected-badge'
      : hasEdited
        ? 'adaptation-diff-edited-badge'
        : 'badge-primary';

  const statusBadgeLabel = isApproved
    ? 'Adaptación aprobada'
    : isRejected
      ? 'Propuesta rechazada'
      : hasEdited
        ? 'Editada por PF'
        : 'Propuesta individual';

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

        {/* Cabecera visual (según diseño adjunto) */}
        <header className="manage-assignments-header adaptation-diff-header">
          <div
            className="manage-assignments-icon-box adaptation-diff-header-icon"
            aria-hidden="true"
          >
            <Dumbbell size={22} />
          </div>
          <div className="adaptation-diff-header-info">
            <div className="adaptation-diff-title-row">
              <h3
                id="athlete-adaptation-diff-title"
                className="manage-assignments-title"
                aria-label="Comparativa Base vs. Adaptada"
              >
                Comparativa de rutina
              </h3>
              <span className={`badge ${statusBadgeClass}`}>
                {isApproved ? (
                  <CheckCircle2 size={13} aria-hidden="true" />
                ) : isRejected ? (
                  <XCircle size={13} aria-hidden="true" />
                ) : (
                  <Sparkles size={13} aria-hidden="true" />
                )}
                <span>{statusBadgeLabel}</span>
              </span>
            </div>
            <p className="manage-assignments-subtitle">
              {planName} · {athleteName}
            </p>
          </div>
        </header>

        {/* Selector de sesión horizontal (carrusel accesible) */}
        {flattenedSessions.length > 0 && (
          <div className="adaptation-session-picker-block">
            <div className="adaptation-session-picker-header">
              <div className="adaptation-session-picker-title">
                <Calendar size={16} aria-hidden="true" />
                <span>Seleccionar sesión</span>
              </div>
              <span className="adaptation-session-picker-count">
                {flattenedSessions.length} {flattenedSessions.length === 1 ? 'sesión' : 'sesiones'}
              </span>
            </div>

            <div className="adaptation-session-carousel-wrap">
              {flattenedSessions.length > 3 && (
                <button
                  type="button"
                  className="adaptation-carousel-arrow-btn"
                  onClick={handleScrollPrev}
                  aria-label="Sesión anterior"
                  disabled={isLoading || submitting}
                >
                  <ChevronLeft size={18} />
                </button>
              )}

              <div
                ref={carouselRef}
                className="adaptation-session-carousel-track"
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
                      className={`adaptation-session-card ${isSelected ? 'active' : ''}`}
                      onClick={() => setSelectedSessionId(session.id)}
                      disabled={isLoading || submitting}
                    >
                      <span className="adaptation-session-card-week">Semana {weekNumber}</span>
                      <strong className="adaptation-session-card-name">
                        {session.name || 'Fuerza'}
                      </strong>
                      <span
                        className={`adaptation-session-card-pill ${isSelected ? 'active' : ''}`}
                      >
                        Sesión {session.order ?? 1}
                      </span>
                    </button>
                  );
                })}
              </div>

              {flattenedSessions.length > 3 && (
                <button
                  type="button"
                  className="adaptation-carousel-arrow-btn"
                  onClick={handleScrollNext}
                  aria-label="Sesión siguiente"
                  disabled={isLoading || submitting}
                >
                  <ChevronRight size={18} />
                </button>
              )}
            </div>
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
          <div
            className={`alert-banner ${isRejected ? 'danger' : 'success'}`}
            role="status"
            data-testid="adaptation-action-feedback"
          >
            <span className="plan-inline">
              {isRejected ? (
                <XCircle size={16} aria-hidden="true" />
              ) : (
                <CheckCircle2 size={16} aria-hidden="true" />
              )}
              <span>
                {successMessage}
                {isRejected && rejectionReason.trim()
                  ? ` Motivo: "${rejectionReason.trim()}".`
                  : ''}
              </span>
            </span>
          </div>
        )}

        {/* Contenido principal de la comparativa */}
        {!isLoading && proposal && (
          <div className="adaptation-diff-body">
            {/* Alerta de dato estimado (KAN-465) */}
            {hasEstimatedDataAlert && (
              <div
                className="adaptation-diff-estimated-alert"
                role="alert"
                data-testid="adaptation-estimated-data-alert"
              >
                <div className="adaptation-diff-estimated-alert-header">
                  <AlertTriangle size={16} aria-hidden="true" />
                  <strong>Alerta de dato estimado (1RM no testeado)</strong>
                </div>
                <p className="adaptation-diff-estimated-alert-text">
                  {estimatedRecordsInContext.length > 0 ? (
                    <>
                      {athleteName} registra marcas con origen <strong>Estimado</strong> en:{' '}
                      <strong>
                        {estimatedRecordsInContext
                          .map((r) => `${r.exerciseName} (${r.weightOneRepMaxKg} kg)`)
                          .join(', ')}
                      </strong>
                      . El cálculo de carga aplica automáticamente el{' '}
                      <strong>escalón conservador del {conservativeRecordPercent} %</strong> hasta
                      contar con un testeo directo.
                    </>
                  ) : (
                    estimatedWarningsFromProposal.join(' ')
                  )}
                </p>
              </div>
            )}

            {/* Barra de título: Cambios en la rutina */}
            <div className="adaptation-changes-bar">
              <div className="adaptation-changes-title">
                <ArrowLeftRight size={18} aria-hidden="true" />
                <span>Cambios en la rutina</span>
              </div>
              {hasAdaptations ? (
                <span className="badge badge-success adaptation-count-badge">
                  <Check size={13} aria-hidden="true" />
                  <span>
                    {adaptationChangesCount || 1}{' '}
                    {(adaptationChangesCount || 1) === 1 ? 'adaptación' : 'adaptaciones'}
                  </span>
                </span>
              ) : (
                <span className="badge badge-subtle">Sin adaptaciones</span>
              )}
            </div>

            {/* Panel de Edición de la adaptación (KAN-465) */}
            {isEditing && (
              <div className="adaptation-diff-edit-panel" data-testid="adaptation-edit-panel">
                <div className="adaptation-diff-edit-panel-header">
                  <Edit3 size={15} aria-hidden="true" />
                  <span>Edición manual de la adaptación por el PF</span>
                </div>
                <p className="adaptation-diff-edit-hint">
                  Podés editar la nota técnica, aplicar reducción de carga o cambiar cualquier
                  ejercicio de la variante propuesta directamente en las tarjetas de abajo.
                </p>

                <div className="adaptation-diff-edit-fields">
                  <div className="adaptation-diff-edit-field">
                    <label htmlFor="adaptation-custom-note-input">
                      Nota e indicación técnica para el atleta:
                    </label>
                    <input
                      id="adaptation-custom-note-input"
                      type="text"
                      value={customNote}
                      onChange={(e) => handleNoteChange(e.target.value)}
                      disabled={submitting}
                      placeholder="Indicación médica o ajuste técnico para la sesión..."
                    />
                  </div>

                  <div className="adaptation-diff-edit-field narrow">
                    <label htmlFor="adaptation-load-reduction-input">
                      Reducción de carga (% opcional):
                    </label>
                    <input
                      id="adaptation-load-reduction-input"
                      type="number"
                      min={1}
                      max={100}
                      value={loadReductionPercentage}
                      onChange={(e) => handleLoadReductionChange(e.target.value)}
                      disabled={submitting}
                      placeholder="Ej: 10"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Lista comparativa simplificada y visual (KAN-637) */}
            <div className="adaptation-diff-list" role="list">
              {(baseExercisesList.length > 0 ? baseExercisesList : proposal.exercises).map(
                (baseEx, idx) => {
                  const change = findChangeForBaseExercise(baseEx, idx);
                  const adaptedEx = proposal.exercises[idx] ?? baseEx;

                  if (!change) {
                    const rowKey = baseEx.exerciseId || `${baseEx.exerciseName}-${idx}`;
                    const manualSubId = selectedSubstitutes[rowKey];
                    const isManuallyReplaced = Boolean(
                      manualSubId && manualSubId !== baseEx.exerciseId,
                    );
                    const manualSubName = manualSubId
                      ? (customExerciseNames[manualSubId] ??
                        findRecordForExercise(manualSubId)?.exerciseName ??
                        'Ejercicio seleccionado')
                      : adaptedEx.exerciseName;

                    return (
                      <AdaptationDiffItem
                        key={rowKey}
                        baseEx={baseEx}
                        adaptedEx={adaptedEx}
                        change={null}
                        index={idx}
                        substitutes={[]}
                        chosenId={manualSubId ?? ''}
                        chosenName={manualSubName}
                        isAuthorizedSubstitute={false}
                        isManuallyReplaced={isManuallyReplaced}
                        manualSubId={manualSubId}
                        manualSubName={manualSubName}
                        isEditing={isEditing}
                        submitting={submitting}
                        conservativeRecordPercent={conservativeRecordPercent}
                        findRecordForExercise={findRecordForExercise}
                        renderRecordOriginBadge={renderRecordOriginBadge}
                        formatZoneLabel={formatZoneLabel}
                        onSubstituteChange={handleSubstituteChange}
                        onRestoreBaseExercise={handleRestoreBaseExercise}
                        onOpenPicker={setPickerTarget}
                      />
                    );
                  }

                  const changeKey = change.originalExerciseId || change.originalExerciseName;
                  const substitutes = getAvailableSubstitutes(baseEx, change);
                  const chosenId = selectedSubstitutes[changeKey] || change.finalExerciseId;
                  const customNameForChosen = customExerciseNames[chosenId];
                  const effectiveSubstitutes =
                    customNameForChosen && !substitutes.some((s) => s.exerciseId === chosenId)
                      ? [...substitutes, { exerciseId: chosenId, name: customNameForChosen }]
                      : substitutes;
                  const chosenName =
                    effectiveSubstitutes.find((s) => s.exerciseId === chosenId)?.name ??
                    customNameForChosen ??
                    change.finalExerciseName;
                  const isAuthorizedSubstitute = substitutes.some((s) => s.exerciseId === chosenId);

                  return (
                    <AdaptationDiffItem
                      key={changeKey}
                      baseEx={baseEx}
                      adaptedEx={adaptedEx}
                      change={change}
                      index={idx}
                      substitutes={effectiveSubstitutes}
                      chosenId={chosenId}
                      chosenName={chosenName}
                      isAuthorizedSubstitute={isAuthorizedSubstitute}
                      isManuallyReplaced={false}
                      isEditing={isEditing}
                      submitting={submitting}
                      conservativeRecordPercent={conservativeRecordPercent}
                      findRecordForExercise={findRecordForExercise}
                      renderRecordOriginBadge={renderRecordOriginBadge}
                      formatZoneLabel={formatZoneLabel}
                      onSubstituteChange={handleSubstituteChange}
                      onRestoreBaseExercise={handleRestoreBaseExercise}
                      onOpenPicker={setPickerTarget}
                    />
                  );
                },
              )}
            </div>

            {/* Contexto médico y justificación general colapsable (KAN-637) */}
            <div className="adaptation-diff-context-card">
              <div
                className="adaptation-diff-context-header clickable"
                onClick={() => setShowGeneralJustification((prev) => !prev)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setShowGeneralJustification((prev) => !prev);
                  }
                }}
                aria-expanded={showGeneralJustification}
              >
                <div className="adaptation-diff-context-title">
                  <div className="adaptation-shield-icon-wrap" aria-hidden="true">
                    <ShieldAlert size={16} />
                  </div>
                  <strong>Justificación de la adaptación</strong>
                </div>

                <button
                  type="button"
                  className="adaptation-justification-toggle-text-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowGeneralJustification((prev) => !prev);
                  }}
                >
                  <span>{showGeneralJustification ? 'Ocultar detalle' : 'Ver detalle'}</span>
                  <ChevronDown
                    size={14}
                    className={`adaptation-diff-chevron ${showGeneralJustification ? 'open' : ''}`}
                    aria-hidden="true"
                  />
                </button>
              </div>

              <p className="adaptation-diff-justification-text">
                {cleanJustificationText(proposal.justificationSummary) ||
                  (proposal.adaptationChanges?.length
                    ? proposal.adaptationChanges.map((c) => c.reason).join(' ')
                    : 'Rutina adaptada por razones biomecánicas y de recuperación muscular.')}
              </p>

              <div
                className={`adaptation-general-details ${showGeneralJustification ? 'is-expanded' : 'is-collapsed'}`}
              >
                {activeInjuries.length > 0 && (
                  <div className="adaptation-diff-injury-tags">
                    {activeInjuries.map((injury) => (
                      <span key={injury.id} className="badge adaptation-diff-injury-badge">
                        Lesión activa: {formatZoneLabel(injury.zone)}
                        {injury.description ? ` · ${injury.description}` : ''}
                      </span>
                    ))}
                  </div>
                )}
                <div className="adaptation-ai-provider-note">
                  <span>
                    Criterio y reglas aplicadas: <strong>{proposal.aiProvider}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Formulario opcional de motivo de rechazo (KAN-465) */}
            {showRejectForm && (
              <div className="adaptation-diff-reject-box" data-testid="adaptation-reject-form">
                <label htmlFor="adaptation-reject-reason-input">
                  Motivo de rechazo (opcional):
                </label>
                <input
                  id="adaptation-reject-reason-input"
                  type="text"
                  placeholder="Ej: Es molestia leve, mantener la rutina base con supervisión..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  disabled={submitting}
                />
                <div className="adaptation-diff-reject-actions">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setShowRejectForm(false)}
                    disabled={submitting}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={handleRejectAdaptation}
                    disabled={submitting}
                  >
                    <XCircle size={14} aria-hidden="true" />
                    <span>Confirmar rechazo</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Pie del modal estructurado según imagen adjunta (KAN-637) */}
        <footer className="adaptation-modal-footer">
          {!isLoading && proposal && (
            <>
              {/* Botón principal superior de ancho completo */}
              <button
                type="button"
                className="btn btn-primary adaptation-approve-main-btn"
                onClick={handleApproveAdaptation}
                disabled={submitting || (!hasAdaptations && isApproved && !hasEdited)}
                aria-label="Aprobar adaptación"
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="plan-spin" aria-hidden="true" />
                    <span>Aprobando…</span>
                  </>
                ) : isApproved && !hasEdited ? (
                  <>
                    <RefreshCw size={16} aria-hidden="true" />
                    <span>Actualizar adaptación</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} aria-hidden="true" />
                    <span>Aprobar adaptación</span>
                  </>
                )}
              </button>

              {/* Fila secundaria inferior: Editar y Rechazar */}
              <div className="adaptation-secondary-actions-row">
                <button
                  type="button"
                  className={`btn btn-secondary adaptation-edit-toggle-btn ${isEditing ? 'active' : ''}`}
                  onClick={() => {
                    setIsEditing((prev) => !prev);
                    setShowRejectForm(false);
                  }}
                  disabled={submitting}
                  aria-label="Editar adaptación"
                >
                  <Edit3 size={15} aria-hidden="true" />
                  <span>{isEditing ? 'Ocultar edición' : 'Editar adaptación'}</span>
                </button>

                {!showRejectForm && !isRejected && (
                  <button
                    type="button"
                    className="btn btn-secondary adaptation-reject-trigger-btn"
                    onClick={() => {
                      setShowRejectForm(true);
                      setIsEditing(false);
                    }}
                    disabled={submitting}
                    aria-label="Rechazar adaptación"
                  >
                    <X size={15} aria-hidden="true" />
                    <span>Rechazar adaptación</span>
                  </button>
                )}
              </div>
            </>
          )}
        </footer>
      </div>

      {pickerTarget && (
        <div className="adaptation-diff-picker-layer" onClick={(e) => e.stopPropagation()}>
          <ExercisePickerModal
            title={`Elegir reemplazo para ${pickerTarget.originalExerciseName}`}
            excludedIds={
              pickerTarget.originalExerciseId ? [pickerTarget.originalExerciseId] : undefined
            }
            onClose={() => setPickerTarget(null)}
            onSelect={handleSelectCatalogExercise}
          />
        </div>
      )}
    </div>
  );

  return createPortal(modalContent, document.body);
};
