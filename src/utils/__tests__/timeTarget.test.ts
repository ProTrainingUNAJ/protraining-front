import { describe, it, expect } from 'vitest';
import { calculateTimeTarget } from '../timeTarget';

describe('calculateTimeTarget (KAN-455)', () => {
  it('Criterio de aceptación: 100 m en 14 s al 90 % da meta de 15,6 s', () => {
    const meta = calculateTimeTarget(14, 90);
    expect(meta).toBe(15.6);
  });

  it('si no tiene test (null o undefined), devuelve null (serie sin meta)', () => {
    expect(calculateTimeTarget(null, 90)).toBeNull();
    expect(calculateTimeTarget(undefined, 90)).toBeNull();
  });

  it('al 100 % de intensidad la meta es exactamente su mejor marca', () => {
    expect(calculateTimeTarget(14, 100)).toBe(14);
  });
});
