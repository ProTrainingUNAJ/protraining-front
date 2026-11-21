// Escala cromática para el thumb según el nivel de molestia o dolor (0 a 10)
export const getPainColor = (level: number | null): string => {
  if (level === null) return '#0088cc';
  if (level === 0) return '#0088cc';
  if (level <= 2) return '#0ea5e9';
  if (level <= 4) return '#10b981';
  if (level <= 6) return '#85a900';
  if (level <= 8) return '#f97316';
  return '#ef4444';
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
