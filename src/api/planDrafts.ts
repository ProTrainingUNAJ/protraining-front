import axios from 'axios';
import {
  approvePlanDraft,
  ApprovePlanDraftResponse,
  CreatePlanDraftRequest,
  createPlanDraftWithAi,
  discardPlanDraft,
  getPlanDraftById,
  PlanDraftResponse,
  updatePlanDraft,
  UpdatePlanDraftRequest,
} from './generated/asistente';
import { extractErrorMessage } from './axiosClient';

// Con Ollama la generación puede tardar entre 30 y 60 segundos: damos margen de 120 s
// por encima del timeout general de 15 s de httpClient.
const AI_GENERATION_TIMEOUT_MS = 120_000;

export function isPlanDraftCanceled(error: unknown): boolean {
  if (axios.isCancel(error)) return true;
  if (error instanceof Error) {
    if (error.name === 'CanceledError' || error.name === 'AbortError') return true;
    if (axios.isCancel(error.cause)) return true;
  }
  return false;
}

async function call<T>(request: () => Promise<{ data: T }>): Promise<T> {
  try {
    const { data } = await request();
    return data;
  } catch (error) {
    if (isPlanDraftCanceled(error)) {
      throw error;
    }
    throw new Error(extractErrorMessage(error), { cause: error });
  }
}

export const planDraftsService = {
  create(body: CreatePlanDraftRequest, signal?: AbortSignal): Promise<PlanDraftResponse> {
    return call(() =>
      createPlanDraftWithAi({
        body,
        signal,
        timeout: AI_GENERATION_TIMEOUT_MS,
        throwOnError: true,
      }),
    );
  },

  get(id: string): Promise<PlanDraftResponse> {
    return call(() => getPlanDraftById({ path: { id }, throwOnError: true }));
  },

  update(id: string, body: UpdatePlanDraftRequest): Promise<PlanDraftResponse> {
    return call(() => updatePlanDraft({ path: { id }, body, throwOnError: true }));
  },

  approve(id: string): Promise<ApprovePlanDraftResponse> {
    return call(() => approvePlanDraft({ path: { id }, throwOnError: true }));
  },

  discard(id: string): Promise<PlanDraftResponse> {
    return call(() => discardPlanDraft({ path: { id }, throwOnError: true }));
  },
};
