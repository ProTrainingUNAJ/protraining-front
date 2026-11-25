import { getCategoryDashboardSummary as getCategoryDashboardSummaryRequest } from './generated/seguimiento';
import { extractErrorMessage } from './axiosClient';
import type { CategoryDashboardSummary } from '../types/categoryDashboard';

export interface CategoryDashboardRangeParams {
  from: string;
  to: string;
}

export interface CategoryDashboardOptions {
  /**
   * KAN-651: Si es true, ante un 404/NotFound retorna null en lugar de rechazar con Error.
   */
  silentNotFound?: boolean;
}

// Resumen anónimo de presentismo, lesiones y carga de una categoría (KAN-504, KAN-651).
// El contrato y los tipos salen del SDK generado: acá solo se traducen los errores.
export const categoryDashboardService = {
  async getByCategory(
    categoryId: string,
    range: CategoryDashboardRangeParams,
    options?: CategoryDashboardOptions,
  ): Promise<CategoryDashboardSummary | null> {
    try {
      const { data } = await getCategoryDashboardSummaryRequest({
        path: { categoryId },
        query: { from: range.from, to: range.to },
        throwOnError: true,
      });
      return data;
    } catch (error: unknown) {
      if (options?.silentNotFound) {
        const status =
          (error as { status?: number })?.status ??
          (error as { response?: { status?: number } })?.response?.status;
        const msg = extractErrorMessage(error);
        if (
          status === 404 ||
          msg.toLowerCase().includes('no existe') ||
          msg.toLowerCase().includes('not found')
        ) {
          return null;
        }
      }
      throw new Error(extractErrorMessage(error), { cause: error });
    }
  },
};
