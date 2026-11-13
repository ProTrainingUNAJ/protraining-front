import { getRecordsReliability } from './generated/entrenamiento';
import { extractErrorMessage } from './axiosClient';
import { RecordsReliabilitySummary } from '../types/recordsReliability';

// Resumen de confiabilidad de los récords de una categoría (KAN-416).
export const recordsReliabilityService = {
  async getByCategory(categoryId: string, exerciseId?: string): Promise<RecordsReliabilitySummary> {
    try {
      const { data } = await getRecordsReliability({
        query: {
          categoryId,
          exerciseId: exerciseId || undefined,
        },
        throwOnError: true,
      });
      return data as RecordsReliabilitySummary;
    } catch (error) {
      throw new Error(extractErrorMessage(error), { cause: error });
    }
  },
};
