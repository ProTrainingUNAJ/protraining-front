import { beforeEach, describe, expect, it, vi } from 'vitest';
import { athleteRecordsService } from '../athleteRecords';
import * as generatedApi from '../generated/entrenamiento';

vi.mock('../generated/entrenamiento', () => ({
  completeOnboarding: vi.fn(),
  getAthleteRecords: vi.fn(),
  saveRecord: vi.fn(),
}));

describe('athleteRecordsService.declareOnboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('envía las marcas y mapea los récords creados', async () => {
    vi.mocked(generatedApi.completeOnboarding).mockResolvedValueOnce({
      data: [
        {
          id: 'rec-1',
          athleteId: 'ath-1',
          exerciseId: 'ex-1',
          exerciseName: 'Sentadilla',
          weightOneRepMaxKg: 120,
          origin: 'EstimatedEpley',
          achievedAt: '2026-11-07T10:00:00Z',
          isCurrent: true,
        },
      ],
    } as never);

    const marks = [{ exerciseId: 'ex-1', weightOneRepMaxKg: 120 }];
    const result = await athleteRecordsService.declareOnboarding(marks);

    expect(generatedApi.completeOnboarding).toHaveBeenCalledWith({
      body: marks,
      throwOnError: true,
    });
    expect(result).toEqual([
      {
        id: 'rec-1',
        exerciseId: 'ex-1',
        exerciseName: 'Sentadilla',
        weightKg: 120,
        origin: 'EstimatedEpley',
        achievedAt: '2026-11-07T10:00:00Z',
      },
    ]);
  });

  it('devuelve [] cuando el back no creó ninguna marca', async () => {
    vi.mocked(generatedApi.completeOnboarding).mockResolvedValueOnce({ data: [] } as never);

    const result = await athleteRecordsService.declareOnboarding([
      { exerciseId: 'ex-1', weightOneRepMaxKg: 120 },
    ]);

    expect(result).toEqual([]);
  });

  it('propaga el mensaje del error del back', async () => {
    vi.mocked(generatedApi.completeOnboarding).mockRejectedValueOnce(
      new Error('El peso debe estar entre 1 y 500 kg.'),
    );

    await expect(
      athleteRecordsService.declareOnboarding([{ exerciseId: 'ex-1', weightOneRepMaxKg: 600 }]),
    ).rejects.toThrow('El peso debe estar entre 1 y 500 kg.');
  });
});
