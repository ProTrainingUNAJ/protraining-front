import {
  getMyTodayRoutine,
  recordPerformedSets,
  type TodayRoutineResponse,
  type PerformedSetInput,
  type RecordPerformedSetsResponse,
} from './generated/entrenamiento';
import { extractErrorMessage } from './axiosClient';

export const todayRoutineService = {
  /**
   * Obtiene la rutina del día del atleta autenticado.
   */
  async getMyRoutine(date?: string): Promise<TodayRoutineResponse> {
    try {
      const { data } = await getMyTodayRoutine({
        query: date ? { date } : undefined,
        throwOnError: true,
      });
      return data;
    } catch (error) {
      throw new Error(extractErrorMessage(error), { cause: error });
    }
  },

  /**
   * Registra las series realizadas por el atleta para la rutina de hoy.
   * Aplica Epley en el backend y genera propuestas de nuevo récord si supera la marca vigente.
   */
  async recordSets(sets: PerformedSetInput[]): Promise<RecordPerformedSetsResponse> {
    try {
      const { data } = await recordPerformedSets({
        body: sets,
        throwOnError: true,
      });
      return data;
    } catch (error) {
      throw new Error(extractErrorMessage(error), { cause: error });
    }
  },
};
