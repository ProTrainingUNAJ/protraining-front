import React from 'react';
import { Check } from 'lucide-react';
import { getStepTitle, getStepProgress } from './checkInHelper';

export interface CheckInProgressBarProps {
  currentStep: number;
  totalSteps?: number;
  onSelectStep: (step: number) => void;
  maxReachedStep?: number;
  onPrev?: () => void;
}

export const CheckInProgressBar: React.FC<CheckInProgressBarProps> = ({
  currentStep,
  totalSteps = 3,
  onSelectStep,
  maxReachedStep = 1,
}) => {
  const isSummary = currentStep > totalSteps;
  const progressPercent = getStepProgress(currentStep, totalSteps);

  return (
    <div
      className="checkin-progress-wrap"
      aria-label="Progreso del check-in diario"
      style={{
        background: 'var(--checkin-card-bg)',
        borderRadius: '20px',
        border: '1.5px solid var(--checkin-card-border)',
        boxShadow: 'var(--checkin-card-shadow)',
        padding: '0.85rem 2rem',
        maxWidth: '820px',
        width: '100%',
        margin: '0 auto',
        boxSizing: 'border-box',
        transition: 'background-color 0.25s ease, border-color 0.25s ease',
        position: 'relative',
      }}
    >
      <div
        className="checkin-progress-inner"
        style={{
          position: 'relative',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {/* ── Barra delgada de progreso con degradado centrada sobre el eje de los círculos ── */}
        <div
          className="checkin-progress-track"
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          style={{
            position: 'absolute',
            left: '14px',
            right: '14px',
            top: '50%',
            transform: 'translateY(-50%)',
            height: '4px',
            background: 'var(--checkin-track-base)',
            borderRadius: '9999px',
            overflow: 'hidden',
            margin: 0,
            zIndex: 1,
          }}
        >
          <div
            className="checkin-progress-bar"
            style={{
              width: `${progressPercent}%`,
              background: 'var(--checkin-progress-gradient)',
              height: '100%',
              borderRadius: '9999px',
              transition: 'width 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />
        </div>

        {/* ── Círculos de pasos alineados sobre la barra ── */}
        <div
          className="checkin-step-dots"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
            padding: 0,
            position: 'relative',
            zIndex: 2,
          }}
        >
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map((stepNum) => {
            const isActive = stepNum === currentStep;
            const isCompleted = stepNum < currentStep || isSummary;
            const isAllowed = stepNum <= Math.max(maxReachedStep, currentStep);

            return (
              <button
                key={stepNum}
                type="button"
                className={`checkin-step-dot ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                onClick={() => isAllowed && onSelectStep(stepNum)}
                disabled={!isAllowed}
                aria-label={`Paso ${stepNum}: ${getStepTitle(stepNum)}`}
                title={`Paso ${stepNum}: ${getStepTitle(stepNum)}`}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'Montserrat, system-ui, -apple-system, sans-serif',
                  fontSize: '0.82rem',
                  fontWeight: isActive ? 800 : 700,
                  border:
                    isCompleted || isActive ? 'none' : '1.5px solid var(--checkin-counter-border)',
                  background:
                    isCompleted || isActive
                      ? 'var(--checkin-step-active-bg)'
                      : 'var(--checkin-counter-bg)',
                  color: isCompleted || isActive ? '#FFFFFF' : 'var(--checkin-subtitle-color)',
                  cursor: isAllowed ? 'pointer' : 'default',
                  transition: 'all 0.2s ease',
                  padding: 0,
                  boxShadow: 'none',
                }}
              >
                {isCompleted ? <Check size={14} strokeWidth={3} color="#FFFFFF" /> : stepNum}
              </button>
            );
          })}

          {/* Resumen Dot (Estrella ★) */}
          {(() => {
            const isSummaryActive = isSummary;
            const summaryStepNum = totalSteps + 1;
            const isAllowed = maxReachedStep >= summaryStepNum || isSummary;

            return (
              <button
                type="button"
                className={`checkin-step-dot ${isSummaryActive ? 'active' : ''}`}
                onClick={() => isAllowed && onSelectStep(summaryStepNum)}
                disabled={!isAllowed}
                aria-label="Resumen final"
                title="Resumen final"
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: isSummaryActive ? 'none' : '1.5px solid var(--checkin-counter-border)',
                  background: isSummaryActive
                    ? 'var(--checkin-step-active-bg)'
                    : 'var(--checkin-counter-bg)',
                  color: isSummaryActive ? '#FFFFFF' : 'var(--checkin-subtitle-color)',
                  cursor: isAllowed ? 'pointer' : 'default',
                  transition: 'all 0.2s ease',
                  padding: 0,
                  boxShadow: 'none',
                }}
              >
                <span style={{ lineHeight: 1, fontSize: '0.88rem', marginTop: '-1px' }}>★</span>
              </button>
            );
          })()}
        </div>
      </div>
    </div>
  );
};
