import {
  getAthleteWeeklyTrends as getAthleteWeeklyTrendsRequest,
  AthleteWeeklyTrendsResponse,
} from './generated/seguimiento';
import { extractErrorMessage } from './axiosClient';

export interface GetWeeklyTrendsOptions {
  weeks?: number;
  from?: string;
  to?: string;
}

export const athleteTrendsService = {
  /**
   * Obtiene las tendencias semanales de wellness y carga del atleta desde Seguimiento (KAN-489 / KAN-490).
   * Por defecto consulta las últimas 4 semanas de datos combinados.
   */
  async getAthleteTrends(
    athleteId: string,
    options?: GetWeeklyTrendsOptions,
  ): Promise<AthleteWeeklyTrendsResponse> {
    try {
      const response = await getAthleteWeeklyTrendsRequest({
        path: { athleteId },
        query: options
          ? {
              weeks: options.weeks ?? 4,
              from: options.from,
              to: options.to,
            }
          : { weeks: 4 },
        throwOnError: true,
      });
      return response.data;
    } catch (error) {
      throw new Error(extractErrorMessage(error), { cause: error });
    }
  },
};
