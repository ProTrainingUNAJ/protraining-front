import {
  assignTrainingPlan,
  createTrainingPlan,
  getTrainingPlan,
  listTrainingPlans,
  updateTrainingPlan,
  SaveTrainingPlanRequest,
  TrainingPlanDetail,
} from './generated/entrenamiento';
import { extractErrorMessage } from './axiosClient';
import { PlanAssignmentTarget, PlanListItem } from '../types/trainingPlans';

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
};
