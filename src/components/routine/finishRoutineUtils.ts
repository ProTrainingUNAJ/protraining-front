export type RpeTier = 'easy' | 'moderate' | 'demanding' | 'hard' | 'max';

export interface RpeLevelMeta {
  val: number;
  tier: RpeTier;
  colorVar: string;
  shadowColor: string;
  title: string;
  tagLabel: string;
  desc: string;
}

export const RPE_LEVELS_META: Record<number, RpeLevelMeta> = {
  1: {
    val: 1,
    tier: 'easy',
    colorVar: 'var(--celebration-blue)',
    shadowColor: 'color-mix(in srgb, var(--celebration-blue) 30%, transparent)',
    title: 'Muy liviano',
    tagLabel: 'Recuperación',
    desc: 'Recuperación activa, casi sin esfuerzo perceptible.',
  },
  2: {
    val: 2,
    tier: 'easy',
    colorVar: 'var(--celebration-blue)',
    shadowColor: 'color-mix(in srgb, var(--celebration-blue) 30%, transparent)',
    title: 'Liviano',
    tagLabel: 'Recuperación',
    desc: 'Esfuerzo suave, respiración cómoda y tranquila.',
  },
  3: {
    val: 3,
    tier: 'moderate',
    colorVar: 'var(--success)',
    shadowColor: 'color-mix(in srgb, var(--success) 30%, transparent)',
    title: 'Moderado',
    tagLabel: 'Moderado',
    desc: 'Ritmo aeróbico cómodo, podés mantener una conversación fluida.',
  },
  4: {
    val: 4,
    tier: 'moderate',
    colorVar: 'var(--success)',
    shadowColor: 'color-mix(in srgb, var(--success) 30%, transparent)',
    title: 'Algo duro',
    tagLabel: 'Moderado',
    desc: 'Respiración algo acelerada pero completamente bajo control.',
  },
  5: {
    val: 5,
    tier: 'demanding',
    colorVar: 'var(--warning)',
    shadowColor: 'color-mix(in srgb, var(--warning) 30%, transparent)',
    title: 'Duro',
    tagLabel: 'Exigente',
    desc: 'Esfuerzo constante, empieza a sentirse el trabajo muscular sostenido.',
  },
  6: {
    val: 6,
    tier: 'demanding',
    colorVar: 'var(--warning)',
    shadowColor: 'color-mix(in srgb, var(--warning) 30%, transparent)',
    title: 'Exigente',
    tagLabel: 'Exigente',
    desc: 'Fatiga progresiva, requiere concentración mental para sostener.',
  },
  7: {
    val: 7,
    tier: 'hard',
    colorVar: 'var(--celebration-coral)',
    shadowColor: 'color-mix(in srgb, var(--celebration-coral) 30%, transparent)',
    title: 'Muy duro',
    tagLabel: 'Muy Duro',
    desc: 'Alta exigencia física, respiración agitada y gran fatiga.',
  },
  8: {
    val: 8,
    tier: 'hard',
    colorVar: 'var(--celebration-coral)',
    shadowColor: 'color-mix(in srgb, var(--celebration-coral) 30%, transparent)',
    title: 'Muy intenso',
    tagLabel: 'Muy Duro',
    desc: 'Esfuerzo límite, solo frases entrecortadas y gran demanda aeróbica.',
  },
  9: {
    val: 9,
    tier: 'max',
    colorVar: 'var(--danger)',
    shadowColor: 'color-mix(in srgb, var(--danger) 35%, transparent)',
    title: 'Casi máximo',
    tagLabel: 'Máximo',
    desc: 'Esfuerzo extremo, muy difícil sostener el ritmo sin pausas.',
  },
  10: {
    val: 10,
    tier: 'max',
    colorVar: 'var(--danger)',
    shadowColor: 'color-mix(in srgb, var(--danger) 35%, transparent)',
    title: 'Máximo absoluto',
    tagLabel: 'Máximo',
    desc: 'Agotamiento total, diste el 100% absoluto de tu capacidad.',
  },
};

/**
 * Formatea segundos totales a formato digital estricto MM:SS (ej: 00:03, 00:21, 45:00)
 */
export function formatMmSs(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(clamped / 60);
  const s = clamped % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Parsea un string en formato MM:SS o número a segundos totales
 */
export function parseMmSs(raw: string): number {
  const clean = raw.trim();
  if (!clean) return 0;
  if (clean.includes(':')) {
    const parts = clean.split(':');
    const m = parseInt(parts[0], 10) || 0;
    const s = parseInt(parts[1], 10) || 0;
    return Math.max(0, m * 60 + s);
  }
  const num = parseInt(clean, 10);
  if (isNaN(num)) return 0;
  return Math.max(0, num * 60);
}

