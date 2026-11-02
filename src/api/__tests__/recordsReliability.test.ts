import { describe, it, expect, vi, beforeEach } from 'vitest';
import { recordsReliabilityService } from '../recordsReliability';
import * as generatedApi from '../generated/entrenamiento';

vi.mock('../generated/entrenamiento', async () => {
  return {
    getRecordsReliability: vi.fn(),
  };
});

describe('recordsReliabilityService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getByCategory calls getRecordsReliability with categoryId and maps response', async () => {
    const mockSummary = {
      categoryId: 'cat-1',
      totalAthletes: 2,
      groups: [
        {
          group: 'Tested',
          count: 1,
          percentage: 50,
          athletes: [{ athleteId: 'a1', name: 'Juan' }],
        },
        { group: 'Reported', count: 0, percentage: 0, athletes: [] },
        {
          group: 'Estimated',
          count: 1,
          percentage: 50,
          athletes: [{ athleteId: 'a2', name: 'Pedro' }],
        },
        { group: 'NoData', count: 0, percentage: 0, athletes: [] },
      ],
    };

    vi.mocked(generatedApi.getRecordsReliability).mockResolvedValueOnce({
      data: mockSummary,
    } as never);

    const result = await recordsReliabilityService.getByCategory('cat-1');

    expect(generatedApi.getRecordsReliability).toHaveBeenCalledWith({
      query: { categoryId: 'cat-1', exerciseId: undefined },
      throwOnError: true,
    });
    expect(result).toEqual(mockSummary);
  });

  it('getByCategory passes exerciseId when provided', async () => {
    vi.mocked(generatedApi.getRecordsReliability).mockResolvedValueOnce({
      data: { categoryId: 'cat-1', totalAthletes: 0, groups: [] },
    } as never);

    await recordsReliabilityService.getByCategory('cat-1', 'ex-1');

    expect(generatedApi.getRecordsReliability).toHaveBeenCalledWith({
      query: { categoryId: 'cat-1', exerciseId: 'ex-1' },
      throwOnError: true,
    });
  });
});
