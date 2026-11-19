import { describe, it, expect } from 'vitest';
import { calculateTimeTarget, evaluateTimeTarget } from '../timeTarget';

describe('calculateTimeTarget (KAN-455 / KAN-497)', () => {
  it('Criterio de aceptación: 100 m en 14 s al 90 % da meta de 15,6 s', () => {
    const meta = calculateTimeTarget(14, 90);
    expect(meta).toBe(15.6);
  });

  it.each([
    { bestTime: 14, percentage: 100, expected: 14 },
    { bestTime: 14, percentage: 90, expected: 15.6 },
    { bestTime: 14, percentage: 80, expected: 17.5 },
    { bestTime: 14, percentage: 75, expected: 18.7 },
    { bestTime: 12, percentage: 90, expected: 13.3 },
    { bestTime: 10.5, percentage: 85, expected: 12.4 },
    { bestTime: 25, percentage: 80, expected: 31.3 },
    { bestTime: 10, percentage: 95, expected: 10.5 },
  ])(
    'calcula correctamente marca $bestTime s al $percentage % -> $expected s',
    ({ bestTime, percentage, expected }) => {
      expect(calculateTimeTarget(bestTime, percentage)).toBe(expected);
    },
  );

  it('si no tiene test (null, undefined o 0), devuelve null (serie sin meta)', () => {
    expect(calculateTimeTarget(null, 90)).toBeNull();
    expect(calculateTimeTarget(undefined, 90)).toBeNull();
    expect(calculateTimeTarget(0, 90)).toBeNull();
  });

  it('si el porcentaje es nulo, indefinido, cero o negativo, devuelve null', () => {
    expect(calculateTimeTarget(14, null)).toBeNull();
    expect(calculateTimeTarget(14, undefined)).toBeNull();
    expect(calculateTimeTarget(14, 0)).toBeNull();
    expect(calculateTimeTarget(14, -10)).toBeNull();
  });
});

describe('evaluateTimeTarget (KAN-497)', () => {
  it('marca cumplida cuando el tiempo realizado es menor o igual a la meta', () => {
    expect(evaluateTimeTarget(15.2, 15.6)).toEqual({
      isAchieved: true,
      differenceSeconds: -0.4,
      statusLabel: 'Cumplida',
    });

    expect(evaluateTimeTarget(15.6, 15.6)).toEqual({
      isAchieved: true,
      differenceSeconds: 0,
      statusLabel: 'Cumplida',
    });
  });

  it('marca superada cuando el tiempo realizado es mayor a la meta', () => {
    expect(evaluateTimeTarget(16.1, 15.6)).toEqual({
      isAchieved: false,
      differenceSeconds: 0.5,
      statusLabel: 'Superó la meta',
    });
  });

  it('cuando no hay meta prescrita (null o 0), considera la serie completada', () => {
    expect(evaluateTimeTarget(15.0, null)).toEqual({
      isAchieved: true,
      differenceSeconds: null,
      statusLabel: 'Completada',
    });
    expect(evaluateTimeTarget(15.0, 0)).toEqual({
      isAchieved: true,
      differenceSeconds: null,
      statusLabel: 'Completada',
    });
  });

  it('devuelve null si el tiempo realizado no es válido', () => {
    expect(evaluateTimeTarget(null, 15.6)).toBeNull();
    expect(evaluateTimeTarget(undefined, 15.6)).toBeNull();
    expect(evaluateTimeTarget(0, 15.6)).toBeNull();
    expect(evaluateTimeTarget(Number.NaN, 15.6)).toBeNull();
  });
});
