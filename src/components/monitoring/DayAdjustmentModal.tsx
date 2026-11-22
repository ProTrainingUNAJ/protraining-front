import React, { useState, useEffect } from 'react';
import {
  X,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import { dayAdjustmentsService, type DayAdjustmentResponse } from '../../api/dayAdjustments';

interface DayAdjustmentModalProps {
  athleteId: string;
  athleteName: string;
  isOpen: boolean;
  onClose: () => void;
  onAdjustmentApplied?: (adjustment: DayAdjustmentResponse) => void;
}

export const DayAdjustmentModal: React.FC<DayAdjustmentModalProps> = ({
  athleteId,
  athleteName,
  isOpen,
  onClose,
  onAdjustmentApplied,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [proposal, setProposal] = useState<DayAdjustmentResponse | null>(null);

  // Mapa de ejercicio original -> id del sustituto seleccionado
  const [selectedSubstitutes, setSelectedSubstitutes] = useState<Record<string, string>>({});
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [showRejectForm, setShowRejectForm] = useState<boolean>(false);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !athleteId) return;

    let active = true;
    const timer = setTimeout(() => {
      if (!active) return;
      setLoading(true);
      setError(null);
      setActionSuccess(null);
      setShowRejectForm(false);
      setRejectionReason('');

      dayAdjustmentsService
        .createOrGetDayAdjustment(athleteId)
        .then((data) => {
          if (!active) return;
          setProposal(data);
          // Inicializar los sustitutos elegidos con el sustituto sugerido por defecto
          const initialMap: Record<string, string> = {};
          data.items?.forEach((item) => {
            initialMap[item.originalExerciseId] = item.substituteExerciseId;
          });
          setSelectedSubstitutes(initialMap);
          setLoading(false);
        })
        .catch((err: unknown) => {
          if (!active) return;
          setError(err instanceof Error ? err.message : 'Error al obtener la propuesta de ajuste.');
          setLoading(false);
        });
    }, 0);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [isOpen, athleteId]);

  if (!isOpen) return null;

  const handleSubstituteChange = (originalExerciseId: string, newSubstituteId: string) => {
    setSelectedSubstitutes((prev) => ({
      ...prev,
      [originalExerciseId]: newSubstituteId,
    }));
  };

  const handleApprove = async () => {
    if (!proposal) return;
    setSubmitting(true);
    setError(null);

    try {
      // Armamos el payload con los cambios si el PF modificó algún sustituto
      const overrides = Object.entries(selectedSubstitutes).map(
        ([originalExerciseId, substituteExerciseId]) => ({
          originalExerciseId,
          substituteExerciseId,
        }),
      );

      const updated = await dayAdjustmentsService.approveDayAdjustment(proposal.id, {
        items: overrides,
      });

      setProposal(updated);
      setActionSuccess('¡Ajuste del día aprobado y aplicado en la rutina del atleta con éxito!');
      onAdjustmentApplied?.(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al aprobar el ajuste.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!proposal) return;
    setSubmitting(true);
    setError(null);

    try {
      const updated = await dayAdjustmentsService.rejectDayAdjustment(proposal.id, {
        reason: rejectionReason.trim() || undefined,
      });

      setProposal(updated);
      setActionSuccess(
        'La propuesta de ajuste fue rechazada. La rutina del atleta se mantiene intacta.',
      );
      onAdjustmentApplied?.(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al rechazar el ajuste.');
    } finally {
      setSubmitting(false);
    }
  };

  const isPending = proposal?.status === 'Pending';
  const isApproved = proposal?.status === 'Approved';
  const isRejected = proposal?.status === 'Rejected';
  const statusBadgeModifier = isApproved
    ? 'day-adjustment-status-badge--approved'
    : isRejected
      ? 'day-adjustment-status-badge--rejected'
      : 'day-adjustment-status-badge--pending';

  return (
    <div
      className="day-adjustment-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="day-adjustment-title"
    >
      <div
        className="card day-adjustment-modal"
        onClick={(e) => e.stopPropagation()}
        data-testid="day-adjustment-modal"
      >
        {/* Encabezado */}
        <div className="day-adjustment-header">
          <div className="day-adjustment-header-info">
            <div className="day-adjustment-header-icon">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 id="day-adjustment-title" className="day-adjustment-title">
                Ajuste Sugerido del Día
              </h3>
              <p className="day-adjustment-subtitle">
                Atleta: <strong>{athleteName}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            className="day-adjustment-close-btn"
            onClick={onClose}
            aria-label="Cerrar ajuste sugerido"
          >
            <X size={20} />
          </button>
        </div>

        {/* Estado de carga */}
        {loading && (
          <div className="day-adjustment-loading">
            <Loader2 size={28} className="animate-spin" />
            <span className="day-adjustment-loading-text">
              Generando y evaluando propuesta de ajuste del día...
            </span>
          </div>
        )}

        {/* Mensaje de Error */}
        {!loading && error && (
          <div role="alert" className="day-adjustment-feedback day-adjustment-feedback--error">
            <AlertTriangle size={18} className="day-adjustment-feedback-icon" />
            <span>{error}</span>
          </div>
        )}

        {/* Mensaje de Éxito de Acción */}
        {!loading && actionSuccess && (
          <div role="status" className="day-adjustment-feedback day-adjustment-feedback--success">
            <CheckCircle2 size={18} className="day-adjustment-feedback-icon" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* Detalle de la propuesta */}
        {!loading && proposal && (
          <div className="day-adjustment-body">
            {/* Justificación generada */}
            <div className="day-adjustment-justification-box">
              <div className="day-adjustment-justification-header">
                <span className="day-adjustment-section-label">
                  Justificación Técnica ({proposal.provider})
                </span>

                <span className={`badge day-adjustment-status-badge ${statusBadgeModifier}`}>
                  {isApproved ? 'Aprobada' : isRejected ? 'Rechazada' : 'Pendiente de aprobación'}
                </span>
              </div>
              <p className="day-adjustment-justification-text">"{proposal.justification}"</p>
              {proposal.rejectionReason && (
                <p className="day-adjustment-rejection-note">
                  Motivo de rechazo: {proposal.rejectionReason}
                </p>
              )}
            </div>

            {/* Ejercicios en conflicto y sustitutos */}
            <div className="day-adjustment-items">
              <span className="day-adjustment-items-title">
                Ejercicios adaptados por zona de dolor
              </span>

              {proposal.items.map((item) => {
                const currentChosenId =
                  selectedSubstitutes[item.originalExerciseId] || item.substituteExerciseId;
                const currentChosenName =
                  item.availableSubstitutes?.find((s) => s.exerciseId === currentChosenId)?.name ??
                  item.substituteExerciseName;

                return (
                  <div key={item.originalExerciseId} className="day-adjustment-item-card">
                    {/* Header de la sustitución: Original -> Sustituto */}
                    <div className="day-adjustment-item-header">
                      <div className="day-adjustment-swap">
                        <span className="day-adjustment-original-name">
                          {item.originalExerciseName}
                        </span>
                        <ArrowRight size={15} className="day-adjustment-swap-arrow" />
                        <span className="day-adjustment-substitute-name">{currentChosenName}</span>
                      </div>

                      <div className="day-adjustment-pain-wrap">
                        <span className="badge day-adjustment-pain-badge">
                          Dolor {item.zone} ({item.painLevel}/5)
                        </span>
                      </div>
                    </div>

                    {/* Motivo biomecánico */}
                    <p className="day-adjustment-item-reason">
                      <strong>Motivo:</strong> {item.reason}
                    </p>

                    {/* Selector de sustituto disponible (habilitado solo en Pending) */}
                    {isPending &&
                      item.availableSubstitutes &&
                      item.availableSubstitutes.length > 0 && (
                        <div className="day-adjustment-selector-row">
                          <label
                            htmlFor={`substitute-select-${item.originalExerciseId}`}
                            className="day-adjustment-selector-label"
                          >
                            Cambiar sustituto:
                          </label>
                          <div className="day-adjustment-select-wrap">
                            <select
                              id={`substitute-select-${item.originalExerciseId}`}
                              className="day-adjustment-select"
                              value={currentChosenId}
                              onChange={(e) =>
                                handleSubstituteChange(item.originalExerciseId, e.target.value)
                              }
                              disabled={submitting}
                            >
                              {item.availableSubstitutes.map((sub) => (
                                <option key={sub.exerciseId} value={sub.exerciseId}>
                                  {sub.name}
                                  {sub.exerciseId === item.suggestedSubstituteExerciseId
                                    ? ' (Sugerido por reglas)'
                                    : ''}
                                </option>
                              ))}
                            </select>
                            <ChevronDown size={14} className="day-adjustment-select-chevron" />
                          </div>
                        </div>
                      )}
                  </div>
                );
              })}
            </div>

            {/* Formulario opcional de motivo de rechazo */}
            {isPending && showRejectForm && (
              <div className="day-adjustment-reject-form">
                <label htmlFor="reject-reason-input" className="day-adjustment-reject-label">
                  Motivo de rechazo (opcional):
                </label>
                <input
                  id="reject-reason-input"
                  className="day-adjustment-reject-input"
                  type="text"
                  placeholder="Ej: Es molestia leve, mantener la planificación original..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  disabled={submitting}
                />
              </div>
            )}
          </div>
        )}

        {/* Acciones del pie */}
        <div className="day-adjustment-footer">
          {isPending ? (
            <>
              {!showRejectForm ? (
                <button
                  type="button"
                  className="btn btn-secondary day-adjustment-btn-reject-toggle"
                  onClick={() => setShowRejectForm(true)}
                  disabled={submitting}
                >
                  Rechazar...
                </button>
              ) : (
                <button
                  type="button"
                  className="btn day-adjustment-btn-reject-confirm"
                  onClick={handleReject}
                  disabled={submitting}
                >
                  {submitting ? 'Rechazando...' : 'Confirmar Rechazo'}
                </button>
              )}

              <button
                type="button"
                className="btn btn-primary day-adjustment-btn-approve"
                onClick={handleApprove}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Aplicando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Aprobar Ajuste</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn btn-secondary day-adjustment-btn-close"
              onClick={onClose}
            >
              Cerrar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
