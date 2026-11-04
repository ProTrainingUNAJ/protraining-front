import React from 'react';
import {
  MetricKey,
  BURST_STARS,
  AMBIENT_STARS,
  QUALITY_LABELS,
  FATIGUE_LABELS,
  SORENESS_LABELS,
} from './recovery.types';
import { renderBicepsMuscle, renderStarSvg } from './recoveryHelper';

interface RecoveryHeroControlProps {
  activeMetric: MetricKey;
  currentVal: number | null;
  activeHeroColor: string;
  isStarColor: boolean;
  starPalette: string[];
  burstKey: number;
  isMin: boolean;
  isMax: boolean;
  onDecrement: () => void;
  onIncrement: () => void;
}

export const RecoveryHeroControl: React.FC<RecoveryHeroControlProps> = ({
  activeMetric,
  currentVal,
  activeHeroColor,
  isStarColor,
  starPalette,
  burstKey,
  isMin,
  isMax,
  onDecrement,
  onIncrement,
}) => {
  const isAnswered = currentVal !== null;

  const renderHeroIcon = () => {
    switch (activeMetric) {
      case 'sleepHours':
        return (
          <svg
            width="54"
            height="54"
            viewBox="0 0 24 24"
            fill={isAnswered ? 'var(--checkin-star-gold)' : 'var(--input-placeholder)'}
            stroke="none"
          >
            <path d="M 21 12.79 A 9 9 0 1 1 11.21 3 A 7 7 0 0 0 21 12.79 Z" />
          </svg>
        );
      case 'sleepQuality':
        return (
          <svg
            width="54"
            height="54"
            viewBox="0 0 24 24"
            fill={isAnswered ? 'var(--white)' : 'var(--input-placeholder)'}
            stroke="none"
          >
            <path d="M 13 2 L 3 14 L 12 14 L 11 22 L 21 10 L 12 10 Z" />
          </svg>
        );
      case 'fatigueLevel':
        return (
          <svg width="54" height="54" viewBox="0 0 24 24" fill="none">
            <rect
              x="2"
              y="6"
              width="17"
              height="12"
              rx="3"
              stroke={isAnswered ? 'var(--white)' : 'var(--input-placeholder)'}
              strokeWidth="2.2"
              fill="none"
            />
            <rect
              x="20.5"
              y="9.8"
              width="2.5"
              height="4.4"
              rx="1.2"
              fill={isAnswered ? 'var(--white)' : 'var(--input-placeholder)'}
            />
            <rect
              x="4.2"
              y="8.2"
              width={Math.max(2.5, ((6 - (currentVal ?? 6)) / 5) * 12.5)}
              height="7.6"
              rx="1.5"
              fill={isAnswered ? 'var(--white)' : 'var(--checkin-scale-neutral)'}
              style={{ transition: 'width 0.25s ease' }}
            />
          </svg>
        );
      case 'muscleSoreness':
        return renderBicepsMuscle(
          54,
          isAnswered ? 'rgba(0,0,0,0.22)' : 'var(--checkin-scale-neutral)',
          isAnswered ? 'var(--white)' : 'var(--input-placeholder)',
        );
    }
  };

  const renderCentralValue = () => {
    if (!isAnswered) {
      return (
        <div className="recovery-value-empty">
          <span className="recovery-value-empty-title">Sin responder</span>
        </div>
      );
    }

    switch (activeMetric) {
      case 'sleepHours':
        return (
          <div className="recovery-value-filled">
            <div className="recovery-value-number-wrap">
              <span className="recovery-value-number">{currentVal}</span>
              <span className="recovery-value-unit">{currentVal === 1 ? 'hora' : 'horas'}</span>
            </div>
          </div>
        );
      case 'sleepQuality':
        return (
          <div className="recovery-value-filled">
            <span className="recovery-value-label">{QUALITY_LABELS[currentVal] ?? currentVal}</span>
          </div>
        );
      case 'fatigueLevel':
        return (
          <div className="recovery-value-filled">
            <span className="recovery-value-label">{FATIGUE_LABELS[currentVal] ?? currentVal}</span>
          </div>
        );
      case 'muscleSoreness':
        return (
          <div className="recovery-value-filled">
            <span className="recovery-value-label">
              {SORENESS_LABELS[currentVal] ?? currentVal}
            </span>
          </div>
        );
    }
  };

  return (
    <div className="recovery-hero-control">
      {/* Botón Decremento (−) */}
      <button
        type="button"
        onClick={onDecrement}
        disabled={isMin}
        aria-label="Disminuir valor"
        className={`recovery-stepper-btn ${isMin ? 'is-disabled' : ''}`}
        title="Disminuir valor"
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <line x1="5" y1="12" x2="19" y2="12" strokeLinecap="round" />
        </svg>
      </button>

      {/* Hero Central */}
      <div className="recovery-hero-center">
        {/* Contenedor relativo centrado para el círculo hero y sus partículas orbitales */}
        <div className="recovery-hero-circle-wrap">
          {/* Ráfaga de estrellitas (Burst) centrada en el círculo */}
          {isStarColor && (
            <div key={`burst-${burstKey}`} className="mood-burst-layer" aria-hidden="true">
              {BURST_STARS.map((s) => {
                const rad = (s.angle * Math.PI) / 180;
                const dx = Math.round(s.distance * Math.cos(rad));
                const dy = Math.round(s.distance * Math.sin(rad));
                const color = starPalette[s.colorIdx];

                return (
                  <span
                    key={`b-${s.id}`}
                    className="mood-star-burst-item"
                    style={{
                      ['--star-dx' as string]: `${dx}px`,
                      ['--star-dy' as string]: `${dy}px`,
                      ['--star-rot' as string]: `${s.rot}deg`,
                      animationDelay: `${s.delay}ms`,
                    }}
                  >
                    {renderStarSvg(s.type, s.size, color)}
                  </span>
                );
              })}
            </div>
          )}

          {/* Estrellitas ambientales continuas centradas en el círculo */}
          {isStarColor && (
            <div className="mood-ambient-layer" aria-hidden="true">
              {AMBIENT_STARS.map((s) => {
                const color = starPalette[s.colorIdx];
                return (
                  <span
                    key={`amb-${s.id}`}
                    className="mood-star-ambient-item"
                    style={{
                      top: `${s.y}px`,
                      left: `${s.x}px`,
                      animationDuration: `${s.duration}s`,
                      animationDelay: `${s.delay}s`,
                    }}
                  >
                    {renderStarSvg(s.type, s.size, color)}
                  </span>
                );
              })}
            </div>
          )}

          {/* Círculo Hero Superior (120px, matching Step 1) */}
          <div
            key={`hero-circle-${activeMetric}-${currentVal ?? 'un'}`}
            className="recovery-hero-circle"
            style={{
              backgroundColor: activeHeroColor,
              boxShadow: isStarColor
                ? `0 0 26px var(--checkin-star-violet), 0 8px 24px rgba(0, 0, 0, 0.2)`
                : `0 8px 24px rgba(0, 0, 0, 0.15)`,
            }}
            aria-hidden="true"
          >
            {renderHeroIcon()}
          </div>
        </div>

        {/* Valor central destacado (sin subtítulo "Nivel 1 de 5" ni "Excelente descanso") */}
        {renderCentralValue()}
      </div>

      {/* Botón Incremento (+) */}
      <button
        type="button"
        onClick={onIncrement}
        disabled={isMax}
        aria-label="Aumentar valor"
        className={`recovery-stepper-btn ${isMax ? 'is-disabled' : ''}`}
        title="Aumentar valor"
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <line x1="12" y1="5" x2="12" y2="19" strokeLinecap="round" />
          <line x1="5" y1="12" x2="19" y2="12" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
};
