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
  isMin?: boolean;
  isMax?: boolean;
  onDecrement?: () => void;
  onIncrement?: () => void;
}

export const RecoveryHeroControl: React.FC<RecoveryHeroControlProps> = ({
  activeMetric,
  currentVal,
  activeHeroColor,
  isStarColor,
  starPalette,
  burstKey,
}) => {
  const isAnswered = currentVal !== null;

  const renderHeroIcon = () => {
    switch (activeMetric) {
      case 'sleepHours':
        return (
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill={isAnswered ? 'var(--white)' : 'var(--input-placeholder)'}
            style={{ fill: isAnswered ? 'var(--white)' : 'var(--input-placeholder)' }}
            stroke="none"
          >
            <path d="M 21 12.79 A 9 9 0 1 1 11.21 3 A 7 7 0 0 0 21 12.79 Z" />
          </svg>
        );
      case 'sleepQuality':
        return (
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill={isAnswered ? 'var(--white)' : 'var(--input-placeholder)'}
            stroke="none"
          >
            <path d="M 13 2 L 3 14 L 12 14 L 11 22 L 21 10 L 12 10 Z" />
          </svg>
        );
      case 'fatigueLevel':
        return (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
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
          28,
          isAnswered ? 'rgba(0,0,0,0.22)' : 'var(--checkin-scale-neutral)',
          isAnswered ? 'var(--white)' : 'var(--input-placeholder)',
        );
    }
  };

  const renderCentralValue = () => {
    if (!isAnswered) {
      return (
        <div className="recovery-value-empty">
          <span className="recovery-value-empty-title">Neutro</span>
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
      <div className="recovery-hero-center">
        <div className="recovery-hero-circle-wrap">
          {isStarColor && (
            <div key={`burst-${burstKey}`} className="mood-burst-layer" aria-hidden="true">
              {BURST_STARS.map((s) => {
                const rad = (s.angle * Math.PI) / 180;
                const dx = Math.round(s.distance * 0.65 * Math.cos(rad));
                const dy = Math.round(s.distance * 0.65 * Math.sin(rad));
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
                    {renderStarSvg(s.type, Math.round(s.size * 0.8), color)}
                  </span>
                );
              })}
            </div>
          )}

          {isStarColor && (
            <div className="mood-ambient-layer" aria-hidden="true">
              {AMBIENT_STARS.map((s) => {
                const color = starPalette[s.colorIdx];
                return (
                  <span
                    key={`amb-${s.id}`}
                    className="mood-star-ambient-item"
                    style={{
                      top: `${Math.round(s.y * 0.65)}px`,
                      left: `${Math.round(s.x * 0.65)}px`,
                      animationDuration: `${s.duration}s`,
                      animationDelay: `${s.delay}s`,
                    }}
                  >
                    {renderStarSvg(s.type, Math.round(s.size * 0.8), color)}
                  </span>
                );
              })}
            </div>
          )}

          <div
            key={`hero-circle-${activeMetric}-${currentVal ?? 'un'}`}
            className="recovery-hero-circle"
            style={{
              backgroundColor: activeHeroColor,
              boxShadow: isStarColor
                ? `0 0 22px var(--checkin-star-violet), 0 6px 18px rgba(0, 0, 0, 0.18)`
                : `0 6px 18px rgba(0, 0, 0, 0.14)`,
            }}
            aria-hidden="true"
          >
            {renderHeroIcon()}
          </div>
        </div>

        {renderCentralValue()}
      </div>
    </div>
  );
};
