export interface ConcentricMoodStressDialProps {
  moodRate: number; // 1 to 5
  onMoodChange: (val: number) => void;
  stressLevel: number; // 1 to 5
  onStressChange: (val: number) => void;
  title?: string;
  className?: string;
  onPrev?: () => void;
  onNext?: () => void;
}

export type MoodEyeType = 'sad' | 'worried' | 'neutral' | 'happy' | 'star';

export interface MoodData {
  value: number;
  label: string;
  phrase: string;
  color: string;
  eyeType: MoodEyeType;
  angle: number;
}

export const MOODS: Record<number, MoodData> = {
  1: {
    value: 1,
    label: 'Desanimado',
    phrase: 'Me siento desanimado.',
    color: 'var(--checkin-mood-desanimado)',
    eyeType: 'sad',
    angle: -72,
  },
  2: {
    value: 2,
    label: 'Regular',
    phrase: 'Me siento regular.',
    color: 'var(--checkin-mood-regular)',
    eyeType: 'worried',
    angle: -36,
  },
  3: {
    value: 3,
    label: 'Neutral',
    phrase: 'Me siento neutral.',
    color: 'var(--checkin-mood-neutral)',
    eyeType: 'neutral',
    angle: 0,
  },
  4: {
    value: 4,
    label: 'Motivado',
    phrase: 'Me siento motivado.',
    color: 'var(--checkin-mood-motivado)',
    eyeType: 'happy',
    angle: 36,
  },
  5: {
    value: 5,
    label: 'Excelente',
    phrase: 'Me siento excelente.',
    color: 'var(--checkin-mood-excelente)',
    eyeType: 'star',
    angle: 72,
  },
};

// Dial geometry constants matching FOTO 2 & Paso 2 proportions
export const SVG_WIDTH = 560;
export const SVG_HEIGHT = 280;
export const CX = 280;
export const CY = 280;
export const R_OUTER = 260;
export const R_INNER = 148;

export function createWedgePath(
  cx: number,
  cy: number,
  rInner: number,
  rOuter: number,
  startDeg: number,
  endDeg: number,
): string {
  const toRad = (deg: number) => ((deg - 90) * Math.PI) / 180;
  const startRad = toRad(startDeg);
  const endRad = toRad(endDeg);

  const x1 = cx + rOuter * Math.cos(startRad);
  const y1 = cy + rOuter * Math.sin(startRad);
  const x2 = cx + rOuter * Math.cos(endRad);
  const y2 = cy + rOuter * Math.sin(endRad);

  const x3 = cx + rInner * Math.cos(endRad);
  const y3 = cy + rInner * Math.sin(endRad);
  const x4 = cx + rInner * Math.cos(startRad);
  const y4 = cy + rInner * Math.sin(startRad);

  const largeArc = endDeg - startDeg > 180 ? 1 : 0;

  return `
    M ${x1} ${y1}
    A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${x2} ${y2}
    L ${x3} ${y3}
    A ${rInner} ${rInner} 0 ${largeArc} 0 ${x4} ${y4}
    Z
  `;
}

// 5-point star polygon points
export const STAR_POINTS_RULETA =
  '0,-8 2.3,-2.4 8,-2.4 3.5,1 5.1,6.7 0,3.1 -5.1,6.7 -3.5,1 -8,-2.4 -2.3,-2.4';
export const STAR_POINTS_BUBBLE =
  '0,-7.5 2.2,-2.3 7.5,-2.3 3.2,0.8 4.8,5.8 0,2.3 -4.8,5.8 -3.2,0.8 -7.5,-2.3 -2.2,-2.3';

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
