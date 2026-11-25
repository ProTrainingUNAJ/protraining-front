import { describe, expect, it } from 'vitest';
import {
  isMinorAthlete,
  calculateAge,
  calculateAthleteNutrition,
  calculateMifflinStJeor,
  normalizeGoal,
} from '../nutritionCalculator';

describe('nutritionCalculator', () => {
  describe('calculateAge', () => {
    it('calcula la edad correctamente para una fecha de nacimiento válida', () => {
      // 2000-01-01 -> en 2026 tiene 26 años
      const res = calculateAge('2000-01-01');
      expect(res.isEstimated).toBe(false);
      expect(res.age).toBeGreaterThanOrEqual(25);
    });

    it('retorna fallback estimado si no se proporciona fecha', () => {
      const res = calculateAge(null);
      expect(res.isEstimated).toBe(true);
      expect(res.age).toBe(23);
    });
  });

  describe('normalizeGoal', () => {
    it('normaliza ganar masa muscular con multiplicador 1.15', () => {
      const res = normalizeGoal('Ganar masa muscular');
      expect(res.goalKey).toBe('muscle_gain');
      expect(res.multiplier).toBe(1.15);
      expect(res.percentageAdjustment).toBe(15);
    });

    it('normaliza rendimiento deportivo con multiplicador 1.05', () => {
      const res = normalizeGoal('Rendimiento deportivo');
      expect(res.goalKey).toBe('performance');
      expect(res.multiplier).toBe(1.05);
      expect(res.percentageAdjustment).toBe(5);
    });

    it('normaliza mantener con multiplicador 1.0', () => {
      const res = normalizeGoal('Mantener');
      expect(res.goalKey).toBe('maintain');
      expect(res.multiplier).toBe(1.0);
      expect(res.percentageAdjustment).toBe(0);
    });
  });

  describe('calculateMifflinStJeor', () => {
    it('calcula TMB para un hombre correctamente', () => {
      // 75 kg, 178 cm, 24 años: 10*75 + 6.25*178 - 5*24 + 5 = 750 + 1112.5 - 120 + 5 = 1747.5 -> 1748
      const bmr = calculateMifflinStJeor(75, 178, 24, 'Masculino');
      expect(bmr).toBe(1748);
    });

    it('calcula TMB para una mujer correctamente (-161)', () => {
      // 60 kg, 165 cm, 22 años: 10*60 + 6.25*165 - 5*22 - 161 = 600 + 1031.25 - 110 - 161 = 1360.25 -> 1360
      const bmr = calculateMifflinStJeor(60, 165, 22, 'Femenino');
      expect(bmr).toBe(1360);
    });
  });

  describe('calculateAthleteNutrition', () => {
    it('retorna null si falta peso o altura', () => {
      expect(calculateAthleteNutrition({ weightKg: null, heightCm: 180 })).toBeNull();
      expect(calculateAthleteNutrition({ weightKg: 80, heightCm: 0 })).toBeNull();
    });

    it('calcula correctamente calorías y macros para atleta en superávit (Ganar músculo)', () => {
      const result = calculateAthleteNutrition({
        weightKg: 80,
        heightCm: 180,
        birthDate: '2001-05-10',
        gender: 'Masculino',
        athleticGoal: 'Ganar masa muscular',
      });

      expect(result).not.toBeNull();
      if (!result) return;

      expect(result.goalKey).toBe('muscle_gain');
      expect(result.goalPercentageAdjustment).toBe(15);
      expect(result.targetCalories).toBeGreaterThan(result.tdee);

      // Verificamos gramos por kg de proteína para ganar músculo (2.0 g/kg)
      expect(result.macros.protein.grams).toBe(160); // 80 * 2.0
      expect(result.macros.protein.gramsPerKg).toBe(2);
      expect(result.macros.protein.calories).toBe(640);

      // Verificamos grasas (1.0 g/kg)
      expect(result.macros.fat.grams).toBe(80); // 80 * 1.0
      expect(result.macros.fat.calories).toBe(720);

      // Verificamos carbohidratos (remanente)
      expect(result.macros.carbs.grams).toBeGreaterThan(200);

      // Verificamos que la suma de porcentajes de macros sea 100%
      const totalPct =
        result.macros.protein.percentage +
        result.macros.fat.percentage +
        result.macros.carbs.percentage;
      expect(totalPct).toBe(100);

      // IMC debe estar presente
      expect(result.bmiResult.bmi).toBeCloseTo(24.7, 1);
      expect(result.bmiResult.category.key).toBe('normal');
    });

    it('calcula correctamente para atleta femenina en rendimiento deportivo', () => {
      const result = calculateAthleteNutrition({
        weightKg: 60,
        heightCm: 165,
        birthDate: '2003-02-14',
        gender: 'Femenino',
        athleticGoal: 'Rendimiento deportivo',
      });

      expect(result).not.toBeNull();
      if (!result) return;

      expect(result.goalKey).toBe('performance');
      expect(result.gender).toBe('Femenino');
      expect(result.macros.protein.gramsPerKg).toBe(1.8);
      expect(result.macros.protein.grams).toBe(108); // 60 * 1.8

      const totalPct =
        result.macros.protein.percentage +
        result.macros.fat.percentage +
        result.macros.carbs.percentage;
      expect(totalPct).toBe(100);
    });

    it('calcula correctamente para objetivo mantener', () => {
      const result = calculateAthleteNutrition({
        weightKg: 70,
        heightCm: 175,
        gender: 'Masculino',
        athleticGoal: 'Mantener',
      });

      expect(result).not.toBeNull();
      if (!result) return;

      expect(result.goalKey).toBe('maintain');
      expect(result.targetCalories).toBe(result.tdee);
      expect(result.macros.protein.gramsPerKg).toBe(1.6);
      expect(result.macros.protein.grams).toBe(112); // 70 * 1.6
    });
  });
});

describe('isMinorAthlete (KAN-664)', () => {
  it('usa el dato del back y, si no viene, la fecha de nacimiento', () => {
    expect(isMinorAthlete(true, null)).toBe(true);
    const sixteen = new Date();
    sixteen.setFullYear(sixteen.getFullYear() - 16);
    expect(isMinorAthlete(undefined, sixteen.toISOString().slice(0, 10))).toBe(true);
    expect(isMinorAthlete(false, '2000-05-15')).toBe(false);
    // Sin fecha válida la edad es estimada: no se trata como menor
    expect(isMinorAthlete(undefined, null)).toBe(false);
  });
});
