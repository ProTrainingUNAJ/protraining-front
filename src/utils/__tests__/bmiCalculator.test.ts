import { describe, it, expect } from 'vitest';
import { calculateBmi } from '../bmiCalculator';

describe('Cálculo de IMC y categorías de composición corporal (KAN-664)', () => {
  it('retorna null ante valores nulos, no numéricos o menores o iguales a cero', () => {
    expect(calculateBmi(null, null)).toBeNull();
    expect(calculateBmi(70, null)).toBeNull();
    expect(calculateBmi(null, 175)).toBeNull();
    expect(calculateBmi(0, 175)).toBeNull();
    expect(calculateBmi(70, 0)).toBeNull();
    expect(calculateBmi(-10, 175)).toBeNull();
    expect(calculateBmi(70, -175)).toBeNull();
  });

  it('calcula correctamente el IMC para un atleta con peso saludable', () => {
    // 78 kg y 178 cm -> 78 / (1.78^2) = 24.618 -> 24.6
    const res = calculateBmi(78, 178);
    expect(res).not.toBeNull();
    expect(res?.bmi).toBe(24.6);
    expect(res?.category.key).toBe('normal');
    expect(res?.category.label).toBe('Peso saludable');
    expect(res?.gaugePercentage).toBeGreaterThanOrEqual(25);
    expect(res?.gaugePercentage).toBeLessThanOrEqual(50);
  });

  it('clasifica como Bajo peso cuando IMC < 18.5', () => {
    // 48 kg y 170 cm -> 48 / (1.7^2) = 16.6
    const res = calculateBmi(48, 170);
    expect(res).not.toBeNull();
    expect(res?.bmi).toBe(16.6);
    expect(res?.category.key).toBe('underweight');
    expect(res?.category.label).toBe('Bajo peso');
    expect(res?.gaugePercentage).toBeLessThan(25);
  });

  it('clasifica como Sobrepeso cuando 25.0 <= IMC < 30.0', () => {
    // 85 kg y 175 cm -> 85 / (1.75^2) = 27.755 -> 27.8
    const res = calculateBmi(85, 175);
    expect(res).not.toBeNull();
    expect(res?.bmi).toBe(27.8);
    expect(res?.category.key).toBe('overweight');
    expect(res?.category.label).toBe('Sobrepeso');
    expect(res?.gaugePercentage).toBeGreaterThanOrEqual(50);
    expect(res?.gaugePercentage).toBeLessThan(75);
  });

  it('clasifica como Obesidad cuando IMC >= 30.0', () => {
    // 105 kg y 175 cm -> 105 / (1.75^2) = 34.285 -> 34.3
    const res = calculateBmi(105, 175);
    expect(res).not.toBeNull();
    expect(res?.bmi).toBe(34.3);
    expect(res?.category.key).toBe('obese');
    expect(res?.category.label).toBe('Obesidad');
    expect(res?.gaugePercentage).toBeGreaterThanOrEqual(75);
  });
});
