import React, { useState, useRef } from 'react';
import { HeartPulse, Bandage, CheckCircle2, AlertTriangle } from 'lucide-react';
import { canAutoAdvanceStep5 } from './checkInHelper';

export interface CheckInHealthInjurySlideProps {
  isSick: boolean;
  onSickChange: (val: boolean) => void;
  hasActiveInjury: boolean;
  onInjuryChange: (val: boolean) => void;
  onPrev: () => void;
  onNext: () => void;
}

export const CheckInHealthInjurySlide: React.FC<CheckInHealthInjurySlideProps> = ({
  isSick,
  onSickChange,
  hasActiveInjury,
  onInjuryChange,
  onPrev,
  onNext,
}) => {
  const [answeredSick, setAnsweredSick] = useState<boolean>(false);
  const [answeredInjury, setAnsweredInjury] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleSelectSick = (val: boolean) => {
    onSickChange(val);
    setAnsweredSick(true);

    if (canAutoAdvanceStep5(true, answeredInjury)) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        onNext();
      }, 350);
    }
  };

  const handleSelectInjury = (val: boolean) => {
    onInjuryChange(val);
    setAnsweredInjury(true);

    if (canAutoAdvanceStep5(answeredSick, true)) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        onNext();
      }, 350);
    }
  };

  const hasHealthIssue = isSick || hasActiveInjury;
  const heroColor = hasHealthIssue ? '#EF4444' : '#10B981';

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div className="pixel-slide-card">
        {/* Título en Montserrat negrita azul marino */}
        <h1 className="pixel-slide-title">
          ¿Cómo estás de salud
          <br />y lesiones?
        </h1>

        {/* Subtítulo en Montserrat azul */}
        <p className="pixel-slide-subtitle">
          {!hasHealthIssue
            ? 'Óptimo estado general de salud para entrenar hoy.'
            : 'Registraste condiciones médicas a tener en cuenta.'}
        </p>

        {/* Burbuja Central Flotante (76px, matching Step 1) */}
        <div
          className="pixel-bubble-hero"
          style={{
            background: heroColor,
            boxShadow: `0 8px 24px ${heroColor}45`,
            color: '#FFFFFF',
          }}
          aria-hidden="true"
        >
          {hasHealthIssue ? (
            <Bandage size={36} color="#FFFFFF" />
          ) : (
            <HeartPulse size={36} color="#FFFFFF" />
          )}
        </div>

        {/* Trazos curvos decorativos (︵ ︵) */}
        <div className="pixel-bubble-waves" aria-hidden="true">
          <svg width="22" height="13" viewBox="0 0 22 13" fill="none">
            <path
              d="M 3 4 Q 11 9 19 4"
              stroke="var(--checkin-waves-stroke)"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M 3 9 Q 11 14 19 9"
              stroke="var(--checkin-waves-stroke)"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* Pregunta 1: ¿Te sentís enfermo? */}
        <div
          style={{
            width: '100%',
            maxWidth: '480px',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem',
            marginBottom: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label
              style={{
                fontSize: '0.92rem',
                fontWeight: 800,
                color: 'var(--checkin-title-color)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontFamily: 'Montserrat, sans-serif',
              }}
            >
              <HeartPulse size={16} style={{ color: isSick ? '#EF4444' : '#10B981' }} />
              <span>¿Te sentís enfermo?</span>
            </label>
            <span
              style={{
                fontSize: '0.78rem',
                fontWeight: 800,
                padding: '0.2rem 0.65rem',
                borderRadius: '9999px',
                background: isSick ? '#FEE2E2' : '#ECFDF5',
                color: isSick ? '#DC2626' : '#065F46',
                fontFamily: 'Montserrat, sans-serif',
              }}
            >
              {isSick ? 'Con síntomas' : 'Sin síntomas'}
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.75rem',
            }}
            role="radiogroup"
            aria-label="¿Te sentís enfermo?"
          >
            <button
              type="button"
              onClick={() => handleSelectSick(false)}
              style={{
                padding: '0.85rem 1rem',
                borderRadius: '20px',
                border: `2px solid ${!isSick ? '#10B981' : 'var(--checkin-radio-inactive-border)'}`,
                background: !isSick ? '#ECFDF5' : 'var(--checkin-radio-inactive-bg)',
                color: !isSick ? '#065F46' : 'var(--checkin-radio-inactive-text)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.35rem',
                transition: 'all 0.18s ease',
                fontFamily: 'Montserrat, sans-serif',
              }}
              role="radio"
              aria-checked={!isSick}
            >
              <CheckCircle2 size={22} color={!isSick ? '#10B981' : '#94A3B8'} />
              <strong style={{ fontSize: '0.92rem' }}>Sin síntomas</strong>
              <span style={{ fontSize: '0.72rem', opacity: 0.85, textAlign: 'center' }}>
                Sano, sin malestar
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectSick(true)}
              style={{
                padding: '0.85rem 1rem',
                borderRadius: '20px',
                border: `2px solid ${isSick ? '#EF4444' : 'var(--checkin-radio-inactive-border)'}`,
                background: isSick ? '#FEE2E2' : 'var(--checkin-radio-inactive-bg)',
                color: isSick ? '#991B1B' : 'var(--checkin-radio-inactive-text)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.35rem',
                transition: 'all 0.18s ease',
                fontFamily: 'Montserrat, sans-serif',
              }}
              role="radio"
              aria-checked={isSick}
            >
              <AlertTriangle size={22} color={isSick ? '#EF4444' : '#94A3B8'} />
              <strong style={{ fontSize: '0.92rem' }}>Con síntomas</strong>
              <span style={{ fontSize: '0.72rem', opacity: 0.85, textAlign: 'center' }}>
                Fiebre o indisposición
              </span>
            </button>
          </div>
        </div>

        {/* Pregunta 2: ¿Tenés alguna lesión activa? */}
        <div
          style={{
            width: '100%',
            maxWidth: '480px',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid var(--checkin-card-border)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label
              style={{
                fontSize: '0.92rem',
                fontWeight: 800,
                color: 'var(--checkin-title-color)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontFamily: 'Montserrat, sans-serif',
              }}
            >
              <Bandage size={16} style={{ color: hasActiveInjury ? '#EF4444' : '#10B981' }} />
              <span>¿Tenés alguna lesión activa?</span>
            </label>
            <span
              style={{
                fontSize: '0.78rem',
                fontWeight: 800,
                padding: '0.2rem 0.65rem',
                borderRadius: '9999px',
                background: hasActiveInjury ? '#FEE2E2' : '#ECFDF5',
                color: hasActiveInjury ? '#DC2626' : '#065F46',
                fontFamily: 'Montserrat, sans-serif',
              }}
            >
              {hasActiveInjury ? 'Con lesión activa' : 'Sin lesión'}
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.75rem',
            }}
            role="radiogroup"
            aria-label="¿Tenés alguna lesión activa?"
          >
            <button
              type="button"
              onClick={() => handleSelectInjury(false)}
              style={{
                padding: '0.85rem 1rem',
                borderRadius: '20px',
                border: `2px solid ${!hasActiveInjury ? '#10B981' : 'var(--checkin-radio-inactive-border)'}`,
                background: !hasActiveInjury ? '#ECFDF5' : 'var(--checkin-radio-inactive-bg)',
                color: !hasActiveInjury ? '#065F46' : 'var(--checkin-radio-inactive-text)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.35rem',
                transition: 'all 0.18s ease',
                fontFamily: 'Montserrat, sans-serif',
              }}
              role="radio"
              aria-checked={!hasActiveInjury}
            >
              <CheckCircle2 size={22} color={!hasActiveInjury ? '#10B981' : '#94A3B8'} />
              <strong style={{ fontSize: '0.92rem' }}>Sin lesión</strong>
              <span style={{ fontSize: '0.72rem', opacity: 0.85, textAlign: 'center' }}>
                Apto sin restricciones
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectInjury(true)}
              style={{
                padding: '0.85rem 1rem',
                borderRadius: '20px',
                border: `2px solid ${hasActiveInjury ? '#EF4444' : 'var(--checkin-radio-inactive-border)'}`,
                background: hasActiveInjury ? '#FEE2E2' : 'var(--checkin-radio-inactive-bg)',
                color: hasActiveInjury ? '#991B1B' : 'var(--checkin-radio-inactive-text)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.35rem',
                transition: 'all 0.18s ease',
                fontFamily: 'Montserrat, sans-serif',
              }}
              role="radio"
              aria-checked={hasActiveInjury}
            >
              <AlertTriangle size={22} color={hasActiveInjury ? '#EF4444' : '#94A3B8'} />
              <strong style={{ fontSize: '0.92rem' }}>Con lesión</strong>
              <span style={{ fontSize: '0.72rem', opacity: 0.85, textAlign: 'center' }}>
                En rehabilitación / cuidado
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Barra de Navegación: Atrás y Siguiente */}
      <div className="pixel-nav-bar">
        <button type="button" className="pixel-btn-prev" onClick={onPrev}>
          <span>← Atrás</span>
        </button>
        <button type="button" className="pixel-btn-next" onClick={onNext}>
          <span>Ver resumen</span>
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  );
};
