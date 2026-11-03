import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exercisesService } from '../exercises';
import * as generatedApi from '../generated/entrenamiento';

vi.mock('../generated/entrenamiento', () => ({
  listExercises: vi.fn(),
}));

describe('exercisesService.getByIds', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devuelve lista vacía sin llamar al SDK cuando no hay IDs', async () => {
    const result = await exercisesService.getByIds([]);
    expect(result).toEqual([]);
    expect(generatedApi.listExercises).not.toHaveBeenCalled();
  });

  it('llama a listExercises con los IDs únicos y pageSize igual a la cantidad de IDs', async () => {
    vi.mocked(generatedApi.listExercises).mockResolvedValueOnce({
      data: {
        items: [
          {
            id: 'ex-sentadilla',
            name: 'Sentadilla con barra',
            muscleGroup: 'Piernas',
            equipment: 'Barra',
            images: [],
          },
          {
            id: 'ex-peso-muerto',
            name: 'Peso muerto rumano',
            muscleGroup: 'Piernas',
            equipment: 'Barra',
            images: [],
          },
        ],
        page: 1,
        pageSize: 2,
        totalCount: 2,
        totalPages: 1,
      },
    } as never);

    const result = await exercisesService.getByIds([
      'ex-sentadilla',
      'ex-peso-muerto',
      'ex-sentadilla',
    ]);

    expect(generatedApi.listExercises).toHaveBeenCalledWith({
      query: {
        ids: ['ex-sentadilla', 'ex-peso-muerto'],
        pageSize: 2,
      },
      throwOnError: true,
    });
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Sentadilla con barra');
    expect(result[1].name).toBe('Peso muerto rumano');
  });
});
