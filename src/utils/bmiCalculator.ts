/**
 * Utilidades para el cálculo y clasificación del Índice de Masa Corporal (IMC)
 * según los estándares de la Organización Mundial de la Salud (OMS).
 *
 * Fórmula: IMC = peso (kg) / [estatura (m)]^2
 */

export type BmiCategoryKey = 'underweight' | 'normal' | 'overweight' | 'obese';

export interface BmiCategoryInfo {
  key: BmiCategoryKey;
  label: string;
  rangeLabel: string;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
}

export const BMI_CATEGORIES: Record<BmiCategoryKey, BmiCategoryInfo> = {
  underweight: {
    key: 'underweight',
    label: 'Bajo peso',
    rangeLabel: '< 18.5',
    color: '#0284c7',
    bgColor: 'rgba(2, 132, 199, 0.12)',
    borderColor: 'rgba(2, 132, 199, 0.3)',
    description: 'Por debajo del rango recomendado.',
  },
  normal: {
    key: 'normal',
    label: 'Peso saludable',
    rangeLabel: '18.5 – 24.9',
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
    description: 'Dentro del rango estándar óptimo.',
  },
  overweight: {
    key: 'overweight',
    label: 'Sobrepeso',
    rangeLabel: '25.0 – 29.9',
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
    description: 'Ligeramente superior al rango estándar.',
  },
  obese: {
    key: 'obese',
    label: 'Obesidad',
    rangeLabel: '≥ 30.0',
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    description: 'Significativamente superior al rango estándar.',
  },
};

export interface BmiResult {
  bmi: number;
  category: BmiCategoryInfo;
  gaugePercentage: number; // 0 - 100 para posicionar la aguja en la barra segmentada
  weightKg: number;
  heightCm: number;
  heightM: number;
}

/**
 * Calcula el IMC a partir del peso en kg y la estatura en cm.
 * Retorna null si alguno de los valores es nulo, menor o igual a cero, o inválido.
 */
export function calculateBmi(weightKg?: number | null, heightCm?: number | null): BmiResult | null {
  if (
    weightKg === undefined ||
    weightKg === null ||
    heightCm === undefined ||
    heightCm === null ||
    isNaN(weightKg) ||
    isNaN(heightCm) ||
    weightKg <= 0 ||
    heightCm <= 0
  ) {
    return null;
  }

  const heightM = heightCm / 100;
  const rawBmi = weightKg / (heightM * heightM);
  const bmi = Math.round(rawBmi * 10) / 10;

  let categoryKey: BmiCategoryKey;
  let gaugePercentage: number;

  if (bmi < 18.5) {
    categoryKey = 'underweight';
    // Rango 14.0 a 18.5 mapea al 0% - 25% de la barra
    const minRef = 14.0;
    const maxRef = 18.5;
    const ratio = Math.max(0, Math.min(1, (bmi - minRef) / (maxRef - minRef)));
    gaugePercentage = Math.max(3, Math.min(23, ratio * 25));
  } else if (bmi < 25.0) {
    categoryKey = 'normal';
    // Rango 18.5 a 24.9 mapea al 25% - 50% de la barra
    const minRef = 18.5;
    const maxRef = 24.99;
    const ratio = Math.max(0, Math.min(1, (bmi - minRef) / (maxRef - minRef)));
    gaugePercentage = 25 + ratio * 25;
  } else if (bmi < 30.0) {
    categoryKey = 'overweight';
    // Rango 25.0 a 29.9 mapea al 50% - 75% de la barra
    const minRef = 25.0;
    const maxRef = 29.99;
    const ratio = Math.max(0, Math.min(1, (bmi - minRef) / (maxRef - minRef)));
    gaugePercentage = 50 + ratio * 25;
  } else {
    categoryKey = 'obese';
    // Rango 30.0 a 38.0 mapea al 75% - 100% de la barra
    const minRef = 30.0;
    const maxRef = 38.0;
    const ratio = Math.max(0, Math.min(1, (bmi - minRef) / (maxRef - minRef)));
    gaugePercentage = Math.min(97, 75 + ratio * 25);
  }

  return {
    bmi,
    category: BMI_CATEGORIES[categoryKey],
    gaugePercentage: Math.round(gaugePercentage * 10) / 10,
    weightKg,
    heightCm,
    heightM: Math.round(heightM * 100) / 100,
  };
}
