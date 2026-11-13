import {
  getAthleteEvolution as getAthleteEvolutionRequest,
  AthleteEvolutionResponse,
} from './generated/seguimiento';
import { extractErrorMessage } from './axiosClient';

export interface GetEvolutionOptions {
  months?: number;
  from?: string;
  to?: string;
}

export const athleteEvolutionService = {
  /**
   * Obtiene la evolución unificada del atleta desde Seguimiento (KAN-434 / KAN-435).
   * Incluye curvas de fuerza (1RM), capacidades atléticas (salto, velocidad) y fatiga/wellness.
   * Si Entrenamiento no responde, devuelve modo degradado con strengthUnavailable: true.
   * Si el atleta no pertenece al PF logueado, responde 404 (Atleta no encontrado).
   */
  async getEvolution(
    athleteId: string,
    options?: GetEvolutionOptions,
  ): Promise<AthleteEvolutionResponse> {
    try {
      const response = await getAthleteEvolutionRequest({
        path: { athleteId },
        query: options
          ? {
              months: options.months,
              from: options.from,
              to: options.to,
            }
          : undefined,
        throwOnError: true,
      });
      return response.data;
    } catch (error) {
      throw new Error(extractErrorMessage(error), { cause: error });
    }
  },
};
