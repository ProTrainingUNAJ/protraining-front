// Escala cromática para el thumb según el nivel de molestia o dolor (0 a 10) usando tokens CSS
export const getPainColor = (level: number | null): string => {
  if (level === null || level === 0) return 'var(--pain-scale-0)';
  if (level <= 2) return 'var(--pain-scale-1-2)';
  if (level <= 4) return 'var(--pain-scale-3-4)';
  if (level <= 6) return 'var(--pain-scale-5-6)';
  if (level <= 8) return 'var(--pain-scale-7-8)';
  return 'var(--pain-scale-9-10)';
};

export const getPainLabel = (level: number | null): string => {
  if (level === null) return 'Seleccioná un nivel';
  if (level === 0) return '0 — Sin molestia / Sin dolor';
  if (level <= 2) return `${level} — Molestia muy leve`;
  if (level <= 4) return `${level} — Molestia leve / moderada`;
  if (level <= 6) return `${level} — Molestia notable`;
  if (level <= 8) return `${level} — Dolor intenso`;
  return `${level} — Dolor máximo / severo`;
};
