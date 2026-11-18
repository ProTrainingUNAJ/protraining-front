import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Award,
  Clock,
  Dumbbell,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Flame,
  ArrowRight,
} from 'lucide-react';
import { MuscleMapFront } from '../athlete/MuscleMapFront';
import { MuscleMapBack } from '../athlete/MuscleMapBack';
import { ConfettiCelebration } from '../athlete/checkin/ConfettiCelebration';
import { extractSessionMuscles } from '../../utils/sessionMuscles';
import {
  submitDailyLoad,
  getDailyLoad,
  type DailyLoadSubmitResponse,
  type DailyLoadSubmitRequest,
} from '../../api/seguimientoService';
import type { TodayRoutineExercise } from '../../api/generated/entrenamiento';
import { RPE_LEVELS_META, formatMmSs, parseMmSs } from './finishRoutineUtils';

export interface FinishRoutineModalProps {
  isOpen: boolean;
  onClose: () => void;
  athleteId: string;
  timerSeconds: number;
  exercises: TodayRoutineExercise[];
  onFinishSuccess?: (result: DailyLoadSubmitResponse) => void;
}

export const FinishRoutineModal: React.FC<FinishRoutineModalProps> = ({
  isOpen,
  onClose,
  athleteId,
  timerSeconds,
  exercises,
  onFinishSuccess,
}) => {
  // Tiempo vinculado al cronómetro: precargado automáticamente y mostrado en formato centrado 00:00
  const initialSeconds = timerSeconds > 0 ? timerSeconds : 3600;
  const [totalSeconds, setTotalSeconds] = useState<number>(initialSeconds);
  const [timeInputValue, setTimeInputValue] = useState<string>(() => formatMmSs(initialSeconds));
  const [rpe, setRpe] = useState<number>(7);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [savedResponse, setSavedResponse] = useState<DailyLoadSubmitResponse | null>(null);

  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (prevIsOpen !== isOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      const initSec = timerSeconds > 0 ? timerSeconds : 3600;
      setTotalSeconds(initSec);
      setTimeInputValue(formatMmSs(initSec));
      setIsCompleted(false);
      setErrorMessage(null);
    }
  }

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTimeInputValue(val);
    const parsed = parseMmSs(val);
    setTotalSeconds(parsed);
  };

  const handleTimeBlur = () => {
    setTimeInputValue(formatMmSs(totalSeconds));
  };

  const stepSeconds = totalSeconds < 60 ? 15 : 60;
  const stepLabel = totalSeconds < 60 ? '15 s' : '1 min';

  const handleSubtractTime = () => {
    const next = Math.max(1, totalSeconds - stepSeconds);
    setTotalSeconds(next);
    setTimeInputValue(formatMmSs(next));
  };

  const handleAddTime = () => {
    const next = Math.min(21600, totalSeconds + stepSeconds);
    setTotalSeconds(next);
    setTimeInputValue(formatMmSs(next));
  };

  // Músculos involucrados en la sesión
  const { highlight, muscleNames } = useMemo(() => extractSessionMuscles(exercises), [exercises]);

  // Cerrar modal con tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  // Minutos equivalentes para el registro y cálculo de Foster (mínimo 1 minuto entero para sesiones breves)
  const effectiveMinutes = Math.max(1, Math.round(totalSeconds / 60));

  // Cálculo en vivo de Unidades Arbitrarias (Foster: UA = min × RPE)
  const calculatedUa = Math.round(effectiveMinutes * (rpe || 0));

  // Nivel de UA para la barra (escala habitual 0 a 600 UA de referencia de sesión)
  const uaPercent = Math.min(100, Math.max(5, Math.round((calculatedUa / 600) * 100)));

  const activeRpeMeta = RPE_LEVELS_META[rpe] || RPE_LEVELS_META[7];

  const handleConfirm = async () => {
    setErrorMessage(null);

    if (totalSeconds <= 0) {
      setErrorMessage('El tiempo de entrenamiento debe ser mayor a 00:00.');
      return;
    }

    if (!rpe || rpe < 1 || rpe > 10) {
      setErrorMessage('Por favor seleccioná el esfuerzo percibido (RPE de 1 a 10).');
      return;
    }

    setIsSubmitting(true);
    try {
      // Consultar carga previa para preservar actividades si las hubiera
      let previous = null;
      try {
        previous = await getDailyLoad(athleteId);
      } catch {
        // Ignorar si no existe carga previa
      }

      const payload: DailyLoadSubmitRequest = {
        gym: { minutes: effectiveMinutes, rpe },
        sportTraining: previous?.sportTraining,
        match1: previous?.match1,
        match2: previous?.match2,
        individualWork: previous?.individualWork,
      };

      const response = await submitDailyLoad(athleteId, payload);
      setSavedResponse(response);
      setIsCompleted(true);
      onFinishSuccess?.(response);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Error al guardar la carga del entrenamiento.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalContent = (
    <div
      className="finish-routine-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="finish-routine-modal-title"
    >
      {/* ── Disparo de Confeti al Completar Exitosamente ── */}
      {isCompleted && <ConfettiCelebration durationMs={4500} particleCount={160} />}

      <div className="finish-routine-modal-card">
        {/* Botón de cierre */}
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="routine-finish-modal-close"
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '0.35rem',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label="Cerrar ventana"
        >
          <X size={20} />
        </button>

        {!isCompleted ? (
          /* ════════════ PASO 1: FORMULARIO DE REGISTRO ════════════ */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Cabecera */}
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  marginBottom: '0.35rem',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'var(--info-bg)',
                    color: 'var(--secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Dumbbell size={20} />
                </div>
                <h3
                  id="finish-routine-modal-title"
                  style={{
                    margin: 0,
                    fontSize: '1.25rem',
                    fontWeight: 900,
                    color: 'var(--text-main)',
                  }}
                >
                  Finalizar entrenamiento
                </h3>
              </div>
              <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-muted)' }}>
                Registrá tu tiempo y esfuerzo para calcular tus Unidades Arbitrarias (UA) y
                sincronizarlas con tu preparador físico.
              </p>
            </div>

            {/* SECCIÓN 1: MÚSCULOS QUE TRABAJARON */}
            <div
              style={{
                background: 'var(--bg-subtle)',
                borderRadius: '14px',
                border: '1px solid var(--border)',
                padding: '1rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.75rem',
                }}
              >
                <span
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    color: 'var(--text-main)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <Flame size={16} style={{ color: 'var(--secondary)' }} />
                  <span>Músculos que trabajaron hoy</span>
                </span>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                  }}
                >
                  {muscleNames.length} grupos
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '1.5rem',
                  padding: '0.5rem 0',
                }}
              >
                <div style={{ width: '64px', height: '110px' }}>
                  <MuscleMapFront
                    readOnly={true}
                    hideHeader={true}
                    hideFooter={true}
                    muscleColors={highlight.muscleColors}
                  />
                </div>
                <div style={{ width: '64px', height: '110px' }}>
                  <MuscleMapBack
                    readOnly={true}
                    hideHeader={true}
                    hideFooter={true}
                    muscleColors={highlight.muscleColors}
                  />
                </div>
              </div>

              {muscleNames.length > 0 && (
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.4rem',
                    marginTop: '0.65rem',
                    justifyContent: 'center',
                  }}
                >
                  {muscleNames.map((name) => (
                    <span
                      key={name}
                      style={{
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        padding: '0.2rem 0.6rem',
                        borderRadius: '9999px',
                        background: 'var(--info-bg)',
                        color: 'var(--secondary)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      {name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* SECCIÓN 2: TIEMPO ENTRENADO (FORMATO 00:00, CENTRADO Y MÁS GRANDE) */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <label
                  htmlFor="finish-time-input"
                  style={{
                    fontSize: '0.88rem',
                    fontWeight: 800,
                    color: 'var(--text-main)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <Clock size={16} style={{ color: 'var(--secondary)' }} />
                  <span>Tiempo de sesión entrenado</span>
                </label>
              </div>

              <div className="finish-routine-time-row">
                <button
                  type="button"
                  className="finish-routine-step-btn"
                  onClick={handleSubtractTime}
                  title={`Restar ${stepLabel}`}
                >
                  - {stepLabel}
                </button>

                <div className="finish-routine-time-input-wrap">
                  <input
                    id="finish-time-input"
                    type="text"
                    value={timeInputValue}
                    onChange={handleTimeChange}
                    onBlur={handleTimeBlur}
                    placeholder="00:00"
                    className="finish-routine-time-input"
                    aria-label="Tiempo de sesión entrenado"
                    required
                  />
                </div>

                <button
                  type="button"
                  className="finish-routine-step-btn"
                  onClick={handleAddTime}
                  title={`Sumar ${stepLabel}`}
                >
                  + {stepLabel}
                </button>
              </div>
            </div>

            {/* SECCIÓN 3: SELECTOR INTERACTIVO DE RPE (COLOREADO SEGÚN TIERS DE DAILYLOADPAGE) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span
                  style={{
                    fontSize: '0.88rem',
                    fontWeight: 800,
                    color: 'var(--text-main)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <Zap size={16} style={{ color: 'var(--warning)' }} />
                  <span>Esfuerzo percibido (RPE 1-10)</span>
                </span>
                <span
                  style={{
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    padding: '0.15rem 0.6rem',
                    borderRadius: '9999px',
                    background: 'var(--bg-subtle)',
                    color: 'var(--secondary)',
                    border: '1px solid var(--border)',
                  }}
                >
                  Nivel {rpe}
                </span>
              </div>

              {/* Barra de 10 botones numéricos con colores semánticos */}
              <div className="finish-routine-rpe-bar" role="group" aria-label="Escala de esfuerzo">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((val) => {
                  const meta = RPE_LEVELS_META[val];
                  const isSelected = rpe === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setRpe(val)}
                      className={`finish-routine-rpe-btn finish-routine-rpe-btn--${meta.tier} ${
                        isSelected ? 'finish-routine-rpe-btn--selected' : ''
                      }`}
                      aria-label={`Nivel ${val}`}
                    >
                      {val}
                    </button>
                  );
                })}
              </div>

              {/* Caja de feedback explicativa idéntica a Carga del Día */}
              <div className="finish-routine-rpe-feedback-box">
                <div className="finish-routine-rpe-feedback-header">
                  <p className="finish-routine-rpe-feedback-title">
                    RPE {activeRpeMeta.val} · {activeRpeMeta.title}
                  </p>
                  <span
                    className={`finish-routine-rpe-feedback-tag finish-routine-rpe-feedback-tag--${activeRpeMeta.tier}`}
                  >
                    {activeRpeMeta.tagLabel}
                  </span>
                </div>
                <p className="finish-routine-rpe-feedback-desc">{activeRpeMeta.desc}</p>
              </div>
            </div>

            {/* SECCIÓN 4: CÁLCULO DE UA EN TIEMPO REAL */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.85rem 1.15rem',
                borderRadius: '14px',
                background: 'var(--info-bg)',
                border: '1px solid var(--border)',
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    display: 'block',
                  }}
                >
                  Unidades Arbitrarias calculadas ({formatMmSs(totalSeconds)} × RPE {rpe}):
                </span>
                <span
                  style={{
                    fontSize: '1.45rem',
                    fontWeight: 900,
                    color: 'var(--text-main)',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {calculatedUa}{' '}
                  <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--secondary)' }}>
                    UA
                  </span>
                </span>
              </div>

              <div
                className="finish-routine-ua-progress-track"
                style={{
                  width: '90px',
                  height: '8px',
                }}
              >
                <div
                  className="finish-routine-ua-progress-fill"
                  style={{
                    width: `${uaPercent}%`,
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>

            {errorMessage && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '10px',
                  background: 'var(--danger-bg)',
                  border: '1px solid var(--danger-border)',
                  color: 'var(--danger-text)',
                  fontSize: '0.85rem',
                }}
              >
                <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Botones Cancelar y Confirmar */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={isSubmitting}
                style={{ flex: 1, padding: '0.75rem' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirm}
                disabled={isSubmitting}
                style={{
                  flex: 2,
                  padding: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  fontWeight: 900,
                }}
              >
                {isSubmitting ? (
                  <span>Guardando carga...</span>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    <span>Confirmar y finalizar entrenamiento</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* ════════════ PASO 2: CELEBRACIÓN Y CARGA DE BARRA DE UA ════════════ */
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: '1.25rem',
              padding: '1rem 0.5rem',
            }}
          >
            {/* Ícono de Trofeo Animado */}
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'var(--success-bg)',
                color: 'var(--stat-green)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid var(--stat-green)',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              <Award size={36} />
            </div>

            <div>
              <h3
                style={{
                  margin: '0 0 0.35rem',
                  fontSize: '1.45rem',
                  fontWeight: 900,
                  color: 'var(--text-main)',
                  letterSpacing: '-0.02em',
                }}
              >
                ¡Entrenamiento completado!
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: '0.9rem',
                  color: 'var(--text-muted)',
                  maxWidth: '420px',
                  lineHeight: 1.45,
                }}
              >
                Tu sesión quedó registrada con éxito y tus Unidades Arbitrarias se sincronizaron con
                el semáforo de tu preparador físico.
              </p>
            </div>

            {/* BARRA DE UA CONSEGUIDA */}
            <div
              style={{
                width: '100%',
                background: 'var(--bg-subtle)',
                borderRadius: '16px',
                border: '1.5px solid var(--border)',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                }}
              >
                <span
                  style={{
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                  }}
                >
                  Carga conseguida en la sesión
                </span>
                <span
                  style={{
                    fontSize: '1.75rem',
                    fontWeight: 900,
                    color: 'var(--secondary)',
                    letterSpacing: '-0.03em',
                  }}
                >
                  {savedResponse?.totalLoad ?? calculatedUa}{' '}
                  <span style={{ fontSize: '0.95rem', fontWeight: 800 }}>UA</span>
                </span>
              </div>

              {/* Barra animada de UA con degradado multicolor (KAN-623) */}
              <div
                className="finish-routine-ua-progress-track"
                style={{
                  width: '100%',
                  height: '14px',
                }}
              >
                <div
                  className="finish-routine-ua-progress-fill"
                  style={{
                    width: `${uaPercent}%`,
                    transition: 'width 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                />
              </div>

              {/* Indicadores de referencia de la escala de Foster */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  marginTop: '-0.2rem',
                }}
              >
                <span>0 UA (Mínimo)</span>
                <span>200 UA (Medio)</span>
                <span>400 UA (Óptimo)</span>
                <span>600+ UA (Intenso)</span>
              </div>

              {/* Resumen de Minutos y RPE */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-around',
                  paddingTop: '0.65rem',
                  borderTop: '1px solid var(--border)',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                }}
              >
                <div>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Duración: </span>
                  <span style={{ color: 'var(--text-main)' }}>{formatMmSs(totalSeconds)}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Esfuerzo: </span>
                  <span style={{ color: 'var(--text-main)' }}>RPE {rpe}</span>
                </div>
              </div>
            </div>

            {/* Músculos que se estimularon */}
            {muscleNames.length > 0 && (
              <div style={{ width: '100%' }}>
                <span
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    display: 'block',
                    marginBottom: '0.4rem',
                  }}
                >
                  Grupos musculares estimulados:
                </span>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.35rem',
                    justifyContent: 'center',
                  }}
                >
                  {muscleNames.map((name) => (
                    <span
                      key={name}
                      style={{
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        padding: '0.2rem 0.6rem',
                        borderRadius: '9999px',
                        background: 'var(--info-bg)',
                        color: 'var(--secondary)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Botón de cierre */}
            <button
              type="button"
              className="btn btn-primary"
              onClick={onClose}
              style={{
                width: '100%',
                padding: '0.85rem',
                fontWeight: 900,
                fontSize: '0.98rem',
                gap: '0.45rem',
                marginTop: '0.5rem',
              }}
            >
              <span>Volver a Mi Rutina</span>
              <ArrowRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
