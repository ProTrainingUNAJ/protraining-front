// KAN-488: las lesiones resueltas antes de que existiera el registro de dolor no tienen pico.
// Mostramos un texto explícito en vez de un hueco en el historial.
export const NO_PEAK_PAIN_LABEL = 'Sin registro de dolor';

export const getPeakPainLabel = (peakPain: number | null | undefined): string =>
  peakPain == null ? NO_PEAK_PAIN_LABEL : `${peakPain}/10`;
