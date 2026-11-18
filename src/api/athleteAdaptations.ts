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

export interface AdaptationChangeWithSubstitutes extends AdaptationChange {
  availableSubstitutes?: AuthorizedSubstituteContext[] | null;
}

export interface GenerateAthleteAdaptationPayload extends GenerateAthleteAdaptationRequest {
  baseExercises?: SuggestedRoutineExercise[] | null;
}

export interface RoutineAdaptationResponseWithBase extends Omit<
  RoutineAdaptationResponse,
  'adaptationChanges'
> {
  adaptationChanges?: AdaptationChangeWithSubstitutes[];
  baseExercises?: SuggestedRoutineExercise[] | null;
}

export type AdaptationRecordContext = NonNullable<
  AthleteAdaptationContextResponse['currentRecords']
>[number];

export interface ApplyAthleteSessionAdjustmentPayload extends ApplyAthleteSessionAdjustmentRequest {
  loadReductionPercentage?: number | null;
}

export interface AthleteSessionAdjustmentResult extends ApplyAthleteSessionAdjustmentResponse {
  loadReductionPercentage?: number | null;
}

export type {
  AthleteAdaptationContextResponse,
  AuthorizedSubstituteContext,
  SuggestedRoutineExercise,
  ApplyAthleteSessionAdjustmentRequest,
  ApplyAthleteSessionAdjustmentResponse,
};

const AI_ADAPTATION_TIMEOUT_MS = 120_000;

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
    payload: GenerateAthleteAdaptationPayload,
  ): Promise<RoutineAdaptationResponseWithBase> {
    try {
      const { data } = await generateAthleteAdaptation({
        path: { athleteId },
        body: payload as GenerateAthleteAdaptationRequest,
        timeout: AI_ADAPTATION_TIMEOUT_MS,
        throwOnError: true,
      });
      return data as RoutineAdaptationResponseWithBase;
    } catch (error) {
      throw new Error(extractErrorMessage(error), { cause: error });
    }
  },

  /**
   * Consulta si ya existe una variante individual aprobada para una sesión, atleta y fecha (KAN-463).
   */
  async getSessionAdjustment(
    sessionId: string,
    athleteId: string,
    date?: string,
  ): Promise<AthleteSessionAdjustmentResult | null> {
    try {
      const { data } = await getAthleteSessionAdjustment({
        path: { sessionId },
        query: { athleteId, ...(date ? { date } : {}) },
        throwOnError: true,
      });
      return data as AthleteSessionAdjustmentResult;
    } catch {
      return null;
    }
  },

  /**
   * Aprueba y persiste en Entrenamiento la variante individual adaptada para el atleta
   * vinculada al plan vigente sin modificar la rutina del resto de la categoría (KAN-463 / KAN-464 / KAN-465).
   */
  async applySessionAdjustment(
    sessionId: string,
    payload: ApplyAthleteSessionAdjustmentPayload,
  ): Promise<AthleteSessionAdjustmentResult> {
    try {
      const { data } = await applyAthleteSessionAdjustment({
        path: { sessionId },
        body: payload as ApplyAthleteSessionAdjustmentRequest,
        throwOnError: true,
      });
      return data as AthleteSessionAdjustmentResult;
    } catch (error) {
      throw new Error(extractErrorMessage(error), { cause: error });
    }
  },
};
