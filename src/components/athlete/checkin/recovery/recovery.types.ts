export type MetricKey = 'sleepHours' | 'sleepQuality' | 'fatigueLevel' | 'muscleSoreness';

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

export const QUALITY_LABELS: Record<number, string> = {
  1: 'muy mala',
  2: 'mala',
  3: 'regular',
  4: 'buena',
  5: 'excelente',
};

export const FATIGUE_LABELS: Record<number, string> = {
  1: 'enérgico',
  2: 'fresco',
  3: 'moderada',
  4: 'alta',
  5: 'agotado',
};

export const SORENESS_LABELS: Record<number, string> = {
  1: 'sin dolor',
  2: 'leve',
  3: 'molestia',
  4: 'fuerte',
  5: 'muy intenso',
};

// ── Paleta de colores centralizada con tokens CSS ──
// Peores: Marrón -> Naranja -> Amarillo -> Verde -> Violeta (Mejores)
export const COLOR_SCALE = {
  brown: 'var(--checkin-scale-brown)',
  orange: 'var(--checkin-scale-orange)',
  yellow: 'var(--checkin-scale-yellow)',
  green: 'var(--checkin-scale-green)',
  violet: 'var(--checkin-scale-violet)',
  trackBase: 'var(--checkin-track-base)',
  neutral: 'var(--checkin-scale-neutral)',
};

// ── Geometría SVG Matemática ──
export const SVG_WIDTH = 510;
export const SVG_HEIGHT = 390;
export const CX = 310;
export const CY = 196;
export const BADGE_X = 265;
export const STROKE_WIDTH = 27;
export const END_ANGLE = 222;

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

export function calculateMetricConfig(
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

export const METRIC_CONFIGS: Record<MetricKey, MetricConfig> = {
  sleepHours: calculateMetricConfig('sleepHours', 'Horas de sueño', 178, 0, 12, 1),
  sleepQuality: calculateMetricConfig('sleepQuality', 'Calidad del descanso', 146, 1, 5, 1),
  fatigueLevel: calculateMetricConfig('fatigueLevel', 'Nivel de fatiga muscular', 114, 1, 5, 1),
  muscleSoreness: calculateMetricConfig('muscleSoreness', 'Dolor muscular', 82, 1, 5, 1),
};

// Conversión polar a cartesiana (0° = 12 en punto, sentido horario)
export function polarToCartesian(
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
export function describeArc(
  x: number,
  y: number,
  radius: number,
  startAngle: number,
  endAngle: number,
) {
  let sweep = endAngle - startAngle;
  if (sweep < 0) sweep += 360;

  const startPt = polarToCartesian(x, y, radius, startAngle);
  const endPt = polarToCartesian(x, y, radius, endAngle);
  const largeArcFlag = sweep > 180 ? 1 : 0;

  return `M ${startPt.x} ${startPt.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endPt.x} ${endPt.y}`;
}

export interface BurstStar {
  id: number;
  angle: number;
  distance: number;
  size: number;
  type: 'four' | 'five';
  delay: number;
  rot: number;
  colorIdx: number;
}

export const BURST_STARS: BurstStar[] = [
  { id: 1, angle: -85, distance: 72, size: 18, type: 'four', delay: 0, rot: 45, colorIdx: 0 },
  { id: 2, angle: -60, distance: 88, size: 14, type: 'five', delay: 40, rot: -30, colorIdx: 1 },
  { id: 3, angle: -35, distance: 68, size: 20, type: 'four', delay: 20, rot: 75, colorIdx: 2 },
  { id: 4, angle: -10, distance: 82, size: 15, type: 'five', delay: 60, rot: 90, colorIdx: 0 },
  { id: 5, angle: 15, distance: 75, size: 17, type: 'four', delay: 10, rot: -45, colorIdx: 1 },
  { id: 6, angle: 40, distance: 90, size: 13, type: 'five', delay: 50, rot: 30, colorIdx: 2 },
  { id: 7, angle: 65, distance: 70, size: 19, type: 'four', delay: 30, rot: 60, colorIdx: 0 },
  { id: 8, angle: 90, distance: 84, size: 14, type: 'five', delay: 70, rot: -60, colorIdx: 1 },
  { id: 9, angle: 120, distance: 66, size: 16, type: 'four', delay: 15, rot: 40, colorIdx: 2 },
  { id: 10, angle: 150, distance: 78, size: 13, type: 'five', delay: 45, rot: -45, colorIdx: 0 },
  { id: 11, angle: 180, distance: 64, size: 18, type: 'four', delay: 25, rot: 90, colorIdx: 1 },
  { id: 12, angle: 210, distance: 80, size: 14, type: 'five', delay: 65, rot: -30, colorIdx: 2 },
  { id: 13, angle: 240, distance: 68, size: 16, type: 'four', delay: 35, rot: 60, colorIdx: 0 },
  { id: 14, angle: 265, distance: 86, size: 13, type: 'five', delay: 55, rot: -75, colorIdx: 1 },
  { id: 15, angle: 290, distance: 70, size: 18, type: 'four', delay: 10, rot: 45, colorIdx: 2 },
  { id: 16, angle: 320, distance: 85, size: 14, type: 'five', delay: 50, rot: -20, colorIdx: 0 },
];

export interface AmbientStar {
  id: string;
  x: number;
  y: number;
  size: number;
  type: 'four' | 'five';
  duration: number;
  delay: number;
  colorIdx: number;
}

export const AMBIENT_STARS: AmbientStar[] = [
  { id: 'a1', x: -56, y: -26, size: 16, type: 'four', duration: 2.2, delay: 0, colorIdx: 0 },
  { id: 'a2', x: 54, y: -28, size: 15, type: 'five', duration: 2.6, delay: 0.5, colorIdx: 1 },
  { id: 'a3', x: -62, y: 16, size: 13, type: 'five', duration: 2.4, delay: 0.9, colorIdx: 2 },
  { id: 'a4', x: 58, y: 14, size: 17, type: 'four', duration: 2.8, delay: 0.3, colorIdx: 0 },
  { id: 'a5', x: -20, y: -54, size: 12, type: 'five', duration: 2.3, delay: 1.2, colorIdx: 1 },
  { id: 'a6', x: 24, y: -52, size: 15, type: 'four', duration: 2.5, delay: 0.7, colorIdx: 2 },
];
