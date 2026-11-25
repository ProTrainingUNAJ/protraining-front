import { calculateBmi, type BmiResult } from './bmiCalculator';

/**
 * Módulo de Nutrición Deportiva Personalizada (KAN-664).
 *
 * Implementa el cálculo de:
 * 1. Metabolismo Basal (TMB) vía fórmula Mifflin-St Jeor (peso, altura, edad, sexo).
 * 2. Gasto Energético Total Diario (TDEE) multiplicando TMB por factor de actividad física (1.6).
 * 3. Calorías Objetivo ajustadas según meta atlética (Mantener, Ganar masa muscular, Rendimiento deportivo).
 * 4. Desglose de Macronutrientes en gramos por kilo de peso corporal (g/kg), calorías y porcentajes.
 */

export type NutritionGoalKey = 'maintain' | 'muscle_gain' | 'performance';

export interface AthleteNutritionInput {
  weightKg?: number | null;
  heightCm?: number | null;
  birthDate?: string | null;
  gender?: string | null;
  athleticGoal?: string | null;
}

export interface MacroDetail {
  grams: number;
  gramsPerKg: number;
  calories: number;
  percentage: number;
}

export interface NutritionCalculationResult {
  weightKg: number;
  heightCm: number;
  ageYears: number;
  gender: string;
  isAgeEstimated: boolean;
  goalKey: NutritionGoalKey;
  goalLabel: string;
  goalPercentageAdjustment: number;
  bmr: number; // TMB Mifflin-St Jeor
  activityFactor: number; // 1.6
  tdee: number; // TMB * 1.6
  targetCalories: number; // Calorías finales diarias recomendadas
  macros: {
    protein: MacroDetail;
    fat: MacroDetail;
    carbs: MacroDetail;
  };
  bmiResult: BmiResult;
}

/**
 * Calcula la edad en años a partir de una fecha de nacimiento ISO (YYYY-MM-DD).
 * Si no es válida o no está presente, retorna un fallback estándar para atletas de club (23 años).
 */
export function calculateAge(
  birthDate?: string | null,
  fallbackAge = 23,
): { age: number; isEstimated: boolean } {
  if (!birthDate) {
    return { age: fallbackAge, isEstimated: true };
  }

  const birth = new Date(birthDate);
  if (isNaN(birth.getTime())) {
    return { age: fallbackAge, isEstimated: true };
  }

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  if (age < 10 || age > 90) {
    return { age: fallbackAge, isEstimated: true };
  }

  return { age, isEstimated: false };
}

/**
 * Normaliza el objetivo deportivo del atleta a una clave tipada y su etiqueta amigable.
 */
export function normalizeGoal(goalText?: string | null): {
  goalKey: NutritionGoalKey;
  label: string;
  multiplier: number;
  percentageAdjustment: number;
} {
  const normalized = (goalText || '').toLowerCase().trim();

  if (
    normalized.includes('ganar') ||
    normalized.includes('musculo') ||
    normalized.includes('músculo') ||
    normalized.includes('hipertrofia') ||
    normalized.includes('volumen')
  ) {
    return {
      goalKey: 'muscle_gain',
      label: 'Ganar masa muscular',
      multiplier: 1.15, // +15% de superávit
      percentageAdjustment: 15,
    };
  }

  if (
    normalized.includes('rendimiento') ||
    normalized.includes('deportivo') ||
    normalized.includes('competencia') ||
    normalized.includes('fuerza')
  ) {
    return {
      goalKey: 'performance',
      label: 'Rendimiento deportivo',
      multiplier: 1.05, // +5% de superávit de soporte
      percentageAdjustment: 5,
    };
  }

  return {
    goalKey: 'maintain',
    label: 'Mantener',
    multiplier: 1.0, // 0% mantenimiento
    percentageAdjustment: 0,
  };
}

/**
 * Calcula la Tasa Metabólica Basal (TMB / BMR) mediante Mifflin-St Jeor.
 * Hombres: 10 * peso (kg) + 6.25 * altura (cm) - 5 * edad (años) + 5
 * Mujeres: 10 * peso (kg) + 6.25 * altura (cm) - 5 * edad (años) - 161
 */
export function calculateMifflinStJeor(
  weightKg: number,
  heightCm: number,
  ageYears: number,
  gender?: string | null,
): number {
  const isFemale = (gender || '').toLowerCase().trim().startsWith('f');
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  const bmr = isFemale ? base - 161 : base + 5;
  return Math.round(bmr);
}

/**
 * Factor de actividad física estándar para atletas de club que entrenan regularmente.
 */
export const ATHLETE_ACTIVITY_FACTOR = 1.6;

/**
 * Realiza el cálculo nutricional completo a partir de los datos antropométricos del atleta.
 * Retorna null si faltan peso o altura válidos.
 */
export function calculateAthleteNutrition(
  input: AthleteNutritionInput,
): NutritionCalculationResult | null {
  const { weightKg, heightCm, birthDate, gender, athleticGoal } = input;

  const bmiResult = calculateBmi(weightKg, heightCm);
  if (!bmiResult || !weightKg || !heightCm) {
    return null;
  }

  // Paso 1: Edad y TMB (Mifflin-St Jeor)
  const { age, isEstimated } = calculateAge(birthDate);
  const bmr = calculateMifflinStJeor(weightKg, heightCm, age, gender);

  // Paso 2: Gasto Energético Total (TDEE)
  const tdee = Math.round(bmr * ATHLETE_ACTIVITY_FACTOR);

  // Paso 3: Ajuste según objetivo deportivo
  const {
    goalKey,
    label: goalLabel,
    multiplier,
    percentageAdjustment,
  } = normalizeGoal(athleticGoal);
  const targetCalories = Math.round(tdee * multiplier);

  // Paso 4: Macronutrientes por g/kg
  // Proteína: 1.6 a 2.2 g/kg (4 kcal/g)
  let proteinRatio = 1.8;
  if (goalKey === 'muscle_gain') {
    proteinRatio = 2.0;
  } else if (goalKey === 'maintain') {
    proteinRatio = 1.6;
  }

  // Grasa: 0.8 a 1.0 g/kg (9 kcal/g) para salud hormonal (20% - 30% del total)
  let fatRatio = 0.9;
  if (goalKey === 'muscle_gain') {
    fatRatio = 1.0;
  }

  const proteinGrams = Math.round(weightKg * proteinRatio);
  const proteinCalories = proteinGrams * 4;

  const fatGrams = Math.round(weightKg * fatRatio);
  const fatCalories = fatGrams * 9;

  // Carbohidratos: el resto calórico disponible (4 kcal/g)
  const remainingCalories = Math.max(0, targetCalories - (proteinCalories + fatCalories));
  const carbGrams = Math.round(remainingCalories / 4);
  const carbCalories = carbGrams * 4;

  // Recalculamos la suma exacta de calorías de macros para consistencia matemática
  const totalMacroCalories = proteinCalories + fatCalories + carbCalories;

  const proteinPct = Math.round((proteinCalories / totalMacroCalories) * 100);
  const fatPct = Math.round((fatCalories / totalMacroCalories) * 100);
  const carbPct = Math.max(0, 100 - (proteinPct + fatPct));

  const normalizedGender = (gender || '').toLowerCase().trim().startsWith('f')
    ? 'Femenino'
    : 'Masculino';

  return {
    weightKg,
    heightCm,
    ageYears: age,
    gender: normalizedGender,
    isAgeEstimated: isEstimated,
    goalKey,
    goalLabel,
    goalPercentageAdjustment: percentageAdjustment,
    bmr,
    activityFactor: ATHLETE_ACTIVITY_FACTOR,
    tdee,
    targetCalories,
    macros: {
      protein: {
        grams: proteinGrams,
        gramsPerKg: Math.round((proteinGrams / weightKg) * 10) / 10,
        calories: proteinCalories,
        percentage: proteinPct,
      },
      fat: {
        grams: fatGrams,
        gramsPerKg: Math.round((fatGrams / weightKg) * 10) / 10,
        calories: fatCalories,
        percentage: fatPct,
      },
      carbs: {
        grams: carbGrams,
        gramsPerKg: Math.round((carbGrams / weightKg) * 10) / 10,
        calories: carbCalories,
        percentage: carbPct,
      },
    },
    bmiResult,
  };
}
