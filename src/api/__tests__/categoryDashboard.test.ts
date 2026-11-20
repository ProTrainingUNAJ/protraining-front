import { beforeEach, describe, expect, it, vi } from 'vitest';
import { categoryDashboardService } from '../categoryDashboard';
import * as seguimientoApi from '../generated/seguimiento';

vi.mock('../generated/seguimiento', () => ({
  getCategoryDashboardSummary: vi.fn(),
}));

function axiosError(status: number, data?: { detail?: string }): Error {
  return Object.assign(new Error('axios error'), {
    isAxiosError: true,
    response: { status, data },
  });
}

describe('categoryDashboardService (KAN-504)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('pide el resumen con la categoría y el rango del período', async () => {
    const summary = {
      categoryId: 'cat-1',
      from: '2026-10-20',
      to: '2026-11-20',
      athleteCount: 12,
      evaluatedDays: 4,
      attendance: {
        presentDays: 40,
        absentDays: 5,
        withoutRecordDays: 3,
        evaluatedAthleteDays: 48,
        attendancePercentage: 83.3,
      },
      injuries: {
        activeCount: 1,
        inRecoveryCount: 2,
        clearedInPeriodCount: 3,
        athletesAffected: 4,
      },
      load: {
        totalLoad: 4200,
        totalMinutes: 980,
        recordsCount: 37,
        weeks: [],
      },
    };

    vi.mocked(seguimientoApi.getCategoryDashboardSummary).mockResolvedValueOnce({
      data: summary,
    } as never);

    const result = await categoryDashboardService.getByCategory('cat-1', {
      from: '2026-10-20',
      to: '2026-11-20',
    });

    expect(seguimientoApi.getCategoryDashboardSummary).toHaveBeenCalledWith({
      path: { categoryId: 'cat-1' },
      query: { from: '2026-10-20', to: '2026-11-20' },
      throwOnError: true,
    });
    expect(result).toEqual(summary);
  });

  it('traduce el error del backend a un mensaje en español', async () => {
    vi.mocked(seguimientoApi.getCategoryDashboardSummary).mockRejectedValueOnce(
      axiosError(404, { detail: 'La categoría solicitada no existe.' }),
    );

    await expect(
      categoryDashboardService.getByCategory('cat-404', {
        from: '2026-10-20',
        to: '2026-11-20',
      }),
    ).rejects.toThrow('La categoría solicitada no existe.');
  });
});
