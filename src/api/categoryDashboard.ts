import { getCategoryDashboardSummary as getCategoryDashboardSummaryRequest } from './generated/seguimiento';
import { extractErrorMessage } from './axiosClient';
import type { CategoryDashboardSummary } from '../types/categoryDashboard';

export interface CategoryDashboardRangeParams {
  from: string;
  to: string;
}

// Resumen anónimo de presentismo, lesiones y carga de una categoría (KAN-504).
// El contrato y los tipos salen del SDK generado: acá solo se traducen los errores.
export const categoryDashboardService = {
  async getByCategory(
    categoryId: string,
    range: CategoryDashboardRangeParams,
  ): Promise<CategoryDashboardSummary> {
    try {
      const { data } = await getCategoryDashboardSummaryRequest({
        path: { categoryId },
        query: { from: range.from, to: range.to },
        throwOnError: true,
      });
      return data;
    } catch (error) {
      throw new Error(extractErrorMessage(error), { cause: error });
    }
  },
};
