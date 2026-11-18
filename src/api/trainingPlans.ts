import {
  applyPlanTemplate,
  assignTrainingPlan,
  createTrainingPlan,
  getTrainingPlan,
  getTrainingPlanSchedule,
  listPlanAssignments,
  listPlanTemplates,
  listTrainingPlans,
  savePlanAsTemplate,
  updateTrainingPlan,
  AssignPlanResponse,
  PlanAssignmentSummary,
  SaveTrainingPlanRequest,
  ScheduledSession,
  TrainingPlanDetail,
} from './generated/entrenamiento';
import { extractErrorMessage, httpClient } from './axiosClient';
import {
  PlanListItem,
  ApplyPlanTemplatePayload,
  PlanAssignmentTarget,
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
    return plans.map((plan) => {
      const raw = plan as unknown as {
        targetMuscles?: string[];
        primaryMuscles?: string[];
        secondaryMuscles?: string[];
      };
      const primaryMuscles = raw.primaryMuscles ?? raw.targetMuscles ?? [];
      const secondaryMuscles = raw.secondaryMuscles ?? [];
      return {
        id: plan.id,
        name: plan.name,
        objective: plan.objective ?? null,
        primaryMuscles,
        secondaryMuscles,
        targetMuscles: raw.targetMuscles ?? primaryMuscles,
      };
    });
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

  async delete(id: string): Promise<void> {
    await call(async () => {
      const res = await httpClient.delete(`/api/entrenamiento/api/v1/training-plans/${id}`);
      return { data: res.data };
    });
  },

  // Sesiones que tocan en una fecha (AAAA-MM-DD) en todas las asignaciones del PF: la agenda del calendario.
  schedule(date: string): Promise<ScheduledSession[]> {
    return call(() => getTrainingPlanSchedule({ query: { date }, throwOnError: true }));
  },

  // Se asigna a una categoría o a un atleta, nunca a los dos (el back lo rechaza).
  async assign(
    planId: string,
    startDate: string,
    target: PlanAssignmentTarget,
  ): Promise<AssignPlanResponse> {
    return call(() =>
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

  // Asignaciones del PF con su inicio, fin y estado (Active / Finished) (KAN-558 / KAN-559)
  listAssignments(status?: 'Active' | 'Finished'): Promise<PlanAssignmentSummary[]> {
    return call(() =>
      listPlanAssignments({
        query: status ? { status } : undefined,
        throwOnError: true,
      }),
    );
  },

  // Eliminar o desasignar una planificación de un atleta o categoría
  async deleteAssignment(assignmentId: string): Promise<void> {
    await call(async () => {
      const res = await httpClient.delete(
        `/api/entrenamiento/api/v1/training-plans/assignments/${assignmentId}`,
      );
      return { data: res.data };
    });
  },

  // Listado oficial del SDK adaptado a PlanTemplateItem
  async listTemplates(): Promise<PlanTemplateItem[]> {
    const templates = await call(() => listPlanTemplates({ throwOnError: true }));
    return templates.map((t) => {
      const raw = t as unknown as {
        targetMuscles?: string[];
        primaryMuscles?: string[];
        secondaryMuscles?: string[];
      };
      const primaryMuscles = raw.primaryMuscles ?? raw.targetMuscles ?? [];
      const secondaryMuscles = raw.secondaryMuscles ?? [];
      return {
        id: t.id,
        name: t.name,
        objective: t.objective ?? null,
        primaryMuscles,
        secondaryMuscles,
        targetMuscles: raw.targetMuscles ?? primaryMuscles,
      };
    });
  },

  async applyTemplate(
    templateId: string,
    payload: ApplyPlanTemplatePayload,
  ): Promise<{ assignmentId: string; message: string }> {
    return call(() =>
      applyPlanTemplate({
        path: { id: templateId },
        body: {
          startDate: payload.startDate,
          categoryId: payload.categoryId ?? undefined,
          athleteId: payload.athleteId ?? undefined,
        },
        throwOnError: true,
      }),
    );
  },

  saveAsTemplate(planId: string, name: string): Promise<TrainingPlanDetail> {
    return call(() =>
      savePlanAsTemplate({
        path: { id: planId },
        body: { name },
        throwOnError: true,
      }),
    );
  },
};

export type { PlanAssignmentSummary, AssignPlanResponse };
