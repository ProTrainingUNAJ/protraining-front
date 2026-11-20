import { describe, expect, it } from 'vitest';
import { getPeakPainLabel, NO_PEAK_PAIN_LABEL } from '../resolvedInjuriesHistoryHelper';

describe('getPeakPainLabel · KAN-488', () => {
  it('muestra el texto explícito cuando no hay registro de dolor', () => {
    expect(getPeakPainLabel(null)).toBe(NO_PEAK_PAIN_LABEL);
    expect(getPeakPainLabel(undefined)).toBe(NO_PEAK_PAIN_LABEL);
  });

  it('muestra 0/10 cuando el pico registrado fue sin dolor', () => {
    expect(getPeakPainLabel(0)).toBe('0/10');
  });

  it('muestra el pico registrado sobre 10', () => {
    expect(getPeakPainLabel(7)).toBe('7/10');
    expect(getPeakPainLabel(10)).toBe('10/10');
  });
});
