import {
  getAthleteDayConflicts,
  createAthleteDayAdjustment,
  approveDayAdjustment,
  rejectDayAdjustment,
  type DayConflictsResponse,
  type DayAdjustmentResponse,
  type ApproveDayAdjustmentRequest,
  type RejectDayAdjustmentRequest,
} from './generated/asistente';
import { extractErrorMessage } from './axiosClient';

export type {
  DayConflictsResponse,
  DayAdjustmentResponse,
  ApproveDayAdjustmentRequest,
  RejectDayAdjustmentRequest,
};

// Con Ollama la generación de la justificación puede demorar más de 15 s:
// damos margen de 120 s igual que en planDrafts.ts.
const AI_GENERATION_TIMEOUT_MS = 120_000;

export const dayAdjustmentsService = {
  /**
   * Detecta si la rutina de hoy del atleta tiene ejercicios en conflicto con zonas de dolor
   * reportadas en el check-in (KAN-451).
   */
  async getAthleteDayConflicts(athleteId: string): Promise<DayConflictsResponse> {
    try {
      const { data } = await getAthleteDayConflicts({
        path: { athleteId },
        throwOnError: true,
      });
      return data;
    } catch (error) {
      throw new Error(extractErrorMessage(error), { cause: error });
    }
  },

  /**
   * Genera o recupera la propuesta pendiente de ajuste del día para el atleta (KAN-452).
   */
  async createOrGetDayAdjustment(athleteId: string): Promise<DayAdjustmentResponse> {
    try {
      const { data } = await createAthleteDayAdjustment({
        path: { athleteId },
        timeout: AI_GENERATION_TIMEOUT_MS,
        throwOnError: true,
      });
      return data;
    } catch (error) {
      throw new Error(extractErrorMessage(error), { cause: error });
    }
  },

  /**
   * Aprueba la propuesta de ajuste del día con o sin modificaciones en los sustitutos (KAN-452).
   */
  async approveDayAdjustment(
    id: string,
    request?: ApproveDayAdjustmentRequest,
  ): Promise<DayAdjustmentResponse> {
    try {
      const { data } = await approveDayAdjustment({
        path: { id },
        body: request,
        throwOnError: true,
      });
      return data;
    } catch (error) {
      throw new Error(extractErrorMessage(error), { cause: error });
    }
  },

  /**
   * Rechaza la propuesta de ajuste del día con motivo opcional (KAN-452).
   */
  async rejectDayAdjustment(
    id: string,
    request?: RejectDayAdjustmentRequest,
  ): Promise<DayAdjustmentResponse> {
    try {
      const { data } = await rejectDayAdjustment({
        path: { id },
        body: request,
        throwOnError: true,
      });
      return data;
    } catch (error) {
      throw new Error(extractErrorMessage(error), { cause: error });
    }
  },
};
