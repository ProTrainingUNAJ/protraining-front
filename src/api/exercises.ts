import { listExercises, updateExerciseVideo, Exercise } from './generated/entrenamiento';
import { extractErrorMessage } from './axiosClient';
import { CatalogExercise, ExercisePage } from '../types/trainingPlans';

function mapExercise(exercise: Exercise): CatalogExercise {
  return {
    id: exercise.id,
    name: exercise.name,
    muscleGroup: exercise.muscleGroup,
    equipment: exercise.equipment ?? null,
    images: exercise.images ?? [],
    exerciseType: exercise.exerciseType,
    variantLabel: exercise.variantLabel ?? null,
    variants: (exercise.variants ?? []).map(mapExercise),
  };
}

export const exercisesService = {
  async search(
    search: string,
    page: number,
    pageSize: number,
    usedByPf?: boolean,
    groupVariants?: boolean,
    muscleGroup?: string,
    muscle?: string,
    exerciseType?: string,
  ): Promise<ExercisePage> {
    try {
      const { data } = await listExercises({
        query: {
          search: search || undefined,
          page,
          pageSize,
          usedByPf: usedByPf || undefined,
          groupVariants: groupVariants || undefined,
          muscleGroup: muscleGroup && muscleGroup !== 'Todos' ? muscleGroup : undefined,
          muscle: muscle ? muscle.toLowerCase() : undefined,
          exerciseType:
            exerciseType && exerciseType !== 'Todos'
              ? (exerciseType as Exercise['exerciseType'])
              : undefined,
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

  async getByIds(ids: string[]): Promise<CatalogExercise[]> {
    const uniqueIds = Array.from(new Set(ids.filter((id) => id.trim().length > 0)));
    if (uniqueIds.length === 0) {
      return [];
    }

    try {
      const { data } = await listExercises({
        query: {
          ids: uniqueIds,
          pageSize: uniqueIds.length,
        },
        throwOnError: true,
      });

      const raw: unknown = data;
      if (Array.isArray(raw)) {
        return (raw as Exercise[]).map(mapExercise);
      }
      return (data.items ?? []).map(mapExercise);
    } catch (error) {
      throw new Error(extractErrorMessage(error), { cause: error });
    }
  },

  async updateVideoUrl(id: string, videoUrl: string | null): Promise<void> {
    try {
      await updateExerciseVideo({
        path: { id },
        body: {
          videoUrl: videoUrl ? videoUrl.trim() : null,
        },
        throwOnError: true,
      });
    } catch (error) {
      throw new Error(extractErrorMessage(error), { cause: error });
    }
  },
};
