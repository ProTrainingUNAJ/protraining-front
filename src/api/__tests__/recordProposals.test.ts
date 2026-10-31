import { describe, it, expect, vi, beforeEach } from 'vitest';
import { recordProposalsService } from '../recordProposals';
import * as generatedApi from '../generated/entrenamiento';

vi.mock('../generated/entrenamiento', async () => {
  return {
    listRecordProposals: vi.fn(),
    approveRecordProposal: vi.fn(),
    discardRecordProposal: vi.fn(),
  };
});

describe('recordProposalsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('listPending calls listRecordProposals with status Pending and maps response', async () => {
    const mockProposals = [
      {
        id: 'prop-1',
        athleteId: 'ath-1',
        athleteName: 'Lucas Giménez',
        exerciseId: 'ex-1',
        exerciseName: 'Sentadilla Trasera',
        currentWeight: 100,
        proposedWeight: 107.5,
        performedWeight: 90,
        performedReps: 5,
        status: 'Pending',
        createdAt: '2026-10-30T10:00:00Z',
      },
    ];

    vi.mocked(generatedApi.listRecordProposals).mockResolvedValueOnce({
      data: mockProposals,
    } as never);

    const result = await recordProposalsService.listPending();

    expect(generatedApi.listRecordProposals).toHaveBeenCalledWith({
      query: { status: 'Pending' },
      throwOnError: true,
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: 'prop-1',
      athleteId: 'ath-1',
      athleteName: 'Lucas Giménez',
      exerciseId: 'ex-1',
      exerciseName: 'Sentadilla Trasera',
      currentWeight: 100,
      proposedWeight: 107.5,
      performedWeight: 90,
      performedReps: 5,
      status: 'Pending',
      createdAt: '2026-10-30T10:00:00Z',
    });
  });

  it('approve calls approveRecordProposal and maps updated record', async () => {
    const mockRecord = {
      id: 'rec-1',
      athleteId: 'ath-1',
      exerciseId: 'ex-1',
      exerciseName: 'Sentadilla Trasera',
      weightOneRepMaxKg: 107.5,
      origin: 'Epley',
      achievedAt: '2026-10-30T10:05:00Z',
    };

    vi.mocked(generatedApi.approveRecordProposal).mockResolvedValueOnce({
      data: mockRecord,
    } as never);

    const result = await recordProposalsService.approve('prop-1');

    expect(generatedApi.approveRecordProposal).toHaveBeenCalledWith({
      path: { id: 'prop-1' },
      throwOnError: true,
    });
    expect(result).toEqual({
      id: 'rec-1',
      exerciseId: 'ex-1',
      exerciseName: 'Sentadilla Trasera',
      weightKg: 107.5,
      origin: 'Epley',
      achievedAt: '2026-10-30T10:05:00Z',
    });
  });

  it('discard calls discardRecordProposal', async () => {
    vi.mocked(generatedApi.discardRecordProposal).mockResolvedValueOnce({} as never);

    await recordProposalsService.discard('prop-1');

    expect(generatedApi.discardRecordProposal).toHaveBeenCalledWith({
      path: { id: 'prop-1' },
      throwOnError: true,
    });
  });
});
