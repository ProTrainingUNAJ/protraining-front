import { beforeEach, describe, expect, it, vi } from 'vitest';
import { athleteTrendsService } from '../athleteTrends';
import * as seguimientoApi from '../generated/seguimiento';
import { AthleteWeeklyTrendsResponse } from '../../types/seguimiento';

vi.mock('../generated/seguimiento', async () => {
  return {
    getAthleteWeeklyTrends: vi.fn(),
  };
});

function axiosError(status: number, data?: { detail?: string }): Error {
  return Object.assign(new Error('axios error'), {
    isAxiosError: true,
    response: { status, data },
  });
}

describe('athleteTrendsService (KAN-489 / KAN-490)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('obtiene las tendencias de 4 semanas del atleta por defecto', async () => {
    const mockResponse: AthleteWeeklyTrendsResponse = {
      athleteId: 'ath-123',
      from: '2026-10-26',
      to: '2026-11-22',
      weeks: [
        {
          weekStartDate: '2026-10-26',
          weekEndDate: '2026-11-01',
          averageWellness: 4.2,
          totalLoad: 1600,
          totalMinutes: 200,
          checkInCount: 5,
          loadCount: 4,
          wellnessBreakdown: {
            sleepQuality: 4.0,
            sleepHours: 8.0,
            muscleSoreness: 4.2,
            fatigueLevel: 4.1,
            moodRate: 4.5,
            stressLevel: 4.3,
          },
        },
      ],
    };

    vi.mocked(seguimientoApi.getAthleteWeeklyTrends).mockResolvedValueOnce({
      data: mockResponse,
    } as never);

    const result = await athleteTrendsService.getAthleteTrends('ath-123');

    expect(result).toEqual(mockResponse);
    expect(seguimientoApi.getAthleteWeeklyTrends).toHaveBeenCalledWith({
      path: { athleteId: 'ath-123' },
      query: { weeks: 4 },
      throwOnError: true,
    });
  });

  it('permite consultar opciones personalizadas de semanas o fechas', async () => {
    const mockResponse: AthleteWeeklyTrendsResponse = {
      athleteId: 'ath-123',
      from: '2026-11-01',
      to: '2026-11-28',
      weeks: [],
    };

    vi.mocked(seguimientoApi.getAthleteWeeklyTrends).mockResolvedValueOnce({
      data: mockResponse,
    } as never);

    const result = await athleteTrendsService.getAthleteTrends('ath-123', {
      weeks: 8,
      from: '2026-11-01',
      to: '2026-11-28',
    });

    expect(result).toEqual(mockResponse);
    expect(seguimientoApi.getAthleteWeeklyTrends).toHaveBeenCalledWith({
      path: { athleteId: 'ath-123' },
      query: { weeks: 8, from: '2026-11-01', to: '2026-11-28' },
      throwOnError: true,
    });
  });

  it('propaga el error formateado cuando el backend devuelve 404', async () => {
    vi.mocked(seguimientoApi.getAthleteWeeklyTrends).mockRejectedValueOnce(
      axiosError(404, { detail: 'Atleta no encontrado.' }),
    );

    await expect(athleteTrendsService.getAthleteTrends('ath-999')).rejects.toThrow(
      'Atleta no encontrado.',
    );
  });
});
