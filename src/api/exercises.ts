import { listExercises, Exercise } from './generated/entrenamiento';
import { extractErrorMessage } from './axiosClient';
import { CatalogExercise, ExercisePage } from '../types/trainingPlans';

function mapExercise(exercise: Exercise): CatalogExercise {
  return {
    id: exercise.id,
    name: exercise.name,
    muscleGroup: exercise.muscleGroup,
    equipment: exercise.equipment ?? null,
    images: exercise.images ?? [],
  };
}

export const exercisesService = {
  async search(
    search: string,
    page: number,
    pageSize: number,
    usedByPf?: boolean,
  ): Promise<ExercisePage> {
    try {
      const { data } = await listExercises({
        query: {
          search: search || undefined,
          page,
          pageSize,
          usedByPf: usedByPf || undefined,
        },
        throwOnError: true,
      });

      // El contrato pide la respuesta paginada, pero el back todavía puede devolver
      // la lista sola. Aceptamos las dos formas hasta que coincidan.
      const raw: unknown = data;
      if (Array.isArray(raw)) {
        const items = (raw as Exercise[]).map(mapExercise);
        return {
          items,
          page,
          totalPages: items.length === pageSize ? page + 1 : page,
          totalCount: items.length,
        };
      }
      return {
        items: data.items.map(mapExercise),
        page: data.page,
        totalPages: data.totalPages,
        totalCount: data.totalCount,
      };
    } catch (error) {
      throw new Error(extractErrorMessage(error), { cause: error });
    }
  },
};
