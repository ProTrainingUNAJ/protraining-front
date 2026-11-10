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
import {
  dayAdjustmentsService,
  type DayAdjustmentResponse,
} from '../../api/dayAdjustments';

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
      setActionSuccess('La propuesta de ajuste fue rechazada. La rutina del atleta se mantiene intacta.');
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

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--routine-modal-overlay)',
        zIndex: 1200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="day-adjustment-title"
    >
      <div
        className="card"
        style={{
          margin: 0,
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
          borderRadius: '20px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-lg)',
          overflowY: 'auto',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.15rem',
        }}
        onClick={(e) => e.stopPropagation()}
        data-testid="day-adjustment-modal"
      >
        {/* Encabezado */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border)',
            paddingBottom: '0.85rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'var(--traffic-yellow-bg)',
                color: 'var(--traffic-yellow-text)',
                border: '1px solid var(--traffic-yellow-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Sparkles size={20} />
            </div>
            <div>
              <h3
                id="day-adjustment-title"
                style={{
                  margin: 0,
                  fontSize: '1.15rem',
                  fontWeight: 800,
                  color: 'var(--text-main)',
                }}
              >
                Ajuste Sugerido del Día
              </h3>
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Atleta: <strong>{athleteName}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '0.35rem',
              borderRadius: '8px',
            }}
            aria-label="Cerrar ajuste sugerido"
          >
            <X size={20} />
          </button>
        </div>

        {/* Estado de carga */}
        {loading && (
          <div
            style={{
              padding: '2.5rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.75rem',
              color: 'var(--text-muted)',
            }}
          >
            <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
              Generando y evaluando propuesta de ajuste del día...
            </span>
          </div>
        )}

        {/* Mensaje de Error */}
        {!loading && error && (
          <div
            role="alert"
            style={{
              padding: '0.85rem 1.1rem',
              borderRadius: '12px',
              background: 'var(--danger-bg)',
              border: '1px solid var(--danger-border)',
              color: 'var(--danger-text)',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
            }}
          >
            <AlertTriangle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Mensaje de Éxito de Acción */}
        {!loading && actionSuccess && (
          <div
            role="status"
            style={{
              padding: '0.85rem 1.1rem',
              borderRadius: '12px',
              background: 'var(--success-bg)',
              border: '1px solid var(--success-border)',
              color: 'var(--success-text)',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
            }}
          >
            <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* Detalle de la propuesta */}
        {!loading && proposal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Justificación generada */}
            <div
              style={{
                padding: '0.9rem 1.1rem',
                borderRadius: '12px',
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '0.35rem',
                }}
              >
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    color: 'var(--text-muted)',
                    letterSpacing: '0.02em',
                  }}
                >
                  Justificación Técnica ({proposal.provider})
                </span>

                <span
                  className="badge"
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    background: isApproved
                      ? 'var(--success-bg)'
                      : isRejected
                        ? 'var(--danger-bg)'
                        : 'var(--traffic-yellow-bg)',
                    color: isApproved
                      ? 'var(--success-text)'
                      : isRejected
                        ? 'var(--danger-text)'
                        : 'var(--traffic-yellow-text)',
                    border: `1px solid ${
                      isApproved
                        ? 'var(--success-border)'
                        : isRejected
                          ? 'var(--danger-border)'
                          : 'var(--traffic-yellow-border)'
                    }`,
                  }}
                >
                  {isApproved ? 'Aprobada' : isRejected ? 'Rechazada' : 'Pendiente de aprobación'}
                </span>
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: '0.88rem',
                  lineHeight: 1.45,
                  color: 'var(--text-main)',
                  fontWeight: 600,
                }}
              >
                "{proposal.justification}"
              </p>
              {proposal.rejectionReason && (
                <p
                  style={{
                    margin: '0.45rem 0 0',
                    fontSize: '0.82rem',
                    color: 'var(--danger-text)',
                    fontStyle: 'italic',
                  }}
                >
                  Motivo de rechazo: {proposal.rejectionReason}
                </p>
              )}
            </div>

            {/* Ejercicios en conflicto y sustitutos */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <span
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                }}
              >
                Ejercicios adaptados por zona de dolor
              </span>

              {proposal.items.map((item) => {
                const currentChosenId =
                  selectedSubstitutes[item.originalExerciseId] || item.substituteExerciseId;
                const currentChosenName =
                  item.availableSubstitutes?.find((s) => s.exerciseId === currentChosenId)?.name ??
                  item.substituteExerciseName;

                return (
                  <div
                    key={item.originalExerciseId}
                    style={{
                      padding: '1rem',
                      borderRadius: '14px',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                    }}
                  >
                    {/* Header de la sustitución: Original -> Sustituto */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '0.5rem',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          flexWrap: 'wrap',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '0.92rem',
                            fontWeight: 700,
                            color: 'var(--text-muted)',
                            textDecoration: 'line-through',
                          }}
                        >
                          {item.originalExerciseName}
                        </span>
                        <ArrowRight size={15} style={{ color: 'var(--secondary)' }} />
                        <span
                          style={{
                            fontSize: '0.95rem',
                            fontWeight: 800,
                            color: 'var(--text-main)',
                          }}
                        >
                          {currentChosenName}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span
                          className="badge"
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            background: 'var(--danger-bg)',
                            color: 'var(--danger-text)',
                            border: '1px solid var(--danger-border)',
                          }}
                        >
                          Dolor {item.zone} ({item.painLevel}/5)
                        </span>
                      </div>
                    </div>

                    {/* Motivo biomecánico */}
                    <p
                      style={{
                        margin: 0,
                        fontSize: '0.82rem',
                        color: 'var(--text-muted)',
                        lineHeight: 1.35,
                      }}
                    >
                      <strong>Motivo:</strong> {item.reason}
                    </p>

                    {/* Selector de sustituto disponible (habilitado solo en Pending) */}
                    {isPending && item.availableSubstitutes && item.availableSubstitutes.length > 0 && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          marginTop: '0.2rem',
                        }}
                      >
                        <label
                          htmlFor={`substitute-select-${item.originalExerciseId}`}
                          style={{
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            color: 'var(--text-muted)',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Cambiar sustituto:
                        </label>
                        <div style={{ position: 'relative', flex: 1 }}>
                          <select
                            id={`substitute-select-${item.originalExerciseId}`}
                            value={currentChosenId}
                            onChange={(e) =>
                              handleSubstituteChange(item.originalExerciseId, e.target.value)
                            }
                            disabled={submitting}
                            style={{
                              width: '100%',
                              padding: '0.4rem 2rem 0.4rem 0.75rem',
                              borderRadius: '8px',
                              border: '1px solid var(--border)',
                              background: 'var(--bg-subtle)',
                              color: 'var(--text-main)',
                              fontSize: '0.82rem',
                              fontWeight: 700,
                              appearance: 'none',
                              cursor: 'pointer',
                            }}
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
                          <ChevronDown
                            size={14}
                            style={{
                              position: 'absolute',
                              right: '0.65rem',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              pointerEvents: 'none',
                              color: 'var(--text-muted)',
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Formulario opcional de motivo de rechazo */}
            {isPending && showRejectForm && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem',
                  padding: '0.85rem',
                  borderRadius: '12px',
                  background: 'var(--danger-bg)',
                  border: '1px solid var(--danger-border)',
                }}
              >
                <label
                  htmlFor="reject-reason-input"
                  style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--danger-text)' }}
                >
                  Motivo de rechazo (opcional):
                </label>
                <input
                  id="reject-reason-input"
                  type="text"
                  placeholder="Ej: Es molestia leve, mantener la planificación original..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  disabled={submitting}
                  style={{
                    padding: '0.45rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--danger-border)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    fontSize: '0.82rem',
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Acciones del pie */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '0.65rem',
            borderTop: '1px solid var(--border)',
            paddingTop: '0.85rem',
            flexWrap: 'wrap',
          }}
        >
          {isPending ? (
            <>
              {!showRejectForm ? (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowRejectForm(true)}
                  disabled={submitting}
                  style={{
                    padding: '0.55rem 1rem',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: 'var(--danger-text)',
                  }}
                >
                  Rechazar...
                </button>
              ) : (
                <button
                  type="button"
                  className="btn"
                  onClick={handleReject}
                  disabled={submitting}
                  style={{
                    padding: '0.55rem 1rem',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    background: 'var(--traffic-red)',
                    color: 'var(--white)',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: 'pointer',
                  }}
                >
                  {submitting ? 'Rechazando...' : 'Confirmar Rechazo'}
                </button>
              )}

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleApprove}
                disabled={submitting}
                style={{
                  padding: '0.55rem 1.25rem',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                {submitting ? (
                  <>
                    <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
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
              className="btn btn-secondary"
              onClick={onClose}
              style={{
                padding: '0.55rem 1.25rem',
                fontSize: '0.85rem',
                fontWeight: 700,
              }}
            >
              Cerrar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
