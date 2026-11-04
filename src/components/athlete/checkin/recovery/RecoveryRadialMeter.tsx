import React from 'react';
import {
  MetricKey,
  METRIC_CONFIGS,
  SVG_WIDTH,
  SVG_HEIGHT,
  CX,
  CY,
  BADGE_X,
  STROKE_WIDTH,
  describeArc,
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
  getArcEndAngle: (key: MetricKey) => number;
}

export const RecoveryRadialMeter: React.FC<RecoveryRadialMeterProps> = ({
  activeMetric,
  sleepHours,
  sleepQuality,
  fatigueLevel,
  muscleSoreness,
  onSelectMetric,
  getArcEndAngle,
}) => {
  const isMetricAnswered = (key: MetricKey): boolean => {
    switch (key) {
      case 'sleepHours':
        return sleepHours !== null;
      case 'sleepQuality':
        return sleepQuality !== null;
      case 'fatigueLevel':
        return fatigueLevel !== null;
      case 'muscleSoreness':
        return muscleSoreness !== null;
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

  const metricBadges = [
    {
      key: 'sleepHours' as MetricKey,
      label: 'Horas de sueño',
      color: sleepHours !== null ? getSleepColor(sleepHours) : 'var(--checkin-scale-neutral)',
      isAnswered: sleepHours !== null,
      icon: (
        <path
          d="M 16 8 A 6.5 6.5 0 1 1 9 1.5 A 5 5 0 0 0 16 8 Z"
          fill={sleepHours !== null ? 'var(--checkin-star-gold)' : 'var(--input-placeholder)'}
          transform="translate(-8.5, -8.5)"
        />
      ),
    },
    {
      key: 'sleepQuality' as MetricKey,
      label: 'Calidad del descanso',
      color: sleepQuality !== null ? getQualityColor(sleepQuality) : 'var(--checkin-scale-neutral)',
      isAnswered: sleepQuality !== null,
      icon: (
        <path
          d="M 9.5 2 L 3 10.5 L 8.5 10.5 L 6.5 17 L 15 7.5 L 9.5 7.5 Z"
          fill={sleepQuality !== null ? 'var(--white)' : 'var(--input-placeholder)'}
          transform="translate(-9, -9.5)"
        />
      ),
    },
    {
      key: 'fatigueLevel' as MetricKey,
      label: 'Nivel de fatiga muscular',
      color: fatigueLevel !== null ? getFatigueColor(fatigueLevel) : 'var(--checkin-scale-neutral)',
      isAnswered: fatigueLevel !== null,
      icon: (
        <g transform="translate(-8.5, -6.5)">
          <rect
            x="1"
            y="2"
            width="13"
            height="9"
            rx="2.2"
            stroke={fatigueLevel !== null ? 'var(--white)' : 'var(--input-placeholder)'}
            strokeWidth="1.6"
            fill="none"
          />
          <rect
            x="15"
            y="4.8"
            width="1.8"
            height="3.4"
            rx="0.8"
            fill={fatigueLevel !== null ? 'var(--white)' : 'var(--input-placeholder)'}
          />
          <rect
            x="2.6"
            y="3.6"
            width={Math.max(1.8, ((6 - (fatigueLevel ?? 6)) / 5) * 9.8)}
            height="5.8"
            rx="1"
            fill={fatigueLevel !== null ? 'var(--white)' : 'var(--checkin-scale-neutral)'}
            style={{ transition: 'width 0.25s ease' }}
          />
        </g>
      ),
    },
    {
      key: 'muscleSoreness' as MetricKey,
      label: 'Dolor muscular',
      color:
        muscleSoreness !== null ? getSorenessColor(muscleSoreness) : 'var(--checkin-scale-neutral)',
      isAnswered: muscleSoreness !== null,
      icon: (
        <g transform="translate(-8.5, -8.5)">
          {renderBicepsMuscle(
            17,
            muscleSoreness !== null
              ? getSorenessColor(muscleSoreness)
              : 'var(--checkin-scale-neutral)',
            muscleSoreness !== null ? 'var(--white)' : 'var(--input-placeholder)',
          )}
        </g>
      ),
    },
  ];

  return (
    <div className="recovery-meter-wrap">
      <svg viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} className="recovery-meter-svg">
        {/* 1. ARCOS DE FONDO (CARRILES BASE) */}
        {(Object.keys(METRIC_CONFIGS) as MetricKey[]).map((key) => {
          const cfg = METRIC_CONFIGS[key];
          const isActive = activeMetric === key;
          const pathD = describeArc(CX, CY, cfg.radius, cfg.startAngle, 222);

          return (
            <g key={`track-group-${key}`}>
              <path
                d={pathD}
                fill="none"
                stroke="var(--checkin-track-base)"
                strokeWidth={STROKE_WIDTH}
                strokeLinecap="round"
                className="recovery-track-arc"
                onClick={() => onSelectMetric(key)}
              />
              {isActive && (
                <path
                  d={pathD}
                  fill="none"
                  stroke="var(--cyan-accent)"
                  strokeWidth={STROKE_WIDTH + 2.5}
                  strokeLinecap="round"
                  opacity={0.7}
                  className="recovery-track-highlight"
                />
              )}
            </g>
          );
        })}

        {/* 2. ARCOS DE PROGRESO DINÁMICOS */}
        {(Object.keys(METRIC_CONFIGS) as MetricKey[]).map((key) => {
          if (!isMetricAnswered(key)) return null;
          const cfg = METRIC_CONFIGS[key];
          const isActive = activeMetric === key;
          const endDeg = getArcEndAngle(key);
          const pathD = describeArc(CX, CY, cfg.radius, cfg.startAngle, endDeg);
          const dynamicColor = getMetricCurrentColor(key, getMetricVal(key));

          return (
            <path
              key={`progress-${key}`}
              d={pathD}
              fill="none"
              stroke={dynamicColor}
              strokeWidth={isActive ? STROKE_WIDTH + 1 : STROKE_WIDTH}
              strokeLinecap="round"
              className={`recovery-progress-arc ${isActive ? 'is-active' : ''}`}
              onClick={() => onSelectMetric(key)}
            />
          );
        })}

        {/* 3. ETIQUETAS E INSIGNIAS CIRCULARES */}
        {metricBadges.map((item) => {
          const cfg = METRIC_CONFIGS[item.key];
          const isActive = activeMetric === item.key;
          const posY = cfg.badgeY;

          return (
            <g
              key={`label-group-${item.key}`}
              className="checkin-recovery-label-group"
              onClick={() => onSelectMetric(item.key)}
              role="button"
              tabIndex={-1}
              aria-label={`Seleccionar ${item.label}`}
            >
              <text
                x={BADGE_X - 18}
                y={posY + 5}
                textAnchor="end"
                className={`recovery-badge-text ${isActive ? 'is-active' : ''}`}
                fill={
                  isActive
                    ? 'var(--brand-blue)'
                    : item.isAnswered
                      ? 'var(--checkin-title-color)'
                      : 'var(--checkin-subtitle-color)'
                }
              >
                {item.label}
                {!item.isAnswered ? ' (Neutro)' : ''}
              </text>

              {/* Halo pulsante celeste detrás del logo si está seleccionado */}
              {isActive && (
                <circle
                  cx={BADGE_X}
                  cy={posY}
                  r="14"
                  fill="none"
                  stroke="var(--cyan-accent)"
                  className="recovery-badge-halo"
                />
              )}

              {/* Grupo del logo */}
              <g className={isActive ? 'recovery-badge-blinking' : undefined}>
                <circle
                  cx={BADGE_X}
                  cy={posY}
                  r="14"
                  fill={item.isAnswered ? item.color : 'var(--checkin-counter-bg)'}
                  stroke={
                    isActive
                      ? 'var(--cyan-accent)'
                      : item.isAnswered
                        ? 'var(--checkin-inner-bg)'
                        : 'var(--border)'
                  }
                  strokeWidth={isActive ? '2.5' : '1.5'}
                  strokeDasharray={item.isAnswered ? 'none' : '3 2'}
                  className="recovery-badge-circle"
                />
                <g transform={`translate(${BADGE_X}, ${posY})`}>{item.icon}</g>
              </g>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
