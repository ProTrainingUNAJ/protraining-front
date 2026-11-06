import { beforeEach, describe, expect, it, vi } from 'vitest';
import { athleteEvolutionService } from '../athleteEvolution';
import * as seguimientoApi from '../generated/seguimiento';
import { AthleteEvolutionResponse } from '../../types/seguimiento';

vi.mock('../generated/seguimiento', async () => {
  return {
    getAthleteEvolution: vi.fn(),
  };
});

function axiosError(status: number, data?: { detail?: string }): Error {
  return Object.assign(new Error('axios error'), {
    isAxiosError: true,
    response: { status, data },
  });
}

describe('athleteEvolutionService (KAN-434 / KAN-435)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('obtiene la evolución completa del atleta cuando todos los servicios responden correctamente', async () => {
    const mockResponse: AthleteEvolutionResponse = {
      athleteId: 'ath-1',
      from: '2026-08-01',
      to: '2026-11-01',
      strength: [
        {
          exerciseId: 'ex-1',
          exerciseName: 'Sentadilla',
          unit: 'kg',
          points: [{ date: '2026-09-01', value: 100, label: '100 kg' }],
        },
      ],
      fitnessTests: [
        {
          catalogTestId: 'test-cmj',
          testName: 'Salto CMJ',
          motorCapacity: 'Power',
          unit: 'cm',
          points: [{ date: '2026-09-05', value: 42.5, label: '42.5 cm' }],
        },
      ],
      wellness: {
        fatiguePoints: [{ date: '2026-09-01', value: 3, label: 'Nivel 3' }],
        dailyPoints: [],
      },
      strengthUnavailable: false,
    };

    vi.mocked(seguimientoApi.getAthleteEvolution).mockResolvedValueOnce({
      data: mockResponse,
    } as never);

    const result = await athleteEvolutionService.getEvolution('ath-1', { months: 3 });

    expect(result).toEqual(mockResponse);
    expect(result.strengthUnavailable).toBe(false);
    expect(result.strength).toHaveLength(1);
    expect(seguimientoApi.getAthleteEvolution).toHaveBeenCalledWith({
      path: { athleteId: 'ath-1' },
      query: { months: 3, from: undefined, to: undefined },
      throwOnError: true,
    });
  });

  it('devuelve modo degradado con strengthUnavailable: true cuando Entrenamiento no responde', async () => {
    const degradedResponse: AthleteEvolutionResponse = {
      athleteId: 'ath-1',
      from: '2026-08-01',
      to: '2026-11-01',
      strength: [],
      fitnessTests: [
        {
          catalogTestId: 'test-cmj',
          testName: 'Salto CMJ',
          motorCapacity: 'Power',
          unit: 'cm',
          points: [{ date: '2026-09-05', value: 42.5, label: '42.5 cm' }],
        },
      ],
      wellness: {
        fatiguePoints: [{ date: '2026-09-01', value: 3, label: 'Nivel 3' }],
        dailyPoints: [],
      },
      strengthUnavailable: true,
    };

    vi.mocked(seguimientoApi.getAthleteEvolution).mockResolvedValueOnce({
      data: degradedResponse,
    } as never);

    const result = await athleteEvolutionService.getEvolution('ath-1');

    expect(result.strengthUnavailable).toBe(true);
    expect(result.strength).toHaveLength(0);
    expect(result.fitnessTests).toHaveLength(1);
    expect(result.wellness.fatiguePoints).toHaveLength(1);
  });

  it('maneja 404 cuando el atleta no pertenece al PF logueado extrayendo el mensaje ProblemDetails', async () => {
    const error404 = axiosError(404, { detail: 'Atleta no encontrado' });

    vi.mocked(seguimientoApi.getAthleteEvolution).mockRejectedValueOnce(error404);

    await expect(athleteEvolutionService.getEvolution('ath-other')).rejects.toThrow(
      'Atleta no encontrado',
    );
  });
});
