import { describe, it, expect, vi, beforeEach } from 'vitest';
import { matchService } from '../matchService';
import { matchesApi } from '../../api/matches';

vi.mock('../../api/matches', () => ({
  matchesApi: {
    getCategoryMatches: vi.fn(),
    createCategoryMatch: vi.fn(),
    deleteCategoryMatch: vi.fn(),
  },
}));

describe('matchService (KAN-404)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('crea un partido enviándolo a la API de Estructura y notifica a los suscriptores', async () => {
    const subscriber = vi.fn();
    const unsubscribe = matchService.subscribe(subscriber);

    const categoryId = 'cat-100';
    const matchData = {
      opponent: 'Club Atlético Temperley',
      date: '2026-11-07',
      startTime: '21:30:00',
      matchDate: '2026-11-07T21:30:00',
      homeOrAway: 'Home' as const,
      notes: 'Fecha oficial',
    };

    const mockCreated = {
      id: 'match-real-123',
      categoryId,
      opponent: 'Club Atlético Temperley',
      matchDate: '2026-11-07T21:30:00',
      homeOrAway: 'Home' as const,
      notes: 'Fecha oficial',
    };

    vi.mocked(matchesApi.createCategoryMatch).mockResolvedValue(mockCreated);

    const created = await matchService.createMatch(categoryId, matchData);

    expect(matchesApi.createCategoryMatch).toHaveBeenCalledWith(categoryId, matchData);
    expect(created).toEqual(mockCreated);
    expect(subscriber).toHaveBeenCalledTimes(1);

    unsubscribe();
  });

  it('propaga el error si la API de Estructura falla al crear el partido (sin persistencia ficticia)', async () => {
    vi.mocked(matchesApi.createCategoryMatch).mockRejectedValue(
      new Error('Error de validación del servidor: fecha superpuesta'),
    );

    await expect(
      matchService.createMatch('cat-100', {
        opponent: 'Club Atlético Chacarita',
        date: '2026-11-07',
        startTime: '15:30:00',
        homeOrAway: 'Away',
      }),
    ).rejects.toThrow('Error de validación del servidor: fecha superpuesta');
  });

  it('valida que el nombre del rival sea obligatorio', async () => {
    await expect(
      matchService.createMatch('cat-100', {
        opponent: '   ',
        date: '2026-11-07',
        homeOrAway: 'Home',
      }),
    ).rejects.toThrow('El nombre del rival u oponente es obligatorio.');
  });

  it('valida que la fecha del partido sea obligatoria', async () => {
    await expect(
      matchService.createMatch('cat-100', {
        opponent: 'Club Almagro',
        homeOrAway: 'Home',
      }),
    ).rejects.toThrow('La fecha y hora del partido son obligatorias.');
  });

  it('obtiene partidos de varias categorías consultando la API en paralelo', async () => {
    vi.mocked(matchesApi.getCategoryMatches).mockImplementation((catId) => {
      if (catId === 'cat-1') {
        return Promise.resolve([
          {
            id: 'm1',
            categoryId: 'cat-1',
            opponent: 'Rival 1',
            matchDate: '2026-11-01T15:00:00',
            homeOrAway: 'Home',
          },
        ]);
      }
      if (catId === 'cat-2') {
        return Promise.resolve([
          {
            id: 'm2',
            categoryId: 'cat-2',
            opponent: 'Rival 2',
            matchDate: '2026-11-08T17:00:00',
            homeOrAway: 'Away',
          },
        ]);
      }
      return Promise.resolve([]);
    });

    const matches = await matchService.getMatches(['cat-1', 'cat-2']);
    expect(matches).toHaveLength(2);
    expect(matchesApi.getCategoryMatches).toHaveBeenCalledTimes(2);
  });

  it('retorna arreglo vacío si la lista de categorías está vacía sin consultar la API', async () => {
    const matches = await matchService.getMatches([]);
    expect(matches).toEqual([]);
    expect(matchesApi.getCategoryMatches).not.toHaveBeenCalled();
  });

  it('elimina un partido usando la API de borrado lógico real y notifica a los suscriptores', async () => {
    const subscriber = vi.fn();
    const unsubscribe = matchService.subscribe(subscriber);

    vi.mocked(matchesApi.deleteCategoryMatch).mockResolvedValue(undefined);

    await matchService.deleteMatch('cat-1', 'event-456');

    expect(matchesApi.deleteCategoryMatch).toHaveBeenCalledWith('cat-1', 'event-456');
    expect(subscriber).toHaveBeenCalledTimes(1);

    unsubscribe();
  });
});
