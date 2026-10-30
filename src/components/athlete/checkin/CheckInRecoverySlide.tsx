import React, { useState, useEffect, useRef } from 'react';
import { SubtleFireworks } from './SubtleFireworks';

export interface CheckInRecoverySlideProps {
  sleepHours: number | null;
  onSleepHoursChange: (val: number | null) => void;
  sleepQuality: number | null;
  onSleepQualityChange: (val: number | null) => void;
  fatigueLevel: number | null;
  onFatigueChange: (val: number | null) => void;
  muscleSoreness: number | null;
  onSorenessChange: (val: number | null) => void;
  onPrev: () => void;
  onNext: () => void;
}

export type MetricKey = 'sleepHours' | 'sleepQuality' | 'fatigueLevel' | 'muscleSoreness';

const QUALITY_LABELS: Record<number, string> = {
  1: 'muy mala',
  2: 'mala',
  3: 'regular',
  4: 'buena',
  5: 'excelente',
};

const FATIGUE_LABELS: Record<number, string> = {
  1: 'enérgico',
  2: 'fresco',
  3: 'moderada',
  4: 'alta',
  5: 'agotado',
};

const SORENESS_LABELS: Record<number, string> = {
  1: 'sin dolor',
  2: 'leve',
  3: 'molestia',
  4: 'fuerte',
  5: 'muy intenso',
};

// ── Paleta de colores exacta solicitada por el usuario ──
// Peores: Marrón -> Naranja -> Amarillo -> Verde -> Violeta (Mejores)
// Base (sin pintar): Gris azulado muy claro #EDF2F7
const COLOR_SCALE = {
  brown: '#6D381E', // Peor / Crítico
  orange: '#FF6B00', // Alerta alta
  yellow: '#FFB703', // Regular / Moderado
  green: '#00A859', // Favorable / Bueno
  violet: '#8E24AA', // Óptimo / Excelente
  trackBase: 'var(--checkin-track-base)', // Carril base sin pintar
};

// ── Partículas para la ráfaga de estrellitas al estar en Violeta o Verde Claro ──
const BURST_STARS = [
  {
    id: 1,
    angle: -85,
    distance: 72,
    size: 18,
    type: 'four' as const,
    delay: 0,
    rot: 45,
    colorIdx: 0,
  },
  {
    id: 2,
    angle: -60,
    distance: 88,
    size: 14,
    type: 'five' as const,
    delay: 40,
    rot: -30,
    colorIdx: 1,
  },
  {
    id: 3,
    angle: -35,
    distance: 68,
    size: 20,
    type: 'four' as const,
    delay: 20,
    rot: 75,
    colorIdx: 2,
  },
  {
    id: 4,
    angle: -10,
    distance: 82,
    size: 15,
    type: 'five' as const,
    delay: 60,
    rot: 90,
    colorIdx: 0,
  },
  {
    id: 5,
    angle: 15,
    distance: 75,
    size: 17,
    type: 'four' as const,
    delay: 10,
    rot: -45,
    colorIdx: 1,
  },
  {
    id: 6,
    angle: 40,
    distance: 90,
    size: 13,
    type: 'five' as const,
    delay: 50,
    rot: 30,
    colorIdx: 2,
  },
  {
    id: 7,
    angle: 65,
    distance: 70,
    size: 19,
    type: 'four' as const,
    delay: 30,
    rot: 60,
    colorIdx: 0,
  },
  {
    id: 8,
    angle: 90,
    distance: 84,
    size: 14,
    type: 'five' as const,
    delay: 70,
    rot: -60,
    colorIdx: 1,
  },
  {
    id: 9,
    angle: 120,
    distance: 66,
    size: 16,
    type: 'four' as const,
    delay: 15,
    rot: 40,
    colorIdx: 2,
  },
  {
    id: 10,
    angle: 150,
    distance: 78,
    size: 13,
    type: 'five' as const,
    delay: 45,
    rot: -45,
    colorIdx: 0,
  },
  {
    id: 11,
    angle: 180,
    distance: 64,
    size: 18,
    type: 'four' as const,
    delay: 25,
    rot: 90,
    colorIdx: 1,
  },
  {
    id: 12,
    angle: 210,
    distance: 80,
    size: 14,
    type: 'five' as const,
    delay: 65,
    rot: -30,
    colorIdx: 2,
  },
  {
    id: 13,
    angle: 240,
    distance: 68,
    size: 16,
    type: 'four' as const,
    delay: 35,
    rot: 60,
    colorIdx: 0,
  },
  {
    id: 14,
    angle: 265,
    distance: 86,
    size: 13,
    type: 'five' as const,
    delay: 55,
    rot: -75,
    colorIdx: 1,
  },
  {
    id: 15,
    angle: 290,
    distance: 70,
    size: 18,
    type: 'four' as const,
    delay: 10,
    rot: 45,
    colorIdx: 2,
  },
  {
    id: 16,
    angle: 320,
    distance: 85,
    size: 14,
    type: 'five' as const,
    delay: 50,
    rot: -20,
    colorIdx: 0,
  },
];

// Estrellitas ambientales continuas que titilan suavemente alrededor de la burbuja
const AMBIENT_STARS = [
  {
    id: 'a1',
    x: -56,
    y: -26,
    size: 16,
    type: 'four' as const,
    duration: 2.2,
    delay: 0,
    colorIdx: 0,
  },
  {
    id: 'a2',
    x: 54,
    y: -28,
    size: 15,
    type: 'five' as const,
    duration: 2.6,
    delay: 0.5,
    colorIdx: 1,
  },
  {
    id: 'a3',
    x: -62,
    y: 16,
    size: 13,
    type: 'five' as const,
    duration: 2.4,
    delay: 0.9,
    colorIdx: 2,
  },
  {
    id: 'a4',
    x: 58,
    y: 14,
    size: 17,
    type: 'four' as const,
    duration: 2.8,
    delay: 0.3,
    colorIdx: 0,
  },
  {
    id: 'a5',
    x: -20,
    y: -54,
    size: 12,
    type: 'five' as const,
    duration: 2.3,
    delay: 1.2,
    colorIdx: 1,
  },
  {
    id: 'a6',
    x: 24,
    y: -52,
    size: 15,
    type: 'four' as const,
    duration: 2.5,
    delay: 0.7,
    colorIdx: 2,
  },
];

function renderStarSvg(type: 'four' | 'five', size: number, color: string) {
  if (type === 'four') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="-10 -10 20 20"
        style={{ display: 'block', overflow: 'visible' }}
      >
        <path
          d="M 0 -10 Q 0 0 10 0 Q 0 0 0 10 Q 0 0 -10 0 Q 0 0 0 -10 Z"
          fill={color}
          filter="drop-shadow(0px 0px 4px rgba(255, 255, 255, 0.85)) drop-shadow(0px 0px 2px rgba(0, 0, 0, 0.15))"
        />
      </svg>
    );
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="-10 -10 20 20"
      style={{ display: 'block', overflow: 'visible' }}
    >
      <polygon
        points="0,-10 2.9,-3.1 9.5,-3.1 4.2,1.2 6.2,8.1 0,3.8 -6.2,8.1 -4.2,1.2 -9.5,-3.1 -2.9,-3.1"
        fill={color}
        filter="drop-shadow(0px 0px 4px rgba(255, 255, 255, 0.85)) drop-shadow(0px 0px 2px rgba(0, 0, 0, 0.15))"
      />
    </svg>
  );
}

// ── Geometría SVG Matemática ──
const SVG_WIDTH = 510;
const SVG_HEIGHT = 390;
const CX = 310;
const CY = 196;
const BADGE_X = 265;
const STROKE_WIDTH = 27;
const END_ANGLE = 222;

export interface MetricConfig {
  key: MetricKey;
  name: string;
  radius: number;
  min: number;
  max: number;
  step: number;
  badgeY: number;
  startAngle: number;
  totalSweep: number;
}

function calculateMetricConfig(
  key: MetricKey,
  name: string,
  radius: number,
  min: number,
  max: number,
  step: number,
): MetricConfig {
  const dx = CX - BADGE_X; // 45
  const dy = Math.sqrt(Math.max(0, radius * radius - dx * dx));
  const badgeY = CY - dy;
  const alphaDeg = Math.asin(dx / radius) * (180 / Math.PI);
  const startAngle = 360 - alphaDeg; // Ángulo polar (0° = 12 en punto, sentido horario)
  let totalSweep = END_ANGLE - startAngle;
  if (totalSweep < 0) totalSweep += 360;

  return {
    key,
    name,
    radius,
    min,
    max,
    step,
    badgeY,
    startAngle,
    totalSweep,
  };
}

const METRIC_CONFIGS: Record<MetricKey, MetricConfig> = {
  sleepHours: calculateMetricConfig('sleepHours', 'Horas de sueño', 178, 0, 12, 1),
  sleepQuality: calculateMetricConfig('sleepQuality', 'Calidad del descanso', 146, 1, 5, 1),
  fatigueLevel: calculateMetricConfig('fatigueLevel', 'Nivel de fatiga muscular', 114, 1, 5, 1),
  muscleSoreness: calculateMetricConfig('muscleSoreness', 'Dolor muscular', 82, 1, 5, 1),
};

// Conversión polar a cartesiana (0° = 12 en punto, sentido horario)
function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number,
) {
  const radians = (angleInDegrees * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.sin(radians),
    y: centerY - radius * Math.cos(radians),
  };
}

// Genera el path SVG para un arco que barre en sentido horario de startAngle a endAngle
function describeArc(x: number, y: number, radius: number, startAngle: number, endAngle: number) {
  let sweep = endAngle - startAngle;
  if (sweep < 0) sweep += 360;

  const startPt = polarToCartesian(x, y, radius, startAngle);
  const endPt = polarToCartesian(x, y, radius, endAngle);
  const largeArcFlag = sweep > 180 ? 1 : 0;

  return `M ${startPt.x} ${startPt.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endPt.x} ${endPt.y}`;
}

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
  const answeredCount = 4 - pendingMetrics.length;

  // 1. Escala exacta de colores para Horas de sueño:
  // 0 a 3 hs: MARRON
  // 4 hs: NARANJA
  // 5 hs: AMARILLO
  // 6 a 7 hs: VERDE
  // 8 a 12 hs: VIOLETA
  const getSleepColor = (hours: number): string => {
    if (hours <= 3) return COLOR_SCALE.brown; // 0 a 3 hs: MARRON
    if (hours === 4) return COLOR_SCALE.orange; // 4 hs: NARANJA
    if (hours === 5) return COLOR_SCALE.yellow; // 5 hs: AMARILLO
    if (hours <= 7) return COLOR_SCALE.green; // 6 a 7 hs: VERDE
    return COLOR_SCALE.violet; // 8 a 12 hs: VIOLETA
  };

  // 2. Escala de colores para Calidad del descanso (1 a 5)
  const getQualityColor = (quality: number): string => {
    switch (quality) {
      case 1:
        return COLOR_SCALE.brown; // Muy mala - Peor
      case 2:
        return COLOR_SCALE.orange; // Mala
      case 3:
        return COLOR_SCALE.yellow; // Regular
      case 4:
        return COLOR_SCALE.green; // Buena
      case 5:
        return COLOR_SCALE.violet; // Excelente - Mejor
      default:
        return COLOR_SCALE.green;
    }
  };

  // 3. Escala de colores para Nivel de fatiga muscular (1 a 5, 5 es peor)
  const getFatigueColor = (fatigue: number): string => {
    switch (fatigue) {
      case 1:
        return COLOR_SCALE.violet; // Fresco / Enérgico - Mejor
      case 2:
        return COLOR_SCALE.green; // Ligera
      case 3:
        return COLOR_SCALE.yellow; // Moderada
      case 4:
        return COLOR_SCALE.orange; // Alta fatiga
      case 5:
        return COLOR_SCALE.brown; // Agotado - Peor
      default:
        return COLOR_SCALE.orange;
    }
  };

  // 4. Escala de colores para Dolor muscular (1 a 5, 5 es peor)
  // 1: violeta, 2: verde claro, 3: amarillo, 4: naranja, 5: marrón
  const getSorenessColor = (soreness: number): string => {
    switch (soreness) {
      case 1:
        return COLOR_SCALE.violet; // Sin dolor -> 1 violeta
      case 2:
        return COLOR_SCALE.green; // Leve -> 2 verde claro
      case 3:
        return COLOR_SCALE.yellow; // Molestia -> 3 amarillo
      case 4:
        return COLOR_SCALE.orange; // Fuerte -> 4 naranja
      case 5:
        return COLOR_SCALE.brown; // Muy intenso -> 5 marrón
      default:
        return COLOR_SCALE.violet;
    }
  };

  // Obtener el color actual de cualquier métrica
  const getMetricCurrentColor = (key: MetricKey): string => {
    const val = getMetricCurrentValue(key);
    if (val === null) return '#CBD5E1';
    switch (key) {
      case 'sleepHours':
        return getSleepColor(val);
      case 'sleepQuality':
        return getQualityColor(val);
      case 'fatigueLevel':
        return getFatigueColor(val);
      case 'muscleSoreness':
        return getSorenessColor(val);
    }
  };

  const getActiveHeroColor = (): string => {
    if (!isMetricAnswered(activeMetric)) {
      return '#F1F5F9';
    }
    return getMetricCurrentColor(activeMetric);
  };

  const [burstKey, setBurstKey] = useState(0);

  const activeHeroColor = getActiveHeroColor();
  const isStarColor =
    isMetricAnswered(activeMetric) &&
    (activeHeroColor === COLOR_SCALE.violet || activeHeroColor === COLOR_SCALE.green);

  // Paleta de colores de estrellitas según si es Violeta o Verde
  const starPalette =
    activeHeroColor === COLOR_SCALE.violet
      ? ['#FBBF24', '#C084FC', '#F472B6']
      : ['#FBBF24', '#4ADE80', '#FEF08A'];

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
  // Al darle '+' para iniciar desde neutro:
  // - Horas de sueño: 1 hora
  // - Calidad de sueño: 1 ('muy mala')
  // - Fatiga muscular: 5 ('agotado')
  // - Dolor muscular: 5 ('muy intenso')
  // Después de iniciar, '+' progresa hacia la excelencia/bienestar y '−' hacia el peor estado.
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
        // En fatiga: 1 es Enérgico (Mejor) y 5 es Agotado (Peor / Inicio).
        const next = fatigueLevel === null ? 5 : Math.min(5, fatigueLevel + 1);
        triggerStarBurstIfEligible(getFatigueColor(next));
        onFatigueChange(next);
        break;
      }
      case 'muscleSoreness': {
        // En dolor: 1 es Sin dolor (Mejor) y 5 es Muy intenso (Peor / Inicio).
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
        // Iniciar en 1 hora de sueño
        const next = sleepHours === null ? 1 : Math.min(12, Math.round(sleepHours + 1));
        triggerStarBurstIfEligible(getSleepColor(next));
        onSleepHoursChange(next);
        break;
      }
      case 'sleepQuality': {
        // Iniciar en 1: muy mala
        const next = sleepQuality === null ? 1 : Math.min(5, sleepQuality + 1);
        triggerStarBurstIfEligible(getQualityColor(next));
        onSleepQualityChange(next);
        break;
      }
      case 'fatigueLevel': {
        // Iniciar en 5: agotado. Luego '+' progresa hacia 1: enérgico
        const next = fatigueLevel === null ? 5 : Math.max(1, fatigueLevel - 1);
        triggerStarBurstIfEligible(getFatigueColor(next));
        onFatigueChange(next);
        break;
      }
      case 'muscleSoreness': {
        // Iniciar en 5: muy intenso. Luego '+' progresa hacia 1: sin dolor
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
      const c = getMetricCurrentColor(key);
      triggerStarBurstIfEligible(c);
    }
  };

  const activeCfg = METRIC_CONFIGS[activeMetric];
  const currentVal = getMetricCurrentValue(activeMetric);

  // Límites según el sentido de bienestar de cada métrica:
  // isMax = Está en lo mejor (Excelente / 100% de la barra) -> Botón + deshabilitado
  // isMin = Está en lo peor (Muy mala / Mínimo de la barra) -> Botón − deshabilitado
  const isMin = (() => {
    if (currentVal === null) return false;
    switch (activeMetric) {
      case 'sleepHours':
        return currentVal <= 0;
      case 'sleepQuality':
        return currentVal <= 1;
      case 'fatigueLevel':
        return currentVal >= 5; // 5 es el peor estado (Agotado)
      case 'muscleSoreness':
        return currentVal >= 5; // 5 es el peor estado (Muy intenso)
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
        return currentVal <= 1; // 1 es el mejor estado (Enérgico / Excelente)
      case 'muscleSoreness':
        return currentVal <= 1; // 1 es el mejor estado (Sin dolor / Excelente)
    }
  })();

  // Fracción de progreso para cada arco (0 a 1)
  // En las 4 métricas, Excelente da la barra completa (1.0 = 100%, violeta)
  const getProgressPct = (key: MetricKey) => {
    const val = getMetricCurrentValue(key);
    if (val === null) return 0;

    switch (key) {
      case 'sleepHours': {
        // 0 a 12 hs -> 12 hs o más es 100% (completa)
        const rawPct = Math.min(12, val) / 12;
        return Math.min(1, Math.max(0.08, rawPct));
      }
      case 'sleepQuality': {
        // 1 (muy mala) a 5 (excelente) -> 5 es 100% (completa)
        const rawPct = (val - 1) / 4;
        return Math.min(1, Math.max(0.08, rawPct));
      }
      case 'fatigueLevel': {
        // 1 (enérgico / excelente) a 5 (agotado) -> 1 es 100% (completa)
        const rawPct = (5 - val) / 4;
        return Math.min(1, Math.max(0.08, rawPct));
      }
      case 'muscleSoreness': {
        // 1 (sin dolor / excelente) a 5 (muy intenso) -> 1 es 100% (completa)
        const rawPct = (5 - val) / 4;
        return Math.min(1, Math.max(0.08, rawPct));
      }
    }
  };

  // Ángulo de fin para el arco de progreso coloreado
  const getArcEndAngle = (key: MetricKey) => {
    const cfg = METRIC_CONFIGS[key];
    const pct = getProgressPct(key);
    const sweep = cfg.totalSweep * pct;
    return (cfg.startAngle + sweep) % 360;
  };

  // Render del ícono de músculo bíceps flexionado
  const renderBicepsMuscle = (size: number, innerLineColor: string, mainFill = '#FFFFFF') => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={mainFill}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'block' }}
    >
      <path
        d="M12.409 13.017A5 5 0 0 1 22 15c0 3.866-4 7-9 7-4.077 0-8.153-.82-10.371-2.462-.426-.316-.631-.832-.62-1.362C2.118 12.723 2.627 2 10 2a3 3 0 0 1 3 3 2 2 0 0 1-2 2c-1.105 0-1.64-.444-2-1"
        fill={mainFill}
      />
      <path d="M15 14a5 5 0 0 0-7.584 2" stroke={innerLineColor} strokeWidth="1.8" />
      <path d="M9.964 6.825C8.019 7.977 9.5 13 8 15" stroke={innerLineColor} strokeWidth="1.8" />
    </svg>
  );

  // Renderizado del ícono superior hero (76px)
  const renderHeroIcon = () => {
    const isAnswered = isMetricAnswered(activeMetric);
    switch (activeMetric) {
      case 'sleepHours':
        return (
          <svg
            width="38"
            height="38"
            viewBox="0 0 24 24"
            fill={isAnswered ? '#FFD166' : '#94A3B8'}
            stroke="none"
          >
            <path d="M 21 12.79 A 9 9 0 1 1 11.21 3 A 7 7 0 0 0 21 12.79 Z" />
          </svg>
        );
      case 'sleepQuality':
        return (
          <svg
            width="38"
            height="38"
            viewBox="0 0 24 24"
            fill={isAnswered ? '#FFFFFF' : '#94A3B8'}
            stroke="none"
          >
            <path d="M 13 2 L 4 14 L 11 14 L 9 22 L 20 10 L 13 10 Z" />
          </svg>
        );
      case 'fatigueLevel':
        return (
          <svg width="42" height="42" viewBox="0 0 32 20" fill="none">
            <rect
              x="2"
              y="2"
              width="24"
              height="16"
              rx="3.5"
              stroke={isAnswered ? '#FFFFFF' : '#94A3B8'}
              strokeWidth="2.4"
            />
            <path
              d="M 28 7 C 29.2 7 30 7.8 30 9 L 30 11 C 30 12.2 29.2 13 28 13"
              stroke={isAnswered ? '#FFFFFF' : '#94A3B8'}
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            {Array.from({ length: 5 }).map((_, i) => {
              const barLevel = i + 1;
              const energyBars = fatigueLevel !== null ? 6 - fatigueLevel : 0;
              const isFilled = isAnswered && energyBars >= barLevel;
              return (
                <rect
                  key={i}
                  x={4 + i * 4.4}
                  y="5.5"
                  width="3.2"
                  height="9"
                  rx="1"
                  fill={isFilled ? '#FFFFFF' : isAnswered ? 'rgba(255,255,255,0.25)' : '#CBD5E1'}
                  style={{ transition: 'fill 0.25s ease' }}
                />
              );
            })}
          </svg>
        );
      case 'muscleSoreness':
        return renderBicepsMuscle(
          38,
          isAnswered ? 'rgba(0,0,0,0.22)' : '#CBD5E1',
          isAnswered ? '#FFFFFF' : '#94A3B8',
        );
    }
  };

  // Renderizado del valor central destacado con altura y alineación estables
  const renderCentralValue = () => {
    if (!isMetricAnswered(activeMetric)) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            gap: '0.15rem',
          }}
        >
          <span
            style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '1.9rem',
              fontWeight: 900,
              color: '#94A3B8',
              letterSpacing: '-0.02em',
              lineHeight: 1,
            }}
          >
            Sin responder
          </span>
          <span
            style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '0.78rem',
              fontWeight: 700,
              color: '#64748B',
              letterSpacing: '0.02em',
              lineHeight: 1,
            }}
          >
            Estado Neutro · Tocá + o −
          </span>
        </div>
      );
    }

    switch (activeMetric) {
      case 'sleepHours':
        return (
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'center',
              gap: '0.35rem',
              height: '100%',
            }}
          >
            <span
              style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '3.1rem',
                fontWeight: 900,
                color: 'var(--checkin-title-color)',
                lineHeight: 1,
                letterSpacing: '-0.03em',
              }}
            >
              {sleepHours !== null && sleepHours >= 12 ? 12 : sleepHours}
            </span>
            <span
              style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: sleepHours !== null && sleepHours >= 12 ? '1.15rem' : '1.4rem',
                fontWeight: 900,
                color: 'var(--checkin-title-color)',
                lineHeight: 1,
                whiteSpace: 'nowrap',
              }}
            >
              {sleepHours !== null && sleepHours >= 12 ? 'hrs o más' : 'hs'}
            </span>
          </div>
        );
      case 'sleepQuality':
        return (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
            }}
          >
            <span
              style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '2.25rem',
                fontWeight: 900,
                color: getQualityColor(sleepQuality!),
                textTransform: 'capitalize',
                lineHeight: 1,
                letterSpacing: '-0.02em',
                transition: 'color 0.25s ease',
              }}
            >
              {QUALITY_LABELS[sleepQuality!]}
            </span>
          </div>
        );
      case 'fatigueLevel':
        return (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
            }}
          >
            <span
              style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '2.25rem',
                fontWeight: 900,
                color: getFatigueColor(fatigueLevel!),
                textTransform: 'capitalize',
                lineHeight: 1,
                letterSpacing: '-0.02em',
                transition: 'color 0.25s ease',
              }}
            >
              {FATIGUE_LABELS[fatigueLevel!]}
            </span>
          </div>
        );
      case 'muscleSoreness':
        return (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
            }}
          >
            <span
              style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '2.25rem',
                fontWeight: 900,
                color: getSorenessColor(muscleSoreness!),
                textTransform: 'capitalize',
                lineHeight: 1,
                letterSpacing: '-0.02em',
                transition: 'color 0.25s ease',
              }}
            >
              {SORENESS_LABELS[muscleSoreness!]}
            </span>
          </div>
        );
    }
  };

  const renderSubtitleText = () => {
    if (answeredCount === 0) {
      return 'Estado neutro inicial · Todas las opciones están sin pintar. Movelas con + o − para responder.';
    }
    if (answeredCount === 4) {
      const sleepText = sleepHours === 12 ? '12 horas o más' : `${sleepHours} horas`;
      return `Dormiste ${sleepText} · Calidad ${QUALITY_LABELS[sleepQuality!]} · Fatiga ${FATIGUE_LABELS[fatigueLevel!]} · Dolor ${SORENESS_LABELS[muscleSoreness!]}.`;
    }
    const pendingNames = pendingMetrics.map((m) => m.label).join(', ');
    return `${answeredCount} de 4 completadas · Debés mover de neutro: ${pendingNames}.`;
  };

  const handleNextClick = () => {
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
    <div
      className="pixel-recovery-screen-container"
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0.2rem 0',
        userSelect: 'none',
      }}
    >
      {/* ── Tarjeta Principal Adaptable ── */}
      <div
        className="pixel-slide-card"
        style={{
          width: '100%',
          maxWidth: '820px',
          height: 'auto',
          minHeight: 'auto',
          background: 'var(--checkin-card-bg)',
          borderRadius: '28px',
          border: '1.5px solid var(--checkin-card-border)',
          boxShadow: 'var(--checkin-card-shadow)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          overflow: 'visible',
          boxSizing: 'border-box',
          position: 'relative',
          transition: 'background-color 0.25s ease, border-color 0.25s ease',
        }}
      >
        {/* Leves fuegos artificiales al estar en estado excelente (violeta) */}
        <SubtleFireworks active={activeHeroColor === COLOR_SCALE.violet} triggerKey={burstKey} />

        {/* ── Cabecera Superior con Botones Circulares de Navegación a la altura del Título ── */}
        <div
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '0.35rem',
            position: 'relative',
          }}
        >
          {/* Botón Circular Atrás (←) */}
          {onPrev ? (
            <button
              type="button"
              onClick={onPrev}
              aria-label="Volver atrás"
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
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          ) : (
            <div style={{ width: '40px', minWidth: '40px' }} />
          )}

          {/* Título Central */}
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
            ¿Cómo fue tu descanso
            <br />y recuperación?
          </h1>

          {/* Botón Circular Siguiente (→) */}
          <button
            type="button"
            onClick={handleNextClick}
            disabled={pendingMetrics.length > 0}
            aria-label={
              pendingMetrics.length > 0
                ? 'Debés mover y responder las 4 opciones de su estado neutro para continuar'
                : 'Ir al siguiente paso'
            }
            title={
              pendingMetrics.length > 0
                ? `Debés mover del estado neutro: ${pendingMetrics.map((p) => p.label).join(', ')}`
                : 'Siguiente paso'
            }
            className="checkin-circular-nav-btn next"
            style={{
              opacity: pendingMetrics.length > 0 ? 0.45 : 1,
              filter: pendingMetrics.length > 0 ? 'grayscale(0.4)' : 'none',
              cursor: pendingMetrics.length > 0 ? 'not-allowed' : 'pointer',
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        {/* ── Subtítulo centrado en gris con el resumen de las 4 opciones elegidas ── */}
        <p
          className="pixel-slide-subtitle"
          style={{
            fontWeight: 500,
            color: 'var(--checkin-subtitle-color)',
            textAlign: 'center',
            letterSpacing: '-0.01em',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {renderSubtitleText()}
        </p>

        {/* ── Hero Bubble Superior con Efecto de Estrellitas (Violeta o Verde Claro) ── */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Estilos CSS de animación para las estrellitas y modales */}
          <style>{`
            @keyframes starBurstFly {
              0% {
                transform: translate(-50%, -50%) translate(0, 0) scale(0) rotate(0deg);
                opacity: 1;
              }
              35% {
                transform: translate(-50%, -50%) translate(calc(var(--star-dx) * 0.5), calc(var(--star-dy) * 0.5)) scale(1.35) rotate(calc(var(--star-rot) * 0.5));
                opacity: 1;
              }
              75% {
                transform: translate(-50%, -50%) translate(calc(var(--star-dx) * 0.9), calc(var(--star-dy) * 0.9)) scale(1) rotate(calc(var(--star-rot) * 0.9));
                opacity: 0.95;
              }
              100% {
                transform: translate(-50%, -50%) translate(var(--star-dx), var(--star-dy)) scale(0) rotate(var(--star-rot));
                opacity: 0;
              }
            }

            @keyframes starAmbientTwinkle {
              0%, 100% {
                transform: translate(-50%, -50%) scale(0.65) rotate(0deg);
                opacity: 0.25;
              }
              50% {
                transform: translate(-50%, -50%) scale(1.2) rotate(25deg);
                opacity: 1;
              }
            }

            @keyframes fadeInValidationBackdrop {
              from { opacity: 0; }
              to { opacity: 1; }
            }

            @keyframes scaleUpValidationBox {
              from { transform: scale(0.92); opacity: 0; }
              to { transform: scale(1); opacity: 1; }
            }

            @keyframes logoBlink {
              0%, 100% {
                opacity: 1;
                filter: drop-shadow(0 0 2px rgba(14, 165, 233, 0.4));
              }
              50% {
                opacity: 0.22;
                filter: drop-shadow(0 0 9px rgba(14, 165, 233, 0.95));
              }
            }

            @keyframes logoHaloPulse {
              0% {
                r: 14;
                opacity: 0.9;
                stroke-width: 2.5;
              }
              50% {
                r: 22;
                opacity: 0;
                stroke-width: 1;
              }
              100% {
                r: 14;
                opacity: 0;
                stroke-width: 2.5;
              }
            }

            .checkin-recovery-label-group:focus,
            .checkin-recovery-label-group:focus-visible,
            svg g:focus,
            svg g:focus-visible,
            svg path:focus,
            svg path:focus-visible,
            svg *:focus,
            svg *:focus-visible {
              outline: none !important;
              box-shadow: none !important;
            }
          `}</style>

          {/* Ráfaga de estrellitas al estar en violeta o verde claro */}
          {isStarColor && (
            <div
              key={`recovery-burst-${burstKey}`}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: '0px',
                height: '0px',
                pointerEvents: 'none',
                zIndex: 4,
              }}
              aria-hidden="true"
            >
              {BURST_STARS.map((s) => {
                const rad = (s.angle * Math.PI) / 180;
                const dx = Math.round(s.distance * Math.cos(rad));
                const dy = Math.round(s.distance * Math.sin(rad));
                const color = starPalette[s.colorIdx];

                return (
                  <span
                    key={`rb-${s.id}`}
                    style={{
                      position: 'absolute',
                      top: '0px',
                      left: '0px',
                      ['--star-dx' as string]: `${dx}px`,
                      ['--star-dy' as string]: `${dy}px`,
                      ['--star-rot' as string]: `${s.rot}deg`,
                      animation: `starBurstFly 0.85s cubic-bezier(0.25, 1, 0.5, 1) ${s.delay}ms forwards`,
                    }}
                  >
                    {renderStarSvg(s.type, s.size, color)}
                  </span>
                );
              })}
            </div>
          )}

          {/* Estrellitas ambientales continuas que titilan suavemente */}
          {isStarColor && (
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: '0px',
                height: '0px',
                pointerEvents: 'none',
                zIndex: 4,
              }}
              aria-hidden="true"
            >
              {AMBIENT_STARS.map((s) => {
                const color = starPalette[s.colorIdx];
                return (
                  <span
                    key={`ramb-${s.id}`}
                    style={{
                      position: 'absolute',
                      top: `${s.y}px`,
                      left: `${s.x}px`,
                      animation: `starAmbientTwinkle ${s.duration}s ease-in-out ${s.delay}s infinite`,
                    }}
                  >
                    {renderStarSvg(s.type, s.size, color)}
                  </span>
                );
              })}
            </div>
          )}

          {/* Círculo Hero Bubble responsivo */}
          <div
            className="pixel-bubble-hero"
            style={{
              background: getActiveHeroColor(),
              border: isMetricAnswered(activeMetric) ? 'none' : '2px dashed #CBD5E1',
              boxShadow: isStarColor
                ? `0 0 28px ${getActiveHeroColor()}75, 0 8px 24px ${getActiveHeroColor()}55`
                : isMetricAnswered(activeMetric)
                  ? `0 8px 24px ${getActiveHeroColor()}55`
                  : '0 4px 12px rgba(8, 37, 74, 0.05)',
              position: 'relative',
            }}
            aria-label={`Métrica activa: ${activeCfg.name}`}
          >
            {renderHeroIcon()}
          </div>
        </div>

        {/* ── Onditas curvas decorativas (︶ ︶) debajo del ícono ── */}
        <div className="pixel-bubble-waves" aria-hidden="true">
          <svg width="22" height="13" viewBox="0 0 22 13" fill="none">
            <path d="M 3 4 Q 11 9 19 4" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
            <path d="M 3 9 Q 11 14 19 9" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>

        {/* ── Selector Numérico Central ── */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.25rem',
            marginBottom: '0.65rem',
            zIndex: 2,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1.15rem',
              marginTop: '0.1rem',
            }}
          >
            {/* Botón Decremento (−) */}
            <button
              type="button"
              onClick={handleDecrement}
              disabled={isMin}
              aria-label={`Disminuir ${activeCfg.name}`}
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: 'var(--checkin-counter-bg)',
                border: '1.5px solid var(--checkin-counter-border)',
                color: isMin ? 'var(--checkin-subtitle-color)' : 'var(--checkin-counter-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.4rem',
                fontWeight: 600,
                cursor: isMin ? 'not-allowed' : 'pointer',
                opacity: isMin ? 0.45 : 1,
                transition: 'all 0.15s ease',
                padding: 0,
                boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
              }}
            >
              −
            </button>

            {/* Texto de estado grande y negrita con ALTURA FIJA ESTRICTA para inmovilizar el gráfico concéntrico */}
            <div
              style={{
                minWidth: '220px',
                height: '50px',
                minHeight: '50px',
                maxHeight: '50px',
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'visible',
              }}
            >
              {renderCentralValue()}
            </div>

            {/* Botón Incremento (+) */}
            <button
              type="button"
              onClick={handleIncrement}
              disabled={isMax}
              aria-label={`Aumentar ${activeCfg.name}`}
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: 'var(--checkin-counter-bg)',
                border: '1.5px solid var(--checkin-counter-border)',
                color: isMax ? 'var(--checkin-subtitle-color)' : 'var(--checkin-counter-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.4rem',
                fontWeight: 600,
                cursor: isMax ? 'not-allowed' : 'pointer',
                opacity: isMax ? 0.45 : 1,
                transition: 'all 0.15s ease',
                padding: 0,
                boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
              }}
            >
              +
            </button>
          </div>
        </div>

        {/* ── Gráfico de 4 Arcos Concéntricos y 4 Etiquetas Alineadas ── */}
        <div
          style={{
            width: '100%',
            maxWidth: '640px',
            position: 'relative',
            userSelect: 'none',
          }}
        >
          <svg
            viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
            style={{
              width: '100%',
              height: 'auto',
              display: 'block',
              overflow: 'visible',
            }}
          >
            {/* 1. CARRIL BASE GRIS AZULADO CLARO SIN PINTAR (#EDF2F7) */}
            {(Object.keys(METRIC_CONFIGS) as MetricKey[]).map((key) => {
              const cfg = METRIC_CONFIGS[key];
              const pathD = describeArc(CX, CY, cfg.radius, cfg.startAngle, END_ANGLE);
              return (
                <path
                  key={`track-${key}`}
                  d={pathD}
                  fill="none"
                  stroke={COLOR_SCALE.trackBase}
                  strokeWidth={STROKE_WIDTH}
                  strokeLinecap="round"
                  style={{
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                  onClick={() => handleSelectMetric(key)}
                />
              );
            })}

            {/* 2. MARCA CELESTE LEVE Y ESTÁTICA CUBRIENDO SOLO LA PORCIÓN PINTADA DE LA BARRA SELECCIONADA */}
            {(Object.keys(METRIC_CONFIGS) as MetricKey[]).map((key) => {
              if (activeMetric !== key || !isMetricAnswered(key)) return null;
              const cfg = METRIC_CONFIGS[key];
              const endDeg = getArcEndAngle(key);
              const pathD = describeArc(CX, CY, cfg.radius, cfg.startAngle, endDeg);
              return (
                <g key={`active-track-halo-${key}`}>
                  {/* Resplandor difuso celeste suave sobre la porción pintada */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke="#0EA5E9"
                    strokeWidth={STROKE_WIDTH + 5}
                    strokeLinecap="round"
                    opacity={0.38}
                    style={{
                      pointerEvents: 'none',
                      filter: 'drop-shadow(0 0 5px rgba(14, 165, 233, 0.6))',
                      transition: 'stroke 0.25s ease, opacity 0.25s ease',
                    }}
                  />
                  {/* Borde exterior celeste nítido pero sutil */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke="#38BDF8"
                    strokeWidth={STROKE_WIDTH + 2.5}
                    strokeLinecap="round"
                    opacity={0.7}
                    style={{
                      pointerEvents: 'none',
                      transition: 'stroke 0.25s ease, opacity 0.25s ease',
                    }}
                  />
                </g>
              );
            })}

            {/* 3. ARCOS DE PROGRESO DINÁMICOS CON COLOR PROGRESIVO Y EXTREMOS REDONDEADOS (SOLO SI ESTÁ MARCADO) */}
            {(Object.keys(METRIC_CONFIGS) as MetricKey[]).map((key) => {
              if (!isMetricAnswered(key)) return null;
              const cfg = METRIC_CONFIGS[key];
              const isActive = activeMetric === key;
              const endDeg = getArcEndAngle(key);
              const pathD = describeArc(CX, CY, cfg.radius, cfg.startAngle, endDeg);
              const dynamicColor = getMetricCurrentColor(key);

              return (
                <path
                  key={`progress-${key}`}
                  d={pathD}
                  fill="none"
                  stroke={dynamicColor}
                  strokeWidth={isActive ? STROKE_WIDTH + 1 : STROKE_WIDTH}
                  strokeLinecap="round"
                  style={{
                    cursor: 'pointer',
                    outline: 'none',
                    transition: 'stroke 0.28s ease, stroke-width 0.2s ease, opacity 0.2s ease',
                    opacity: isActive ? 1 : 0.95,
                    filter: isActive ? 'drop-shadow(0 0 4px rgba(14, 165, 233, 0.35))' : undefined,
                  }}
                  onClick={() => handleSelectMetric(key)}
                />
              );
            })}

            {/* 3. ETIQUETAS ALINEADAS A LA IZQUIERDA E INSIGNIAS CIRCULARES VERTICALES */}
            {[
              {
                key: 'sleepHours' as MetricKey,
                label: 'Horas de sueño',
                color: sleepHours !== null ? getSleepColor(sleepHours) : '#CBD5E1',
                isAnswered: sleepHours !== null,
                icon: (
                  <path
                    d="M 16 8 A 6.5 6.5 0 1 1 9 1.5 A 5 5 0 0 0 16 8 Z"
                    fill={sleepHours !== null ? '#FFD166' : '#94A3B8'}
                    transform="translate(-8.5, -8.5)"
                  />
                ),
              },
              {
                key: 'sleepQuality' as MetricKey,
                label: 'Calidad del descanso',
                color: sleepQuality !== null ? getQualityColor(sleepQuality) : '#CBD5E1',
                isAnswered: sleepQuality !== null,
                icon: (
                  <path
                    d="M 9.5 2 L 3 10.5 L 8.5 10.5 L 6.5 17 L 15 7.5 L 9.5 7.5 Z"
                    fill={sleepQuality !== null ? '#FFFFFF' : '#94A3B8'}
                    transform="translate(-9, -9.5)"
                  />
                ),
              },
              {
                key: 'fatigueLevel' as MetricKey,
                label: 'Nivel de fatiga muscular',
                color: fatigueLevel !== null ? getFatigueColor(fatigueLevel) : '#CBD5E1',
                isAnswered: fatigueLevel !== null,
                icon: (
                  <g transform="translate(-8.5, -6.5)">
                    <rect
                      x="1"
                      y="2"
                      width="13"
                      height="9"
                      rx="2.2"
                      stroke={fatigueLevel !== null ? '#FFFFFF' : '#94A3B8'}
                      strokeWidth="1.6"
                      fill="none"
                    />
                    <rect
                      x="15"
                      y="4.8"
                      width="1.8"
                      height="3.4"
                      rx="0.8"
                      fill={fatigueLevel !== null ? '#FFFFFF' : '#94A3B8'}
                    />
                    <rect
                      x="2.6"
                      y="3.6"
                      width={Math.max(1.8, ((6 - (fatigueLevel ?? 6)) / 5) * 9.8)}
                      height="5.8"
                      rx="1"
                      fill={fatigueLevel !== null ? '#FFFFFF' : '#CBD5E1'}
                      style={{ transition: 'width 0.25s ease' }}
                    />
                  </g>
                ),
              },
              {
                key: 'muscleSoreness' as MetricKey,
                label: 'Dolor muscular',
                color: muscleSoreness !== null ? getSorenessColor(muscleSoreness) : '#CBD5E1',
                isAnswered: muscleSoreness !== null,
                icon: (
                  <g transform="translate(-8.5, -8.5)">
                    {renderBicepsMuscle(
                      17,
                      muscleSoreness !== null ? getSorenessColor(muscleSoreness) : '#CBD5E1',
                      muscleSoreness !== null ? '#FFFFFF' : '#94A3B8',
                    )}
                  </g>
                ),
              },
            ].map((item) => {
              const cfg = METRIC_CONFIGS[item.key];
              const isActive = activeMetric === item.key;
              const posY = cfg.badgeY;

              return (
                <g
                  key={`label-group-${item.key}`}
                  className="checkin-recovery-label-group"
                  onClick={() => handleSelectMetric(item.key)}
                  style={{ cursor: 'pointer', outline: 'none' }}
                  role="button"
                  tabIndex={-1}
                  aria-label={`Seleccionar ${item.label}`}
                >
                  {/* Texto descriptivo alineado a la derecha contra la columna de insignias (sin marco ni texto ACTIVA) */}
                  <text
                    x={BADGE_X - 18}
                    y={posY + 5}
                    textAnchor="end"
                    fontFamily="Montserrat, system-ui, -apple-system, sans-serif"
                    fontSize="14.5"
                    fontWeight={isActive ? '900' : '700'}
                    fill={
                      isActive
                        ? '#0284C7'
                        : item.isAnswered
                          ? 'var(--checkin-title-color)'
                          : 'var(--checkin-subtitle-color)'
                    }
                    style={{
                      transition: 'all 0.18s ease',
                    }}
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
                      stroke="#0EA5E9"
                      style={{
                        animation: 'logoHaloPulse 1.4s ease-out infinite',
                      }}
                    />
                  )}

                  {/* Grupo del logo: si está seleccionado titila */}
                  <g
                    style={
                      isActive
                        ? {
                            animation: 'logoBlink 1s ease-in-out infinite',
                          }
                        : undefined
                    }
                  >
                    {/* Insignia circular con el color de la métrica */}
                    <circle
                      cx={BADGE_X}
                      cy={posY}
                      r="14"
                      fill={item.isAnswered ? item.color : 'var(--checkin-counter-bg)'}
                      stroke={
                        isActive
                          ? '#0EA5E9'
                          : item.isAnswered
                            ? 'var(--checkin-inner-bg)'
                            : '#CBD5E1'
                      }
                      strokeWidth={isActive ? '2.5' : item.isAnswered ? '1.5' : '1.5'}
                      strokeDasharray={item.isAnswered ? 'none' : '3 2'}
                      style={{
                        filter: isActive
                          ? 'drop-shadow(0px 0px 8px rgba(14, 165, 233, 0.75))'
                          : item.isAnswered
                            ? 'drop-shadow(0px 1px 3px rgba(0,0,0,0.12))'
                            : 'drop-shadow(0px 1px 2px rgba(0,0,0,0.04))',
                        transition: 'fill 0.28s ease, stroke 0.2s ease',
                      }}
                    />

                    {/* Ícono dentro de la insignia */}
                    <g transform={`translate(${BADGE_X}, ${posY})`}>{item.icon}</g>
                  </g>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* ── Cartel de Advertencia si intenta avanzar sin completar las 4 opciones ── */}
      {showValidationModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pending-modal-title"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'var(--checkin-modal-backdrop)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.25rem',
            animation: 'fadeInValidationBackdrop 0.22s ease-out forwards',
          }}
          onClick={() => setShowValidationModal(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '430px',
              backgroundColor: 'var(--checkin-modal-bg)',
              borderRadius: '28px',
              padding: '2rem 1.8rem 1.8rem',
              boxShadow: 'var(--checkin-card-shadow)',
              border: '1.5px solid var(--checkin-modal-border)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              boxSizing: 'border-box',
              animation: 'scaleUpValidationBox 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
              transition: 'background-color 0.25s ease, border-color 0.25s ease',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ícono de alerta en círculo ámbar / naranja */}
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: 'var(--checkin-alert-icon-bg)',
                border: '2px solid var(--checkin-alert-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
                boxShadow: '0 8px 20px rgba(217, 119, 6, 0.18)',
              }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 9V14M12 17.5V18M10.29 3.86L1.82 18A2 2 0 0 0 3.55 21H20.45A2 2 0 0 0 22.18 18L13.71 3.86A2 2 0 0 0 10.29 3.86Z"
                  stroke="#D97706"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <h3
              id="pending-modal-title"
              style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '1.35rem',
                fontWeight: 800,
                color: 'var(--checkin-title-color)',
                margin: '0 0 0.5rem 0',
                letterSpacing: '-0.02em',
              }}
            >
              ¡Debés mover las opciones de su estado neutro!
            </h3>

            <p
              style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '0.94rem',
                fontWeight: 500,
                color: 'var(--checkin-subtitle-color)',
                lineHeight: 1.45,
                margin: '0 0 1.25rem 0',
              }}
            >
              Para avanzar al siguiente paso, debés registrar las <strong>4 opciones</strong> de
              descanso y recuperación con los botones + o −. No pueden quedar en estado neutro sin
              pintar.
            </p>

            {/* Lista de métricas pendientes */}
            <div
              style={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                marginBottom: '1.5rem',
              }}
            >
              {pendingMetrics.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => {
                    setActiveMetric(m.key);
                    setShowValidationModal(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 1rem',
                    borderRadius: '14px',
                    backgroundColor: 'var(--checkin-alert-bg)',
                    border: '1.5px solid var(--checkin-alert-border)',
                    color: 'var(--checkin-alert-text)',
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#D97706',
                      }}
                    />
                    {m.label}
                  </span>
                  <span style={{ fontSize: '0.78rem', color: '#D97706', fontWeight: 800 }}>
                    Completar →
                  </span>
                </button>
              ))}
            </div>

            {/* Botón Principal para completar */}
            <button
              type="button"
              onClick={() => {
                if (pendingMetrics.length > 0) {
                  setActiveMetric(pendingMetrics[0].key);
                }
                setShowValidationModal(false);
              }}
              style={{
                width: '100%',
                padding: '0.85rem 1.5rem',
                backgroundColor: 'var(--checkin-next-btn-bg)',
                color: 'var(--checkin-next-btn-color)',
                borderRadius: '9999px',
                border: 'none',
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(8, 37, 74, 0.25)',
                transition: 'all 0.15s ease',
              }}
            >
              Entendido, completar ahora
            </button>
          </div>
        </div>
      )}

      {/* ── Modal de Confirmación: ¿Fueron más de 12 horas? ── */}
      {showSleepHoursConfirmModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="sleep-confirm-modal-title"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'var(--checkin-modal-backdrop)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.25rem',
            animation: 'fadeInValidationBackdrop 0.2s ease-out forwards',
          }}
          onClick={() => setShowSleepHoursConfirmModal(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '430px',
              backgroundColor: 'var(--checkin-modal-bg)',
              borderRadius: '24px',
              border: '1.5px solid var(--checkin-modal-border)',
              boxShadow: '0 20px 48px rgba(8, 37, 74, 0.22), 0 4px 12px rgba(0, 0, 0, 0.08)',
              padding: '1.75rem 1.5rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              boxSizing: 'border-box',
              animation: 'scaleUpValidationBox 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ícono de descanso / luna */}
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: 'rgba(142, 36, 170, 0.12)',
                border: '2px solid rgba(142, 36, 170, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
                boxShadow: '0 8px 20px rgba(142, 36, 170, 0.2)',
              }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <path d="M 19 10 A 8 8 0 1 1 10.5 2 A 6.5 6.5 0 0 0 19 10 Z" fill="#8E24AA" />
              </svg>
            </div>

            <h3
              id="sleep-confirm-modal-title"
              style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '1.35rem',
                fontWeight: 800,
                color: 'var(--checkin-title-color)',
                margin: '0 0 0.5rem 0',
                letterSpacing: '-0.02em',
              }}
            >
              ¿Fueron más de 12 horas?
            </h3>

            <p
              style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '0.94rem',
                fontWeight: 500,
                color: 'var(--checkin-subtitle-color)',
                lineHeight: 1.45,
                margin: '0 0 1.5rem 0',
              }}
            >
              Seleccionaste 12 horas o más de descanso. Confirmá si tu tiempo de sueño superó
              efectivamente las 12 horas.
            </p>

            {/* Botones de confirmación Sí / No */}
            <div
              style={{
                width: '100%',
                display: 'flex',
                flexDirection: 'row',
                gap: '0.75rem',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  onSleepHoursChange(12);
                  setShowSleepHoursConfirmModal(false);
                  onNext();
                }}
                style={{
                  flex: 1,
                  padding: '0.85rem 1rem',
                  backgroundColor: 'var(--checkin-counter-bg)',
                  border: '1.5px solid var(--border)',
                  color: 'var(--text-main)',
                  borderRadius: '9999px',
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                No
              </button>

              <button
                type="button"
                onClick={() => {
                  onSleepHoursChange(13);
                  setShowSleepHoursConfirmModal(false);
                  onNext();
                }}
                style={{
                  flex: 1,
                  padding: '0.85rem 1rem',
                  backgroundColor: 'var(--checkin-next-btn-bg)',
                  color: 'var(--checkin-next-btn-color)',
                  borderRadius: '9999px',
                  border: 'none',
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(8, 37, 74, 0.25)',
                  transition: 'all 0.15s ease',
                }}
              >
                Sí
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
