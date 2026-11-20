import axios from 'axios';
import {
  generateAthleteAdaptation,
  getAthleteAdaptationContext,
  type AdaptationChange,
  type AthleteAdaptationContextResponse,
  type AuthorizedSubstituteContext,
  type GenerateAthleteAdaptationRequest,
  type RoutineAdaptationResponse,
  type SuggestedRoutineExercise,
} from './generated/asistente';
import {
  applyAthleteSessionAdjustment,
  getAthleteSessionAdjustment,
  type ApplyAthleteSessionAdjustmentRequest,
  type ApplyAthleteSessionAdjustmentResponse,
} from './generated/entrenamiento';
import { extractErrorMessage } from './axiosClient';

export type AdaptationRecordContext = NonNullable<
  AthleteAdaptationContextResponse['currentRecords']
>[number];

export type {
  AdaptationChange,
  AthleteAdaptationContextResponse,
  AuthorizedSubstituteContext,
  GenerateAthleteAdaptationRequest,
  RoutineAdaptationResponse,
  SuggestedRoutineExercise,
  ApplyAthleteSessionAdjustmentRequest,
  ApplyAthleteSessionAdjustmentResponse,
};

const AI_ADAPTATION_TIMEOUT_MS = 120_000;

function isNotFoundError(error: unknown): boolean {
  if (axios.isAxiosError(error)) {
    return error.response?.status === 404;
  }

  if (typeof error === 'object' && error !== null) {
    const candidate = error as { status?: number; response?: { status?: number } };
    return candidate.status === 404 || candidate.response?.status === 404;
  }

  return false;
}

export const athleteAdaptationsService = {
  /**
   * Obtiene el contexto de adaptación individual del atleta: lesiones activas,
   * récords 1RM vigentes y restricciones biomecánicas con sustitutos autorizados (KAN-459 / KAN-460).
   */
  async getAdaptationContext(athleteId: string): Promise<AthleteAdaptationContextResponse> {
    try {
      const { data } = await getAthleteAdaptationContext({
        path: { athleteId },
        throwOnError: true,
      });
      return data;
    } catch (error) {
      throw new Error(extractErrorMessage(error), { cause: error });
    }
  },

  /**
   * Genera la propuesta de adaptación individual comparando la rutina base de la categoría
   * contra las restricciones del atleta y devolviendo el diff con motivo médico (KAN-461 / KAN-462 / KAN-464).
   */
  async generateAdaptation(
    athleteId: string,
    payload: GenerateAthleteAdaptationRequest,
  ): Promise<RoutineAdaptationResponse> {
    try {
      const { data } = await generateAthleteAdaptation({
        path: { athleteId },
        body: payload,
        timeout: AI_ADAPTATION_TIMEOUT_MS,
        throwOnError: true,
      });
      return data;
    } catch (error) {
      throw new Error(extractErrorMessage(error), { cause: error });
    }
  },

  /**
   * Consulta si ya existe una variante individual aprobada para una sesión, atleta y fecha (KAN-463).
   * Devuelve null únicamente ante 404 (aún no existe variante aprobada); cualquier otro error se propaga.
   */
  async getSessionAdjustment(
    sessionId: string,
    athleteId: string,
    date?: string,
  ): Promise<ApplyAthleteSessionAdjustmentResponse | null> {
    try {
      const { data } = await getAthleteSessionAdjustment({
        path: { sessionId },
        query: { athleteId, ...(date ? { date } : {}) },
        throwOnError: true,
      });
      return data;
    } catch (error) {
      if (isNotFoundError(error)) {
        return null;
      }
      throw new Error(extractErrorMessage(error), { cause: error });
    }
  },

  /**
   * Aprueba y persiste en Entrenamiento la variante individual adaptada para el atleta
   * vinculada al plan vigente sin modificar la rutina del resto de la categoría (KAN-463 / KAN-464 / KAN-465).
   */
  async applySessionAdjustment(
    sessionId: string,
    payload: ApplyAthleteSessionAdjustmentRequest,
  ): Promise<ApplyAthleteSessionAdjustmentResponse> {
    try {
      const { data } = await applyAthleteSessionAdjustment({
        path: { sessionId },
        body: payload,
        throwOnError: true,
      });
      return data;
    } catch (error) {
      throw new Error(extractErrorMessage(error), { cause: error });
    }
  },
};
