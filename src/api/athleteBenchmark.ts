import {
  getCategoryAverages as getCategoryAveragesRequest,
  CategoryAveragesResponse,
} from './generated/seguimiento';
import { athleteRecordsService } from './athleteRecords';
import { extractErrorMessage, httpClient } from './axiosClient';
import {
  AthleteBenchmarkItem,
  CategoryBenchmarkSummary,
  GroupBenchmarkResponse,
} from '../types/benchmark';
import { calculateBenchmarkItem, evaluateCategoryBenchmark } from '../utils/benchmarkCalculator';

export const athleteBenchmarkService = {
  /**
   * Obtiene la comparativa directa del atleta frente a su grupo desde Seguimiento (KAN-449).
   */
  async getMyGroupBenchmark(
    athleteId: string,
    categoryId?: string,
  ): Promise<GroupBenchmarkResponse> {
    try {
      const url = `/seguimiento/api/v1/athletes/${athleteId}/group-benchmark${categoryId ? `?categoryId=${categoryId}` : ''}`;
      const response = await httpClient.get<GroupBenchmarkResponse>(url);
      return response.data;
    } catch (error) {
      try {
        const fallbackUrl = `/api/v1/athletes/${athleteId}/group-benchmark${categoryId ? `?categoryId=${categoryId}` : ''}`;
        const fallbackResponse = await httpClient.get<GroupBenchmarkResponse>(fallbackUrl);
        return fallbackResponse.data;
      } catch {
        throw new Error(extractErrorMessage(error), { cause: error });
      }
    }
  },

  /**
   * Obtiene los promedios calculados de la categoría desde Seguimiento (KAN-447).
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
   * Consolida el benchmark comparativo entre el atleta y su categoría (vista PF, KAN-448).
   * Consume exclusivamente datos reales persistidos en backend:
   * 1. Promedios de tests de la categoría (Seguimiento).
   * 2. Récords vigentes 1RM del atleta (Entrenamiento).
   *
   * Sin persistencia en localStorage ni datos ficticios.
   */
  async getAthleteBenchmark(
    athleteId: string,
    categoryId: string,
    athleteName: string,
    categoryName: string,
    options?: {
      weekStart?: string;
    },
  ): Promise<CategoryBenchmarkSummary> {
    // 1. Obtener promedios de la categoría (KAN-447)
    const categoryAverages = await this.getCategoryAverages(categoryId, options?.weekStart);

    // 2. Obtener mediciones reales del atleta desde el servicio de Entrenamiento (Récords 1RM)
    const strengthRecords = await athleteRecordsService.listCurrent(athleteId).catch(() => []);

    // 3. Cruzar cada test físico de la categoría con la medición real del atleta
    const rawItems: AthleteBenchmarkItem[] = [];
    const fitnessTests = categoryAverages.fitnessTests || [];

    for (const test of fitnessTests) {
      const testNormalized = test.testName.trim().toLowerCase();

      // Cruzar con récords de fuerza 1RM por nombre de ejercicio normalizado
      const matchStrength = strengthRecords.find(
        (r) => r.exerciseName.trim().toLowerCase() === testNormalized,
      );

      let athleteVal: number | null = null;
      let athleteDate: string | null = null;

      if (matchStrength) {
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
