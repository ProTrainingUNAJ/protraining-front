import React, { useState, useEffect, useRef } from 'react';
import { SubtleFireworks } from './SubtleFireworks';
import {
  CheckInRecoverySlideProps,
  MetricKey,
  COLOR_SCALE,
  METRIC_CONFIGS,
} from './recovery/recovery.types';
import {
  getSleepColor,
  getQualityColor,
  getFatigueColor,
  getSorenessColor,
  getMetricCurrentColor,
} from './recovery/recoveryHelper';
import { RecoveryHeroControl } from './recovery/RecoveryHeroControl';
import { RecoveryRadialMeter } from './recovery/RecoveryRadialMeter';
import { RecoveryValidationModal, RecoverySleepHoursConfirmModal } from './recovery/RecoveryModals';

export type { CheckInRecoverySlideProps, MetricKey };

export const CheckInRecoverySlide: React.FC<CheckInRecoverySlideProps> = ({
  sleepHours,
  onSleepHoursChange,
  sleepQuality,
  onSleepQualityChange,
  fatigueLevel,
  onFatigueChange,
  muscleSoreness,
  onSorenessChange,
  onPrev,
  onNext,
}) => {
  const [activeMetric, setActiveMetric] = useState<MetricKey>('sleepHours');
  const [showValidationModal, setShowValidationModal] = useState<boolean>(false);
  const [showSleepHoursConfirmModal, setShowSleepHoursConfirmModal] = useState<boolean>(false);

  // Asegurar que el horario de sueño sea un número entero de 0 a 13 horas (pasos de 1h)
  useEffect(() => {
    if (sleepHours !== null) {
      const rounded = Math.min(13, Math.max(0, Math.round(sleepHours)));
      if (rounded !== sleepHours) {
        onSleepHoursChange(rounded);
      }
    }
  }, [sleepHours, onSleepHoursChange]);

  // Funciones de consulta de valores y estado marcado
  const getMetricCurrentValue = (key: MetricKey): number | null => {
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

  const isMetricAnswered = (key: MetricKey): boolean => {
    return getMetricCurrentValue(key) !== null;
  };

  const getPendingMetrics = (): { key: MetricKey; label: string }[] => {
    const list: { key: MetricKey; label: string }[] = [];
    if (sleepHours === null) list.push({ key: 'sleepHours', label: 'Horas de sueño' });
    if (sleepQuality === null) list.push({ key: 'sleepQuality', label: 'Calidad del descanso' });
    if (fatigueLevel === null)
      list.push({ key: 'fatigueLevel', label: 'Nivel de fatiga muscular' });
    if (muscleSoreness === null) list.push({ key: 'muscleSoreness', label: 'Dolor muscular' });
    return list;
  };

  const pendingMetrics = getPendingMetrics();

  const getActiveHeroColor = (): string => {
    if (!isMetricAnswered(activeMetric)) {
      return 'var(--input-bg)';
    }
    const val = getMetricCurrentValue(activeMetric);
    return getMetricCurrentColor(activeMetric, val);
  };

  const [burstKey, setBurstKey] = useState(0);

  const activeHeroColor = getActiveHeroColor();
  const isStarColor =
    isMetricAnswered(activeMetric) &&
    (activeHeroColor === COLOR_SCALE.violet || activeHeroColor === COLOR_SCALE.green);

  // Paleta de colores de estrellitas según si es Violeta o Verde
  const starPalette =
    activeHeroColor === COLOR_SCALE.violet
      ? ['var(--checkin-star-gold)', 'var(--checkin-star-violet)', 'var(--checkin-star-pink)']
      : ['var(--checkin-star-gold)', 'var(--checkin-star-green)', 'var(--checkin-star-yellow)'];

  const prevColorRef = useRef(activeHeroColor);

  useEffect(() => {
    if (isStarColor && activeHeroColor !== prevColorRef.current) {
      setBurstKey((prev) => prev + 1);
    }
    prevColorRef.current = activeHeroColor;
  }, [isStarColor, activeHeroColor]);

  const triggerStarBurstIfEligible = (newColor: string) => {
    if (newColor === COLOR_SCALE.violet || newColor === COLOR_SCALE.green) {
      setBurstKey((prev) => prev + 1);
    }
  };

  // Incremento / Decremento para el control central
  const handleDecrement = () => {
    switch (activeMetric) {
      case 'sleepHours': {
        const current = sleepHours === null ? 1 : sleepHours;
        const nextVal = current >= 12 ? 11 : Math.max(0, current - 1);
        triggerStarBurstIfEligible(getSleepColor(nextVal));
        onSleepHoursChange(nextVal);
        break;
      }
      case 'sleepQuality': {
        const next = sleepQuality === null ? 1 : Math.max(1, sleepQuality - 1);
        triggerStarBurstIfEligible(getQualityColor(next));
        onSleepQualityChange(next);
        break;
      }
      case 'fatigueLevel': {
        const next = fatigueLevel === null ? 5 : Math.min(5, fatigueLevel + 1);
        triggerStarBurstIfEligible(getFatigueColor(next));
        onFatigueChange(next);
        break;
      }
      case 'muscleSoreness': {
        const next = muscleSoreness === null ? 5 : Math.min(5, muscleSoreness + 1);
        triggerStarBurstIfEligible(getSorenessColor(next));
        onSorenessChange(next);
        break;
      }
    }
  };

  const handleIncrement = () => {
    switch (activeMetric) {
      case 'sleepHours': {
        const next = sleepHours === null ? 1 : Math.min(12, Math.round(sleepHours + 1));
        triggerStarBurstIfEligible(getSleepColor(next));
        onSleepHoursChange(next);
        break;
      }
      case 'sleepQuality': {
        const next = sleepQuality === null ? 1 : Math.min(5, sleepQuality + 1);
        triggerStarBurstIfEligible(getQualityColor(next));
        onSleepQualityChange(next);
        break;
      }
      case 'fatigueLevel': {
        const next = fatigueLevel === null ? 5 : Math.max(1, fatigueLevel - 1);
        triggerStarBurstIfEligible(getFatigueColor(next));
        onFatigueChange(next);
        break;
      }
      case 'muscleSoreness': {
        const next = muscleSoreness === null ? 5 : Math.max(1, muscleSoreness - 1);
        triggerStarBurstIfEligible(getSorenessColor(next));
        onSorenessChange(next);
        break;
      }
    }
  };

  const handleSelectMetric = (key: MetricKey) => {
    setActiveMetric(key);
    if (isMetricAnswered(key)) {
      const val = getMetricCurrentValue(key);
      const c = getMetricCurrentColor(key, val);
      triggerStarBurstIfEligible(c);
    }
  };

  const currentVal = getMetricCurrentValue(activeMetric);

  const isMin = (() => {
    if (currentVal === null) return false;
    switch (activeMetric) {
      case 'sleepHours':
        return currentVal <= 0;
      case 'sleepQuality':
        return currentVal <= 1;
      case 'fatigueLevel':
        return currentVal >= 5;
      case 'muscleSoreness':
        return currentVal >= 5;
    }
  })();

  const isMax = (() => {
    if (currentVal === null) return false;
    switch (activeMetric) {
      case 'sleepHours':
        return currentVal >= 12;
      case 'sleepQuality':
        return currentVal >= 5;
      case 'fatigueLevel':
        return currentVal <= 1;
      case 'muscleSoreness':
        return currentVal <= 1;
    }
  })();

  const getProgressPct = (key: MetricKey) => {
    const val = getMetricCurrentValue(key);
    if (val === null) return 0;

    switch (key) {
      case 'sleepHours': {
        const rawPct = Math.min(12, val) / 12;
        return Math.min(1, Math.max(0.08, rawPct));
      }
      case 'sleepQuality': {
        const rawPct = (val - 1) / 4;
        return Math.min(1, Math.max(0.08, rawPct));
      }
      case 'fatigueLevel': {
        const rawPct = (5 - val) / 4;
        return Math.min(1, Math.max(0.08, rawPct));
      }
      case 'muscleSoreness': {
        const rawPct = (5 - val) / 4;
        return Math.min(1, Math.max(0.08, rawPct));
      }
    }
  };

  const getArcEndAngle = (key: MetricKey) => {
    const cfg = METRIC_CONFIGS[key];
    const pct = getProgressPct(key);
    if (pct <= 0) return cfg.startAngle;
    return (cfg.startAngle + pct * cfg.totalSweep) % 360;
  };

  const handleNextWithValidation = () => {
    if (pendingMetrics.length > 0) {
      setShowValidationModal(true);
      return;
    }
    if (sleepHours !== null && sleepHours >= 12) {
      setShowSleepHoursConfirmModal(true);
      return;
    }
    onNext();
  };

  return (
    <div className="checkin-main-bubble">
      <div className="pixel-mood-card">
        {/* Leves fuegos artificiales al estar en estado óptimo */}
        <SubtleFireworks active={isStarColor} triggerKey={burstKey} />

        {/* ── Cabecera Superior con Botones Circulares de Navegación ── */}
        <div className="pixel-mood-nav-wrap">
          <button
            type="button"
            onClick={onPrev}
            aria-label="Volver al paso anterior"
            className="checkin-circular-nav-btn prev"
            title="Paso anterior"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <h1
            className="pixel-slide-title"
            style={{
              fontWeight: 800,
              color: 'var(--checkin-title-color)',
              textAlign: 'center',
              letterSpacing: '-0.025em',
              flex: 1,
            }}
          >
            ¿Cómo descansaste
            <br />
            hoy?
          </h1>

          <button
            type="button"
            onClick={handleNextWithValidation}
            aria-label="Ir al siguiente paso"
            className="checkin-circular-nav-btn next"
            title="Siguiente paso"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        {/* ── Subtitle in Medium Blue ── */}
        <p
          className="pixel-slide-subtitle"
          style={{
            fontWeight: 500,
            color: 'var(--checkin-subtitle-color)',
            textAlign: 'center',
            letterSpacing: '-0.01em',
          }}
        >
          {METRIC_CONFIGS[activeMetric].name}
        </p>

        {/* ── Control Visual Central con Botones + y − ── */}
        <RecoveryHeroControl
          activeMetric={activeMetric}
          currentVal={currentVal}
          activeHeroColor={activeHeroColor}
          isStarColor={isStarColor}
          starPalette={starPalette}
          burstKey={burstKey}
          isMin={isMin}
          isMax={isMax}
          onDecrement={handleDecrement}
          onIncrement={handleIncrement}
        />

        {/* ── Medidor Radial de 4 Arcos Interactivos y Lista de Insignias ── */}
        <RecoveryRadialMeter
          activeMetric={activeMetric}
          sleepHours={sleepHours}
          sleepQuality={sleepQuality}
          fatigueLevel={fatigueLevel}
          muscleSoreness={muscleSoreness}
          onSelectMetric={handleSelectMetric}
          getArcEndAngle={getArcEndAngle}
        />
      </div>

      {/* ── Modales de Validación y Confirmación ── */}
      <RecoveryValidationModal
        open={showValidationModal}
        onClose={() => setShowValidationModal(false)}
        pendingMetrics={pendingMetrics}
        onSelectMetric={handleSelectMetric}
      />

      <RecoverySleepHoursConfirmModal
        open={showSleepHoursConfirmModal}
        onClose={() => setShowSleepHoursConfirmModal(false)}
        onConfirm={(hours) => {
          onSleepHoursChange(hours);
          setShowSleepHoursConfirmModal(false);
          onNext();
        }}
      />
    </div>
  );
};
