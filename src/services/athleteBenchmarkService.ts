import {
  getCategoryAverages as getCategoryAveragesRequest,
  CategoryAveragesResponse,
} from '../api/generated/seguimiento';
import { athleteRecordsService } from '../api/athleteRecords';
import { extractErrorMessage } from '../api/axiosClient';
import { AthleteBenchmarkItem, CategoryBenchmarkSummary } from '../types/benchmark';
import { calculateBenchmarkItem, evaluateCategoryBenchmark } from '../utils/benchmarkCalculator';

const EVALUATIONS_STORAGE_PREFIX = 'protraining_athlete_evaluations_';

export interface AthleteManualEvaluation {
  testName: string;
  value: number;
  unit: string;
  date: string;
}

/**
 * Obtiene evaluaciones locales/manuales registradas para el atleta.
 */
export function getStoredAthleteEvaluations(athleteId: string): AthleteManualEvaluation[] {
  try {
    const raw = localStorage.getItem(`${EVALUATIONS_STORAGE_PREFIX}${athleteId}`);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Guarda o actualiza una evaluación física del atleta.
 */
export function saveAthleteEvaluation(
  athleteId: string,
  testName: string,
  value: number,
  unit: string,
): AthleteManualEvaluation[] {
  const current = getStoredAthleteEvaluations(athleteId);
  const nowIso = new Date().toISOString();

  const filtered = current.filter(
    (e) => e.testName.trim().toLowerCase() !== testName.trim().toLowerCase(),
  );

  filtered.push({
    testName: testName.trim(),
    value,
    unit: unit.trim(),
    date: nowIso,
  });

  try {
    localStorage.setItem(`${EVALUATIONS_STORAGE_PREFIX}${athleteId}`, JSON.stringify(filtered));
  } catch (error) {
    console.warn('No se pudo guardar la evaluación en localStorage', error);
  }

  return filtered;
}

export const athleteBenchmarkService = {
  /**
   * Obtiene los promedios calculados de la categoría desde Seguimiento.
   */
  async getCategoryAverages(
    categoryId: string,
    weekStart?: string,
  ): Promise<CategoryAveragesResponse> {
    try {
      const response = await getCategoryAveragesRequest({
        path: { categoryId },
        query: weekStart ? { weekStart } : undefined,
        throwOnError: true,
      });
      return response.data;
    } catch (error) {
      throw new Error(extractErrorMessage(error), { cause: error });
    }
  },

  /**
   * Consolida el benchmark comparativo entre el atleta y su categoría.
   */
  async getAthleteBenchmark(
    athleteId: string,
    categoryId: string,
    athleteName: string,
    categoryName: string,
    options?: {
      weekStart?: string;
      customEvaluations?: AthleteManualEvaluation[];
    },
  ): Promise<CategoryBenchmarkSummary> {
    // 1. Obtener promedios de la categoría (KAN-447)
    const categoryAverages = await this.getCategoryAverages(categoryId, options?.weekStart);

    // 2. Obtener mediciones del atleta (Récords de fuerza + Evaluaciones guardadas)
    const storedEvaluations = options?.customEvaluations ?? getStoredAthleteEvaluations(athleteId);

    // Intentamos cargar récords 1RM sin romper si falla
    const strengthRecords = await athleteRecordsService.listCurrent(athleteId).catch(() => []);

    // 3. Cruzar cada test físico de la categoría con la medición del atleta
    const rawItems: AthleteBenchmarkItem[] = [];

    const fitnessTests = categoryAverages.fitnessTests || [];

    for (const test of fitnessTests) {
      const testNormalized = test.testName.trim().toLowerCase();

      // Buscar si el atleta tiene una evaluación manual para este test
      const matchManual = storedEvaluations.find(
        (e) => e.testName.trim().toLowerCase() === testNormalized,
      );

      // Buscar si coincide con un récord de fuerza 1RM
      const matchStrength = strengthRecords.find(
        (r) => r.exerciseName.trim().toLowerCase() === testNormalized,
      );

      let athleteVal: number | null = null;
      let athleteDate: string | null = null;

      if (matchManual) {
        athleteVal = matchManual.value;
        athleteDate = matchManual.date;
      } else if (matchStrength) {
        athleteVal = matchStrength.weightKg;
        athleteDate = matchStrength.achievedAt;
      }

      const item = calculateBenchmarkItem(test.testName, test.unit, athleteVal, test.average, {
        testId: test.testId,
        motorSkill: test.motorSkill,
        athleteTestedDate: athleteDate,
        testedAthleteCount: test.testedAthleteCount,
      });

      rawItems.push(item);
    }

    // 4. Evaluar lista completa, detectar estados y señalar el punto más débil
    const evaluatedItems = evaluateCategoryBenchmark(rawItems);

    const weakest = evaluatedItems.find((i) => i.isWeakestPoint) || null;
    const areasToImproveCount = evaluatedItems.filter((i) => i.status === 'below_average').length;

    return {
      categoryId,
      categoryName,
      athleteId,
      athleteName,
      athleteCount: categoryAverages.athleteCount,
      items: evaluatedItems,
      weakestPoint: weakest,
      areasToImproveCount,
    };
  },
};
