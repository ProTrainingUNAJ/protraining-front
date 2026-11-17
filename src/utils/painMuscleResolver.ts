// Helper to resolve muscleId from zone name if not explicitly provided
export const resolveMuscleId = (zone: string, providedId?: string): string => {
  if (providedId) return providedId;
  const s = zone.toLowerCase();
  if (s.includes('isquio'))
    return s.includes('izq') ? 'isquiotibial_izquierdo' : 'isquiotibial_derecho';
  if (s.includes('cuad') || s.includes('cuád'))
    return s.includes('izq') ? 'cuadriceps_izquierdo' : 'cuadriceps_derecho';
  if (s.includes('gemelo') || s.includes('pantorr'))
    return s.includes('izq') ? 'gemelo_izquierdo' : 'gemelo_derecho';
  if (s.includes('lumbar') || s.includes('erector')) return 'espalda_baja';
  if (s.includes('dorsal') || s.includes('espalda media')) return 'espalda_media';
  if (s.includes('espalda alta') || s.includes('trapecio'))
    return s.includes('der') ? 'cuello_trapecio_derecho' : 'cuello_trapecio_izquierdo';
  if (s.includes('aductor') || s.includes('ingle'))
    return s.includes('der') ? 'aductor_derecho' : 'aductor_izquierdo';
  if (s.includes('rodilla')) return s.includes('der') ? 'rodilla_derecha' : 'rodilla_izquierda';
  if (s.includes('tobillo')) return s.includes('der') ? 'tobillo_derecho' : 'tobillo_izquierdo';
  if (s.includes('hombro')) return s.includes('der') ? 'hombro_derecho' : 'hombro_izquierdo';
  if (s.includes('bicep') || s.includes('bícep'))
    return s.includes('der') ? 'biceps_derecho' : 'biceps_izquierdo';
  if (s.includes('tricep') || s.includes('trícep'))
    return s.includes('der') ? 'triceps_derecho' : 'triceps_izquierdo';
  if (s.includes('gluteo') || s.includes('glúteo'))
    return s.includes('der') ? 'gluteo_derecho' : 'gluteo_izquierdo';
  if (s.includes('abdom')) return 'abdominales';
  if (s.includes('pecho') || s.includes('pectoral'))
    return s.includes('der') ? 'pecho_derecho' : 'pecho_izquierdo';
  return '';
};

// Check if a muscle belongs primarily to the back view
export const isBackMuscle = (id: string): boolean => {
  return [
    'isquiotibial_derecho',
    'isquiotibial_izquierdo',
    'gemelo_derecho',
    'gemelo_izquierdo',
    'gluteo_derecho',
    'gluteo_izquierdo',
    'espalda_baja',
    'espalda_media',
    'espalda_alta',
    'triceps_derecho',
    'triceps_izquierdo',
  ].includes(id);
};
