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
  Upload,
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
import {
  generateRoutineShareImage,
  shareToInstagram,
  shareToFacebook,
  shareToWhatsApp,
  shareToAnyApp,
} from '../../utils/routineShareImage';

const InstagramIcon: React.FC = () => (
  <svg
    viewBox="0 0 24 24"
    width="20"
    height="20"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

const FacebookIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const WhatsAppIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
  </svg>
);

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
  const [isSharing, setIsSharing] = useState<boolean>(false);
  const [shareToast, setShareToast] = useState<string | null>(null);

  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (prevIsOpen !== isOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      const initSec = timerSeconds > 0 ? timerSeconds : 3600;
      setTotalSeconds(initSec);
      setTimeInputValue(formatMmSs(initSec));
      setIsCompleted(false);
      setErrorMessage(null);
      setShareToast(null);
      setIsSharing(false);
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

  const handleShare = async (platform: 'instagram' | 'facebook' | 'whatsapp' | 'any') => {
    setIsSharing(true);
    setShareToast(null);
    try {
      const file = await generateRoutineShareImage(highlight.muscleColors);
      let res = { success: true, message: '' };
      if (platform === 'instagram') {
        res = await shareToInstagram(file);
      } else if (platform === 'facebook') {
        res = await shareToFacebook(file);
      } else if (platform === 'whatsapp') {
        res = await shareToWhatsApp(file);
      } else {
        res = await shareToAnyApp(file);
      }
      if (res.message) {
        setShareToast(res.message);
        setTimeout(() => setShareToast(null), 5000);
      }
    } catch (err) {
      console.error('Error al compartir rutina:', err);
      setShareToast('Ocurrió un error al preparar la imagen para compartir.');
      setTimeout(() => setShareToast(null), 4000);
    } finally {
      setIsSharing(false);
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
          <div className="finish-routine-celebration-container">
            {/* Ícono de Trofeo Animado */}
            <div className="finish-routine-celebration-badge">
              <Award size={36} />
            </div>

            <div>
              <h3 className="finish-routine-celebration-title">¡Entrenamiento completado!</h3>
              <p className="finish-routine-celebration-subtitle">
                Tu sesión quedó registrada con éxito y tus Unidades Arbitrarias se sincronizaron con
                el semáforo de tu preparador físico.
              </p>
            </div>

            {/* Siluetas anatómicas con músculos trabajados en la sesión (Imagen 2) */}
            <div
              className="finish-routine-celebration-muscles"
              title={
                muscleNames.length > 0
                  ? `Músculos trabajados: ${muscleNames.join(', ')}`
                  : 'Músculos trabajados en la sesión'
              }
              aria-label="Silueta de músculos trabajados en la sesión"
              role="img"
            >
              <div style={{ width: '80px', height: '144px' }}>
                <MuscleMapFront
                  readOnly={true}
                  hideHeader={true}
                  hideFooter={true}
                  muscleColors={highlight.muscleColors}
                />
              </div>
              <div style={{ width: '80px', height: '144px' }}>
                <MuscleMapBack
                  readOnly={true}
                  hideHeader={true}
                  hideFooter={true}
                  muscleColors={highlight.muscleColors}
                />
              </div>
            </div>

            {/* BARRA DE UA CONSEGUIDA (Imagen 2) */}
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

            {/* Acciones de Compartir en Historias / Redes y Volver a Mi Rutina (Imagen 2) */}
            <div className="finish-routine-celebration-actions">
              <div className="finish-routine-social-group">
                <button
                  type="button"
                  className="finish-routine-social-btn finish-routine-social-btn--instagram"
                  onClick={() => handleShare('instagram')}
                  disabled={isSharing}
                  title="Compartir en historias de Instagram"
                  aria-label="Compartir en historias de Instagram"
                >
                  <InstagramIcon />
                </button>
                <button
                  type="button"
                  className="finish-routine-social-btn finish-routine-social-btn--facebook"
                  onClick={() => handleShare('facebook')}
                  disabled={isSharing}
                  title="Compartir en historias de Facebook"
                  aria-label="Compartir en historias de Facebook"
                >
                  <FacebookIcon />
                </button>
                <button
                  type="button"
                  className="finish-routine-social-btn finish-routine-social-btn--whatsapp"
                  onClick={() => handleShare('whatsapp')}
                  disabled={isSharing}
                  title="Compartir en estados de WhatsApp"
                  aria-label="Compartir en estados de WhatsApp"
                >
                  <WhatsAppIcon />
                </button>
                <button
                  type="button"
                  className="finish-routine-social-btn finish-routine-social-btn--export"
                  onClick={() => handleShare('any')}
                  disabled={isSharing}
                  title="Compartir imagen en formato PNG a cualquier app"
                  aria-label="Compartir imagen en formato PNG a cualquier app"
                >
                  <Upload size={18} />
                </button>
              </div>

              <button
                type="button"
                className="btn btn-primary finish-routine-return-btn"
                onClick={onClose}
              >
                <span>Volver a Mi Rutina</span>
                <ArrowRight size={18} />
              </button>
            </div>

            {shareToast && (
              <div className="finish-routine-share-toast" role="status">
                <span>{shareToast}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
