import {
  assignTrainingPlan,
  createTrainingPlan,
  getTrainingPlan,
  getTrainingPlanSchedule,
  listTrainingPlans,
  updateTrainingPlan,
  SaveTrainingPlanRequest,
  ScheduledSession,
  TrainingPlanDetail,
} from './generated/entrenamiento';
import { extractErrorMessage, httpClient } from './axiosClient';
import {
  PlanAssignmentTarget,
  PlanListItem,
  ApplyPlanTemplatePayload,
  PlanTemplateItem,
} from '../types/trainingPlans';

// Con throwOnError el SDK lanza el error de Axios, y extractErrorMessage puede
// leer el ProblemDetails del back (el mensaje en español) y el código HTTP.
async function call<T>(request: () => Promise<{ data: T }>): Promise<T> {
  try {
    const { data } = await request();
    return data;
  } catch (error) {
    throw new Error(extractErrorMessage(error), { cause: error });
  }
}

export const trainingPlansService = {
  async list(): Promise<PlanListItem[]> {
    const plans = await call(() => listTrainingPlans({ throwOnError: true }));
    return plans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      objective: plan.objective ?? null,
    }));
  },

  get(id: string): Promise<TrainingPlanDetail> {
    return call(() => getTrainingPlan({ path: { id }, throwOnError: true }));
  },

  create(name: string, objective: string | null): Promise<TrainingPlanDetail> {
    return call(() =>
      createTrainingPlan({ body: { name, objective, weeks: [] }, throwOnError: true }),
    );
  },

  update(id: string, body: SaveTrainingPlanRequest): Promise<TrainingPlanDetail> {
    return call(() => updateTrainingPlan({ path: { id }, body, throwOnError: true }));
  },

  // Sesiones que tocan en una fecha (AAAA-MM-DD) en todas las asignaciones del PF: la agenda del calendario.
  schedule(date: string): Promise<ScheduledSession[]> {
    return call(() => getTrainingPlanSchedule({ query: { date }, throwOnError: true }));
  },

  // Se asigna a una categoría o a un atleta, nunca a los dos (el back lo rechaza).
  async assign(planId: string, startDate: string, target: PlanAssignmentTarget): Promise<void> {
    await call(() =>
      assignTrainingPlan({
        body: {
          trainingPlanId: planId,
          startDate,
          categoryId: target.type === 'category' ? target.id : null,
          athleteId: target.type === 'athlete' ? target.id : null,
        },
        throwOnError: true,
      }),
    );
  },
  // Listado de plantillas guardadas por el PF (KAN-440)
  async listTemplates(): Promise<PlanTemplateItem[]> {
    try {
      const { data } = await httpClient.get<PlanTemplateItem[]>(
        '/entrenamiento/api/v1/training-plans/templates',
      );
      return data;
    } catch (error) {
      throw new Error(extractErrorMessage(error), { cause: error });
    }
  },

  // Aplica la plantilla clonándola y asignándola con desplazamiento de fechas (KAN-440)
  async applyTemplate(
    templateId: string,
    payload: ApplyPlanTemplatePayload,
  ): Promise<{ assignmentId: string; message: string }> {
    try {
      const { data } = await httpClient.post<{ assignmentId: string; message: string }>(
        `/entrenamiento/api/v1/training-plans/templates/${templateId}/apply`,
        payload,
      );
      return data;
    } catch (error) {
      throw new Error(extractErrorMessage(error), { cause: error });
    }
  },
};
