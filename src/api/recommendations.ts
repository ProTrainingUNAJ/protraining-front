import {
  listRecommendations as listRecommendationsSdk,
  getRecommendationById as getRecommendationByIdSdk,
  generateCategoryRecommendations as generateCategoryRecommendationsSdk,
  generateAthleteRecommendations as generateAthleteRecommendationsSdk,
  updateRecommendation as updateRecommendationSdk,
  approveRecommendation as approveRecommendationSdk,
  discardRecommendation as discardRecommendationSdk,
  listMyRecommendations as listMyRecommendationsSdk,
  type AthleteRecommendation,
  type MyRecommendation,
  type ProfileMetricComparison,
  type WeeklyTrendsSummary,
  type UpdateRecommendationRequest,
  type ApproveRecommendationRequest,
  type RunCategoryRecommendationEngineResponse,
  type RunAthleteRecommendationEngineResponse,
} from './generated/asistente';
import { extractErrorMessage } from './axiosClient';

export type {
  AthleteRecommendation,
  MyRecommendation,
  ProfileMetricComparison,
  WeeklyTrendsSummary,
  UpdateRecommendationRequest,
  ApproveRecommendationRequest,
  RunCategoryRecommendationEngineResponse,
  RunAthleteRecommendationEngineResponse,
};

export type RecommendationStatusFilter = 'Pending' | 'Approved' | 'Discarded';

// La ejecución del motor de recomendaciones invoca al agente/LLM (puede demorar más de 15 s)
const AI_ENGINE_TIMEOUT_MS = 120_000;

export const recommendationsService = {
  /**
   * Lista las recomendaciones del preparador físico filtradas opcionalmente por atleta, categoría o estado.
   */
  async listRecommendations(params?: {
    athleteId?: string;
    categoryId?: string;
    status?: RecommendationStatusFilter;
  }): Promise<AthleteRecommendation[]> {
    try {
      const { data } = await listRecommendationsSdk({
        query: {
          athleteId: params?.athleteId || undefined,
          categoryId: params?.categoryId || undefined,
          status: params?.status || undefined,
        },
        throwOnError: true,
      });
      return data ?? [];
    } catch (error) {
      throw new Error(extractErrorMessage(error), { cause: error });
    }
  },

  /**
   * Obtiene el detalle de una recomendación por su identificador (rol PF).
   */
  async getRecommendationById(id: string): Promise<AthleteRecommendation> {
    try {
      const { data } = await getRecommendationByIdSdk({
        path: { id },
        throwOnError: true,
      });
      return data;
    } catch (error) {
      throw new Error(extractErrorMessage(error), { cause: error });
    }
  },

  /**
   * Ejecuta el motor de recomendaciones sobre toda una categoría (KAN-491).
   */
  async generateForCategory(
    categoryId: string,
    weeks = 4,
  ): Promise<RunCategoryRecommendationEngineResponse> {
    try {
      const { data } = await generateCategoryRecommendationsSdk({
        path: { categoryId },
        body: { weeks },
        timeout: AI_ENGINE_TIMEOUT_MS,
        throwOnError: true,
      });
      return data;
    } catch (error) {
      throw new Error(extractErrorMessage(error), { cause: error });
    }
  },

  /**
   * Ejecuta el motor de recomendaciones sobre un atleta puntual (KAN-491).
   */
  async generateForAthlete(
    athleteId: string,
    options?: { categoryId?: string | null; weeks?: number | null },
  ): Promise<RunAthleteRecommendationEngineResponse> {
    try {
      const { data } = await generateAthleteRecommendationsSdk({
        path: { athleteId },
        body: {
          categoryId: options?.categoryId ?? null,
          weeks: options?.weeks ?? 4,
        },
        timeout: AI_ENGINE_TIMEOUT_MS,
        throwOnError: true,
      });
      return data;
    } catch (error) {
      throw new Error(extractErrorMessage(error), { cause: error });
    }
  },

  /**
   * Edita el título y texto de una recomendación pendiente manteniendo el motivo inmutable (KAN-492).
   */
  async updateRecommendation(
    id: string,
    request: UpdateRecommendationRequest,
  ): Promise<AthleteRecommendation> {
    try {
      const { data } = await updateRecommendationSdk({
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
   * Aprueba una recomendación pendiente (con edición opcional) y la habilita para el atleta (KAN-492).
   */
  async approveRecommendation(
    id: string,
    request?: ApproveRecommendationRequest,
  ): Promise<AthleteRecommendation> {
    try {
      const { data } = await approveRecommendationSdk({
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
   * Descarta una recomendación pendiente para archivarla sin mostrarla al atleta (KAN-492).
   */
  async discardRecommendation(id: string): Promise<AthleteRecommendation> {
    try {
      const { data } = await discardRecommendationSdk({
        path: { id },
        throwOnError: true,
      });
      return data;
    } catch (error) {
      throw new Error(extractErrorMessage(error), { cause: error });
    }
  },

  /**
   * Obtiene las recomendaciones aprobadas por el PF para el atleta autenticado (KAN-492).
   */
  async listMyRecommendations(): Promise<MyRecommendation[]> {
    try {
      const { data } = await listMyRecommendationsSdk({
        throwOnError: true,
      });
      return data ?? [];
    } catch (error) {
      throw new Error(extractErrorMessage(error), { cause: error });
    }
  },
};
