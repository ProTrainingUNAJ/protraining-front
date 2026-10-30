import React, { useState, useEffect, useMemo } from 'react';
import { Trophy, Dumbbell, AlertCircle, CheckCircle2, X, Sparkles, Info } from 'lucide-react';
import type { TodayRoutineExercise } from '../../api/generated/entrenamiento';
import { todayRoutineService } from '../../api/todayRoutine';
import { calculateEpley } from '../../utils/epley';

export interface RecordPerformedSetModalProps {
  exercise: TodayRoutineExercise;
  initialWeight?: number | null;
  initialReps?: number | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: {
    exerciseId: string;
    weight: number;
    reps: number;
    proposalsGenerated: number;
  }) => void;
}

export function RecordPerformedSetModal({
  exercise,
  initialWeight,
  initialReps,
  isOpen,
  onClose,
  onSuccess,
}: RecordPerformedSetModalProps) {
  // Precarga con lo prescripto o lo previamente registrado
  const defaultWeight = initialWeight ?? exercise.weightKg ?? 0;
  const defaultReps = initialReps ?? exercise.reps ?? 1;

  const [weight, setWeight] = useState<number>(defaultWeight);
  const [reps, setReps] = useState<number>(defaultReps);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Cerrar con Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Cálculo de Epley en tiempo real
  const epley = useMemo(() => {
    return calculateEpley(weight, reps, exercise.current1RmKg);
  }, [weight, reps, exercise.current1RmKg]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (weight <= 0) {
      setErrorMessage('Ingresá un peso válido mayor a 0 kg.');
      return;
    }

    if (reps < 1) {
      setErrorMessage('Ingresá al menos 1 repetición realizada.');
      return;
    }

    if (!exercise.exerciseId) {
      setErrorMessage('Identificador de ejercicio no disponible.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await todayRoutineService.recordSets([
        {
          exerciseId: exercise.exerciseId,
          weight,
          reps,
        },
      ]);

      onSuccess({
        exerciseId: exercise.exerciseId,
        weight,
        reps,
        proposalsGenerated: response.proposalsGeneratedCount,
      });
      onClose();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Error al registrar la serie.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="routine-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="record-set-title"
    >
      <div className="routine-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Cabecera */}
        <div className="routine-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              className="routine-exercise-icon-badge"
              style={{ width: '38px', height: '38px', borderRadius: '10px' }}
            >
              <Trophy size={18} />
            </div>
            <div>
              <h3 id="record-set-title" className="routine-modal-title">
                Registrar lo que hice
              </h3>
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                {exercise.name} {exercise.muscleGroup ? `· ${exercise.muscleGroup}` : ''}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="routine-modal-close-btn"
            onClick={onClose}
            aria-label="Cerrar modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="routine-modal-body">
            {/* Prescripción de referencia */}
            <div className="routine-prescribed-ref-box">
              <span className="routine-prescribed-label">Prescripción para hoy:</span>
              <span className="routine-prescribed-val">
                {exercise.sets} series × {exercise.reps} reps
                {exercise.weightKg !== null && exercise.weightKg !== undefined
                  ? ` con ${exercise.weightKg} kg`
                  : ' (Carga libre)'}
                {exercise.current1RmKg !== null && exercise.current1RmKg !== undefined
                  ? ` · 1RM vigente: ${exercise.current1RmKg} kg`
                  : ''}
              </span>
            </div>

            {/* Inputs de peso y repeticiones */}
            <div className="routine-record-inputs-grid">
              <div className="routine-record-input-group">
                <label htmlFor="record-weight-input" className="routine-record-label">
                  <Dumbbell size={15} />
                  <span>Kilos levantados (kg)</span>
                </label>
                <div className="routine-record-input-wrapper">
                  <input
                    id="record-weight-input"
                    type="number"
                    step="0.5"
                    min="0"
                    max="1000"
                    value={weight || ''}
                    onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
                    className="routine-record-input"
                    placeholder="Ej. 90"
                    required
                  />
                  <span className="routine-record-input-unit">kg</span>
                </div>
                <small className="routine-record-hint">
                  Precargado con el peso prescripto ({exercise.weightKg ?? 0} kg)
                </small>
              </div>

              <div className="routine-record-input-group">
                <label htmlFor="record-reps-input" className="routine-record-label">
                  <Sparkles size={15} />
                  <span>Repeticiones completadas</span>
                </label>
                <div className="routine-record-input-wrapper">
                  <input
                    id="record-reps-input"
                    type="number"
                    step="1"
                    min="1"
                    max="50"
                    value={reps || ''}
                    onChange={(e) => setReps(parseInt(e.target.value, 10) || 0)}
                    className="routine-record-input"
                    placeholder="Ej. 6"
                    required
                  />
                  <span className="routine-record-input-unit">reps</span>
                </div>
                <small className="routine-record-hint">
                  Precargado con las repeticiones prescriptas ({exercise.reps})
                </small>
              </div>
            </div>

            {/* Panel de Cálculo de Epley en tiempo real */}
            <div className="routine-epley-box">
              <div className="routine-epley-header">
                <div className="routine-epley-title">
                  <Trophy size={16} />
                  <span>Cálculo de 1RM estimado (Algoritmo Epley)</span>
                </div>
                {reps >= 1 && reps <= 10 && (
                  <span className="badge badge-info">1 a 10 reps válidas</span>
                )}
              </div>

              {reps > 10 && (
                <div className="routine-epley-warning">
                  <Info size={17} style={{ flexShrink: 0 }} />
                  <div>
                    <strong>Más de 10 repeticiones</strong>
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem' }}>
                      La fórmula de Epley pierde precisión con más de 10 repeticiones, por lo que no
                      se calcula 1RM estimado ni se generará propuesta de récord.
                    </p>
                  </div>
                </div>
              )}

              {reps >= 1 && reps <= 10 && epley.estimated1Rm !== null && (
                <div className="routine-epley-stats-row">
                  <div className="routine-epley-stat-card">
                    <span className="routine-epley-stat-label">1RM Estimado (Epley)</span>
                    <span className="routine-epley-stat-number">{epley.estimated1Rm} kg</span>
                    <span className="routine-epley-stat-desc">peso × (1 + reps / 30)</span>
                  </div>

                  <div className="routine-epley-stat-card highlight">
                    <span className="routine-epley-stat-label">Propuesta de Récord</span>
                    <span className="routine-epley-stat-number">{epley.proposedWeight} kg</span>
                    <span className="routine-epley-stat-desc">
                      Escalón conservador (múltiplo 2.5 kg)
                    </span>
                  </div>
                </div>
              )}

              {/* Mensaje de comparación con récord vigente */}
              {reps >= 1 && reps <= 10 && (
                <div
                  className={`routine-epley-verdict ${
                    epley.isEligibleForProposal
                      ? 'success'
                      : exercise.current1RmKg
                        ? 'neutral'
                        : 'subtle'
                  }`}
                >
                  {epley.isEligibleForProposal ? (
                    <>
                      <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
                      <div>
                        <strong>¡Supera tu récord vigente de {exercise.current1RmKg} kg!</strong>
                        <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem' }}>
                          Se creará una propuesta pendiente de{' '}
                          <strong>{epley.proposedWeight} kg</strong> para tu preparador físico. Tu
                          récord vigente no se modificará hasta que el PF lo apruebe.
                        </p>
                      </div>
                    </>
                  ) : exercise.current1RmKg ? (
                    <>
                      <Info size={18} style={{ flexShrink: 0 }} />
                      <div>
                        <span>
                          Tu récord vigente es de <strong>{exercise.current1RmKg} kg</strong>. La
                          propuesta ({epley.proposedWeight} kg) no supera tu récord actual, por lo
                          que no se creará ninguna propuesta.
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <Info size={18} style={{ flexShrink: 0 }} />
                      <div>
                        <span>
                          Sin récord vigente previo. El primer récord lo registra tu preparador
                          físico, por lo que no se generará propuesta automática.
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Mensaje de error de la API si lo hay */}
            {errorMessage && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.85rem 1rem',
                  borderRadius: '12px',
                  background: 'var(--danger-bg)',
                  border: '1px solid var(--danger-border)',
                  color: 'var(--danger-text)',
                  fontSize: '0.86rem',
                }}
              >
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>

          {/* Pie de modal */}
          <div className="routine-modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting || weight <= 0 || reps < 1}
              style={{ gap: '0.45rem' }}
            >
              {isSubmitting ? (
                <>
                  <div
                    style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      border: '2px solid var(--on-primary)',
                      borderTopColor: 'transparent',
                      animation: 'spin 0.6s linear infinite',
                    }}
                  />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Trophy size={16} />
                  <span>Confirmar y registrar</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
