import { describe, it, expect, vi, beforeEach } from 'vitest';
import { matchesApi } from '../matches';
import * as generatedApi from '../generated/estructura';

vi.mock('../generated/estructura', async () => {
  return {
    listCategoryEvents: vi.fn(),
    createCategoryEvent: vi.fn(),
    deleteCategoryEvent: vi.fn(),
    listCategorySeasonPhases: vi.fn(),
    createCategorySeasonPhase: vi.fn(),
    deleteCategorySeasonPhase: vi.fn(),
  };
});

describe('matchesApi (KAN-404)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('obtiene eventos y los mapea a objetos Match para el calendario', async () => {
    vi.mocked(generatedApi.listCategoryEvents).mockResolvedValue({
      data: [
        {
          id: 'ev-1',
          date: '2026-11-07',
          startTime: '15:30:00',
          opponent: 'Club Almagro',
          venue: 'Home',
          type: 'Official',
          notes: 'Clásico barrial',
        },
      ],
    } as never);

    const matches = await matchesApi.getCategoryMatches('cat-1');
    expect(matches).toHaveLength(1);
    expect(matches[0]).toEqual({
      id: 'ev-1',
      categoryId: 'cat-1',
      opponent: 'Club Almagro',
      matchDate: '2026-11-07T15:30:00',
      homeOrAway: 'Home',
      type: 'Official',
      notes: 'Clásico barrial',
    });
  });

  it('crea un partido nocturno a las 21:30 preservando date y startTime tal cual sin correrse al día siguiente', async () => {
    const createSpy = vi.mocked(generatedApi.createCategoryEvent).mockResolvedValue({
      data: {
        id: 'ev-night',
        date: '2026-11-07',
        startTime: '21:30:00',
        opponent: 'Club Atlético Temperley',
        venue: 'Away',
        type: 'Official',
        notes: null,
      },
    } as never);

    const result = await matchesApi.createCategoryMatch('cat-1', {
      opponent: 'Club Atlético Temperley',
      date: '2026-11-07',
      startTime: '21:30:00',
      homeOrAway: 'Away',
    });

    expect(createSpy).toHaveBeenCalledWith({
      path: { categoryId: 'cat-1' },
      body: {
        date: '2026-11-07',
        startTime: '21:30:00',
        opponent: 'Club Atlético Temperley',
        venue: 'Away',
        type: 'Official',
        notes: null,
      },
      throwOnError: true,
    });

    // Validar que no se desfasó
    expect(result.matchDate).toBe('2026-11-07T21:30:00');
    expect(result.matchDate).not.toContain('2026-11-08');
  });

  it('elimina un partido invocando el endpoint real DELETE /categories/{categoryId}/events/{id}', async () => {
    const deleteSpy = vi.mocked(generatedApi.deleteCategoryEvent).mockResolvedValue({} as never);

    await matchesApi.deleteCategoryMatch('cat-1', 'ev-123');

    expect(deleteSpy).toHaveBeenCalledWith({
      path: { categoryId: 'cat-1', id: 'ev-123' },
      throwOnError: true,
    });
  });

  it('propaga errores del backend extrayendo el mensaje adecuado', async () => {
    vi.mocked(generatedApi.createCategoryEvent).mockRejectedValue(new Error('Rival obligatorio'));

    await expect(
      matchesApi.createCategoryMatch('cat-1', {
        opponent: '',
        date: '2026-11-07',
        homeOrAway: 'Home',
      }),
    ).rejects.toThrow('Rival obligatorio');
  });
});
