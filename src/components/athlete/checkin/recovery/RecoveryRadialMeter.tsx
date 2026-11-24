import React, { useRef } from 'react';
import {
  MetricKey,
  METRIC_CONFIGS,
  METRIC_ORDER,
  getMetricProgressPct,
  getValueFromHorizontalPct,
  getMetricDisplayInfo,
} from './recovery.types';
import {
  getSleepColor,
  getQualityColor,
  getFatigueColor,
  getSorenessColor,
  getMetricCurrentColor,
  renderBicepsMuscle,
} from './recoveryHelper';

interface RecoveryRadialMeterProps {
  activeMetric: MetricKey;
  sleepHours: number | null;
  sleepQuality: number | null;
  fatigueLevel: number | null;
  muscleSoreness: number | null;
  onSelectMetric: (key: MetricKey) => void;
  onValueChange?: (key: MetricKey, value: number) => void;
  getArcEndAngle?: (key: MetricKey) => number;
  getProgressPct?: (key: MetricKey) => number;
  isMin?: boolean;
  isMax?: boolean;
  onDecrement?: () => void;
  onIncrement?: () => void;
}

export const RecoveryRadialMeter: React.FC<RecoveryRadialMeterProps> = ({
  activeMetric,
  sleepHours,
  sleepQuality,
  fatigueLevel,
  muscleSoreness,
  onSelectMetric,
  onValueChange,
  getProgressPct,
  isMin: isMinProp,
  isMax: isMaxProp,
  onDecrement,
  onIncrement,
}) => {
  const trackRefs = useRef<Record<MetricKey, HTMLDivElement | null>>({
    sleepHours: null,
    sleepQuality: null,
    fatigueLevel: null,
    muscleSoreness: null,
  });
  const isPointerDownRef = useRef<boolean>(false);
  const activeDragMetricRef = useRef<MetricKey | null>(null);
  const lastValRef = useRef<number | null>(null);

  const triggerHaptic = () => {
    try {
      if (
        typeof navigator !== 'undefined' &&
        'vibrate' in navigator &&
        typeof navigator.vibrate === 'function'
      ) {
        navigator.vibrate(10);
      }
    } catch {
      // Ignore in environments where vibration is unsupported
    }
  };

  const handleSelectWithFeedback = (key: MetricKey) => {
    if (key !== activeMetric) {
      triggerHaptic();
      onSelectMetric(key);
    }
  };

  const getMetricVal = (key: MetricKey): number | null => {
    switch (key) {
      case 'sleepHours':
        return sleepHours;
      case 'sleepQuality':
        return sleepQuality;
      case 'fatigueLevel':
        return fatigueLevel;
      case 'muscleSoreness':
        return muscleSoreness;
    }
  };

  const isMetricMin = (key: MetricKey): boolean => {
    if (key === activeMetric && typeof isMinProp === 'boolean') {
      return isMinProp;
    }
    const val = getMetricVal(key);
    if (val === null) return false;
    switch (key) {
      case 'sleepHours':
        return val <= 0;
      case 'sleepQuality':
        return val <= 1;
      case 'fatigueLevel':
        return val >= 5;
      case 'muscleSoreness':
        return val >= 5;
    }
  };

  const isMetricMax = (key: MetricKey): boolean => {
    if (key === activeMetric && typeof isMaxProp === 'boolean') {
      return isMaxProp;
    }
    const val = getMetricVal(key);
    if (val === null) return false;
    switch (key) {
      case 'sleepHours':
        return val >= 13;
      case 'sleepQuality':
        return val >= 5;
      case 'fatigueLevel':
        return val <= 1;
      case 'muscleSoreness':
        return val <= 1;
    }
  };

  const handleStepDecrement = (key: MetricKey) => {
    if (key !== activeMetric) return;
    triggerHaptic();
    if (onDecrement) {
      onDecrement();
      return;
    }
    if (!onValueChange) return;
    const current = getMetricVal(key);
    switch (key) {
      case 'sleepHours':
        onValueChange(key, current === null ? 7 : Math.max(0, current - 1));
        break;
      case 'sleepQuality':
        onValueChange(key, current === null ? 3 : Math.max(1, current - 1));
        break;
      case 'fatigueLevel':
        onValueChange(key, current === null ? 4 : Math.min(5, current + 1));
        break;
      case 'muscleSoreness':
        onValueChange(key, current === null ? 3 : Math.min(5, current + 1));
        break;
    }
  };

  const handleStepIncrement = (key: MetricKey) => {
    if (key !== activeMetric) return;
    triggerHaptic();
    if (onIncrement) {
      onIncrement();
      return;
    }
    if (!onValueChange) return;
    const current = getMetricVal(key);
    switch (key) {
      case 'sleepHours':
        onValueChange(key, current === null ? 8 : Math.min(12, current + 1));
        break;
      case 'sleepQuality':
        onValueChange(key, current === null ? 4 : Math.min(5, current + 1));
        break;
      case 'fatigueLevel':
        onValueChange(key, current === null ? 2 : Math.max(1, current - 1));
        break;
      case 'muscleSoreness':
        onValueChange(key, current === null ? 1 : Math.max(1, current - 1));
        break;
    }
  };

  const updateValueFromClientX = (clientX: number, key: MetricKey) => {
    if (!onValueChange) return;
    const trackEl = trackRefs.current[key];
    if (!trackEl) return;
    const rect = trackEl.getBoundingClientRect();
    const width = rect.width > 0 ? rect.width : 240;
    const rawPct = (clientX - rect.left) / width;
    const newVal = getValueFromHorizontalPct(rawPct, key);

    if (lastValRef.current !== newVal) {
      lastValRef.current = newVal;
      triggerHaptic();
      onValueChange(key, newVal);
    }
  };

  const handleTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>, key: MetricKey) => {
    e.stopPropagation();
    // Si el indicador aún no estaba seleccionado, el primer toque solo lo selecciona
    if (key !== activeMetric) {
      isPointerDownRef.current = false;
      activeDragMetricRef.current = null;
      handleSelectWithFeedback(key);
      return;
    }

    isPointerDownRef.current = true;
    activeDragMetricRef.current = key;
    lastValRef.current = getMetricVal(key);

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture is unsupported in JSDOM
    }

    updateValueFromClientX(e.clientX, key);
  };

  const handleTrackPointerMove = (e: React.PointerEvent<HTMLDivElement>, key: MetricKey) => {
    if (!isPointerDownRef.current || activeDragMetricRef.current !== key) return;
    updateValueFromClientX(e.clientX, key);
  };

  const handleTrackPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPointerDownRef.current) return;
    isPointerDownRef.current = false;
    activeDragMetricRef.current = null;
    lastValRef.current = null;
    try {
      if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore
    }
  };

  const renderMetricIcon = (key: MetricKey, isAnswered: boolean, color: string) => {
    switch (key) {
      case 'sleepHours':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M 21 12.79 A 9 9 0 1 1 11.21 3 A 7 7 0 0 0 21 12.79 Z"
              fill={isAnswered ? 'var(--white)' : 'var(--input-placeholder)'}
            />
          </svg>
        );
      case 'sleepQuality':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M 13 2 L 3 14 L 12 14 L 11 22 L 21 10 L 12 10 Z"
              fill={isAnswered ? 'var(--white)' : 'var(--input-placeholder)'}
            />
          </svg>
        );
      case 'fatigueLevel':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect
              x="2"
              y="6"
              width="17"
              height="12"
              rx="3"
              stroke={isAnswered ? 'var(--white)' : 'var(--input-placeholder)'}
              strokeWidth="2"
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
              width={Math.max(2.5, ((6 - (fatigueLevel ?? 6)) / 5) * 12.5)}
              height="7.6"
              rx="1.5"
              fill={isAnswered ? 'var(--white)' : 'var(--checkin-scale-neutral)'}
            />
          </svg>
        );
      case 'muscleSoreness':
        return renderBicepsMuscle(
          18,
          isAnswered ? color : 'var(--checkin-scale-neutral)',
          isAnswered ? 'var(--white)' : 'var(--input-placeholder)',
        );
    }
  };

  const metricItems = METRIC_ORDER.map((key) => {
    const cfg = METRIC_CONFIGS[key];
    const val = getMetricVal(key);
    const isAnswered = val !== null;
    const color =
      key === 'sleepHours'
        ? val !== null
          ? getSleepColor(val)
          : 'var(--checkin-scale-neutral)'
        : key === 'sleepQuality'
          ? val !== null
            ? getQualityColor(val)
            : 'var(--checkin-scale-neutral)'
          : key === 'fatigueLevel'
            ? val !== null
              ? getFatigueColor(val)
              : 'var(--checkin-scale-neutral)'
            : val !== null
              ? getSorenessColor(val)
              : 'var(--checkin-scale-neutral)';

    const progressPct = getProgressPct ? getProgressPct(key) : getMetricProgressPct(key, val);
    const displayInfo = getMetricDisplayInfo(key, val);

    return {
      key,
      label: cfg.name,
      val,
      isAnswered,
      color: getMetricCurrentColor(key, val) || color,
      progressPct,
      valueText: displayInfo.valueText,
      stateText: displayInfo.stateText,
      isMin: isMetricMin(key),
      isMax: isMetricMax(key),
    };
  });

  return (
    <div
      className="recovery-meter-wrap recovery-bars-container"
      role="group"
      aria-label="Indicadores de descanso y recuperación"
    >
      {metricItems.map((item) => {
        const isActive = activeMetric === item.key;
        const fillPct = item.isAnswered ? Math.round(item.progressPct * 100) : 0;

        return (
          <div
            key={item.key}
            data-metric={item.key}
            className={`recovery-bar-card checkin-recovery-label-group ${isActive ? 'is-active' : 'is-inactive'} ${item.isAnswered ? 'is-answered' : 'is-unanswered'}`}
            onClick={() => handleSelectWithFeedback(item.key)}
            role="button"
            tabIndex={0}
            aria-pressed={isActive}
            aria-label={`Seleccionar indicador ${item.label}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleSelectWithFeedback(item.key);
              } else if (isActive && e.key === 'ArrowLeft') {
                e.preventDefault();
                if (!item.isMin) handleStepDecrement(item.key);
              } else if (isActive && e.key === 'ArrowRight') {
                e.preventDefault();
                if (!item.isMax) handleStepIncrement(item.key);
              }
            }}
          >
            {/* Cabecera del indicador: Icono + Nombre a la izquierda, Valor y Estado a la derecha */}
            <div className="recovery-bar-header">
              <div className="recovery-bar-identity">
                <span
                  className={`recovery-bar-icon-badge ${isActive ? 'is-active' : ''}`}
                  style={{
                    backgroundColor: item.isAnswered ? item.color : 'var(--checkin-counter-bg)',
                    borderColor: isActive
                      ? 'var(--cyan-accent)'
                      : item.isAnswered
                        ? 'transparent'
                        : 'var(--border)',
                  }}
                  aria-hidden="true"
                >
                  {renderMetricIcon(item.key, item.isAnswered, item.color)}
                </span>
                <span
                  className={`recovery-badge-text recovery-bar-title ${isActive ? 'is-active' : ''}`}
                >
                  {item.label}
                </span>
              </div>

              <div className={`recovery-bar-status ${isActive ? 'is-active' : ''}`}>
                <span
                  className={`recovery-bar-value-text ${isActive ? 'is-active' : ''} ${!item.isAnswered ? 'is-neutral' : ''}`}
                >
                  {item.valueText}
                </span>
                <span className={`recovery-bar-state-pill ${isActive ? 'is-active' : ''}`}>
                  {item.stateText}
                </span>
              </div>
            </div>

            {/* Fila de control horizontal: [ − ] ━━━━━━━━━━━━━━━ [ + ] */}
            <div className="recovery-bar-controls-row">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (isActive && !item.isMin) {
                    handleStepDecrement(item.key);
                  } else if (!isActive) {
                    handleSelectWithFeedback(item.key);
                  }
                }}
                disabled={!isActive || item.isMin}
                aria-label={isActive ? 'Disminuir valor' : `Disminuir ${item.label}`}
                title={isActive ? 'Disminuir valor' : `Selecciona ${item.label} para modificar`}
                tabIndex={isActive ? 0 : -1}
                className={`recovery-stepper-btn recovery-bar-stepper recovery-bar-stepper-minus ${isActive ? 'is-active' : 'is-inactive'} ${!isActive || item.isMin ? 'is-disabled' : ''}`}
              >
                <svg
                  width={isActive ? '20' : '16'}
                  height={isActive ? '20' : '16'}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.6"
                  aria-hidden="true"
                >
                  <line x1="5" y1="12" x2="19" y2="12" strokeLinecap="round" />
                </svg>
              </button>

              <div
                ref={(el) => {
                  trackRefs.current[item.key] = el;
                }}
                className={`recovery-bar-track recovery-track-arc ${isActive ? 'is-active' : ''}`}
                onPointerDown={(e) => handleTrackPointerDown(e, item.key)}
                onPointerMove={(e) => handleTrackPointerMove(e, item.key)}
                onPointerUp={handleTrackPointerUp}
                onPointerCancel={handleTrackPointerUp}
                data-testid={`recovery-bar-track-${item.key}`}
              >
                <div
                  className={`recovery-bar-fill recovery-progress-arc ${isActive ? 'is-active' : ''}`}
                  style={{
                    width: `${fillPct}%`,
                    backgroundColor: item.isAnswered ? item.color : 'var(--checkin-scale-neutral)',
                  }}
                  data-testid={`recovery-bar-fill-${item.key}`}
                />
                {item.isAnswered && (
                  <span
                    className={`recovery-bar-thumb recovery-slider-thumb ${isActive ? 'is-active' : ''}`}
                    style={{
                      left: `${fillPct}%`,
                      borderColor: item.color,
                    }}
                    aria-hidden="true"
                  />
                )}
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (isActive && !item.isMax) {
                    handleStepIncrement(item.key);
                  } else if (!isActive) {
                    handleSelectWithFeedback(item.key);
                  }
                }}
                disabled={!isActive || item.isMax}
                aria-label={isActive ? 'Aumentar valor' : `Aumentar ${item.label}`}
                title={isActive ? 'Aumentar valor' : `Selecciona ${item.label} para modificar`}
                tabIndex={isActive ? 0 : -1}
                className={`recovery-stepper-btn recovery-bar-stepper recovery-bar-stepper-plus ${isActive ? 'is-active' : 'is-inactive'} ${!isActive || item.isMax ? 'is-disabled' : ''}`}
              >
                <svg
                  width={isActive ? '20' : '16'}
                  height={isActive ? '20' : '16'}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.6"
                  aria-hidden="true"
                >
                  <line x1="12" y1="5" x2="12" y2="19" strokeLinecap="round" />
                  <line x1="5" y1="12" x2="19" y2="12" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
