import React, { useRef } from 'react';
import {
  MetricKey,
  METRIC_CONFIGS,
  SVG_WIDTH,
  SVG_HEIGHT,
  CX,
  CY,
  BADGE_X,
  STROKE_WIDTH,
  ACTIVE_STROKE_WIDTH,
  HIT_TEST_STROKE_WIDTH,
  END_ANGLE,
  describeArc,
  polarToCartesian,
  getMetricFromPoint,
  getValueFromPoint,
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
  getArcEndAngle: (key: MetricKey) => number;
}

export const RecoveryRadialMeter: React.FC<RecoveryRadialMeterProps> = ({
  activeMetric,
  sleepHours,
  sleepQuality,
  fatigueLevel,
  muscleSoreness,
  onSelectMetric,
  onValueChange,
  getArcEndAngle,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const isPointerDownRef = useRef<boolean>(false);
  const activeDragMetricRef = useRef<MetricKey | null>(null);
  const lastValRef = useRef<number | null>(null);

  // ── Subtle haptic vibration for mobile tactile confirmation ──
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
      // Ignore in environments where vibration is unsupported or blocked
    }
  };

  const handleSelectWithFeedback = (key: MetricKey) => {
    if (key !== activeMetric) {
      triggerHaptic();
      onSelectMetric(key);
    }
  };

  // ── Screen coordinates to SVG viewBox conversion ──
  const getSvgCoordinates = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return null;

    try {
      const pt = svg.createSVGPoint();
      pt.x = clientX;
      pt.y = clientY;
      const ctm = svg.getScreenCTM();
      if (ctm) {
        const transformed = pt.matrixTransform(ctm.inverse());
        return { x: transformed.x, y: transformed.y };
      }
    } catch {
      // Fallback
    }

    const rect = svg.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    return {
      x: ((clientX - rect.left) / rect.width) * SVG_WIDTH,
      y: ((clientY - rect.top) / rect.height) * SVG_HEIGHT,
    };
  };

  const updateValueAtCoords = (coords: { x: number; y: number }, metric: MetricKey) => {
    if (!onValueChange) return;
    const newVal = getValueFromPoint(coords.x, coords.y, metric);
    if (newVal !== lastValRef.current) {
      lastValRef.current = newVal;
      triggerHaptic();
      onValueChange(metric, newVal);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    // If touch originates directly from an item label button, let its handler handle it
    const target = e.target as Element | null;
    if (target?.closest('.checkin-recovery-label-group')) {
      return;
    }

    const coords = getSvgCoordinates(e.clientX, e.clientY);
    if (!coords) return;

    const matched = getMetricFromPoint(coords.x, coords.y, activeMetric);
    if (matched) {
      isPointerDownRef.current = true;
      activeDragMetricRef.current = matched;
      lastValRef.current = getMetricVal(matched);
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Ignored
      }
      handleSelectWithFeedback(matched);
      updateValueAtCoords(coords, matched);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isPointerDownRef.current || !activeDragMetricRef.current) return;
    const coords = getSvgCoordinates(e.clientX, e.clientY);
    if (!coords) return;
    updateValueAtCoords(coords, activeDragMetricRef.current);
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    isPointerDownRef.current = false;
    activeDragMetricRef.current = null;
    lastValRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignored
    }
  };

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
          fill={sleepHours !== null ? 'var(--white)' : 'var(--input-placeholder)'}
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
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        className="recovery-meter-svg"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ touchAction: 'none' }}
      >
        {/* ── 1. HIT-BOXES TÁCTILES AMPLIADAS PARA CADA ANILLO (48-58px de ancho) ── */}
        {(Object.keys(METRIC_CONFIGS) as MetricKey[]).map((key) => {
          const cfg = METRIC_CONFIGS[key];
          const pathD = describeArc(CX, CY, cfg.radius, cfg.startAngle, END_ANGLE);

          return (
            <path
              key={`hitbox-${key}`}
              d={pathD}
              fill="none"
              stroke="transparent"
              strokeWidth={HIT_TEST_STROKE_WIDTH}
              strokeLinecap="round"
              className="recovery-touch-hitbox"
              onClick={() => handleSelectWithFeedback(key)}
              aria-label={`Seleccionar ${cfg.name}`}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSelectWithFeedback(key);
                }
              }}
            />
          );
        })}

        {/* ── 2. CARRILES BASE DE FONDO CON SEPARACIÓN RADIAL AMPLIA ── */}
        {(Object.keys(METRIC_CONFIGS) as MetricKey[]).map((key) => {
          const cfg = METRIC_CONFIGS[key];
          const isActive = activeMetric === key;
          const currentStroke = isActive ? ACTIVE_STROKE_WIDTH : STROKE_WIDTH;
          const pathD = describeArc(CX, CY, cfg.radius, cfg.startAngle, END_ANGLE);

          return (
            <g key={`track-group-${key}`}>
              {/* Carril base */}
              <path
                d={pathD}
                fill="none"
                stroke="var(--checkin-track-base)"
                strokeWidth={currentStroke}
                strokeLinecap="round"
                className={`recovery-track-arc ${isActive ? 'is-active' : ''}`}
                onClick={() => handleSelectWithFeedback(key)}
              />

              {/* Resplandor y borde suave del anillo seleccionado */}
              {isActive && (
                <path
                  d={pathD}
                  fill="none"
                  stroke="var(--cyan-accent)"
                  strokeWidth={ACTIVE_STROKE_WIDTH + 4}
                  strokeLinecap="round"
                  opacity={0.35}
                  className="recovery-track-highlight"
                />
              )}
            </g>
          );
        })}

        {/* ── 3. ARCOS DE PROGRESO DINÁMICOS ── */}
        {(Object.keys(METRIC_CONFIGS) as MetricKey[]).map((key) => {
          if (!isMetricAnswered(key)) return null;
          const cfg = METRIC_CONFIGS[key];
          const isActive = activeMetric === key;
          const endDeg = getArcEndAngle(key);
          const pathD = describeArc(CX, CY, cfg.radius, cfg.startAngle, endDeg);
          const dynamicColor = getMetricCurrentColor(key, getMetricVal(key));
          const currentStroke = isActive ? ACTIVE_STROKE_WIDTH : STROKE_WIDTH;

          return (
            <path
              key={`progress-${key}`}
              d={pathD}
              fill="none"
              stroke={dynamicColor}
              strokeWidth={currentStroke}
              strokeLinecap="round"
              className={`recovery-progress-arc ${isActive ? 'is-active' : ''}`}
              onClick={() => handleSelectWithFeedback(key)}
            />
          );
        })}

        {/* ── 4. CONTROL DESLIZADOR TÁCTIL (THUMB) EN EL EXTREMO DEL ARCO ACTIVO ── */}
        {isMetricAnswered(activeMetric) &&
          (() => {
            const cfg = METRIC_CONFIGS[activeMetric];
            const endDeg = getArcEndAngle(activeMetric);
            const thumbPos = polarToCartesian(CX, CY, cfg.radius, endDeg);
            const activeColor = getMetricCurrentColor(activeMetric, getMetricVal(activeMetric));

            return (
              <g
                className="recovery-thumb-group"
                style={{ pointerEvents: 'none' }}
                aria-hidden="true"
              >
                <circle
                  cx={thumbPos.x}
                  cy={thumbPos.y}
                  r={ACTIVE_STROKE_WIDTH / 2 + 1}
                  fill="var(--white)"
                  stroke={activeColor}
                  strokeWidth={4.5}
                  className="recovery-slider-thumb"
                />
                <circle cx={thumbPos.x} cy={thumbPos.y} r={5.5} fill={activeColor} />
              </g>
            );
          })()}

        {/* ── 4. ETIQUETAS E INSIGNIAS ACCESIBLES SINCRONIZADAS (Touch target >= 48px) ── */}
        {metricBadges.map((item) => {
          const cfg = METRIC_CONFIGS[item.key];
          const isActive = activeMetric === item.key;
          const posY = cfg.badgeY;

          return (
            <g
              key={`label-group-${item.key}`}
              className={`checkin-recovery-label-group ${isActive ? 'is-active' : ''}`}
              onClick={() => handleSelectWithFeedback(item.key)}
              role="button"
              tabIndex={0}
              aria-label={`Seleccionar indicador ${item.label}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSelectWithFeedback(item.key);
                }
              }}
            >
              {/* Hit target transparente envolvente de toda la fila para selección táctil con una mano */}
              <rect
                x={0}
                y={posY - 26}
                width={BADGE_X + 26}
                height={52}
                fill="transparent"
                className="recovery-label-touch-target"
              />

              {/* Texto del nombre del indicador */}
              <text
                x={BADGE_X - 22}
                y={posY + 5.5}
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
                  r="16"
                  fill="none"
                  stroke="var(--cyan-accent)"
                  strokeWidth="2"
                  className="recovery-badge-halo"
                />
              )}

              {/* Grupo del logo / insignia */}
              <g className={isActive ? 'recovery-badge-blinking' : undefined}>
                <circle
                  cx={BADGE_X}
                  cy={posY}
                  r="15"
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
