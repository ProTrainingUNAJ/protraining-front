import { renderHook, waitFor, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAthleteTrends } from '../useAthleteTrends';
import { structureService } from '../../api/structureService';
import { athleteTrendsService } from '../../api/athleteTrends';
import type { AthleteWeeklyTrendsResponse } from '../../types/seguimiento';
import type { AthleteMe } from '../../types/structure';

vi.mock('../../api/structureService', () => ({
  structureService: {
    getMe: vi.fn(),
  },
}));

vi.mock('../../api/athleteTrends', () => ({
  athleteTrendsService: {
    getAthleteTrends: vi.fn(),
  },
}));

describe('useAthleteTrends (KAN-490)', () => {
  const mockMe: AthleteMe = {
    athleteId: 'ath-123',
    firstName: 'Lucía',
    lastName: 'Martínez',
    fullName: 'Lucía Martínez',
    active: true,
    categories: [],
  };

  const mockTrends: AthleteWeeklyTrendsResponse = {
    athleteId: 'ath-123',
    from: '2026-10-26',
    to: '2026-11-22',
    weeks: [
      {
        weekStartDate: '2026-10-26',
        weekEndDate: '2026-11-01',
        averageWellness: 4.1,
        totalLoad: 1400,
        totalMinutes: 180,
        checkInCount: 5,
        loadCount: 3,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('carga exitosamente las tendencias para el atleta autenticado', async () => {
    vi.mocked(structureService.getMe).mockResolvedValueOnce(mockMe);
    vi.mocked(athleteTrendsService.getAthleteTrends).mockResolvedValueOnce(mockTrends);

    const { result } = renderHook(() => useAthleteTrends(4));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.athleteId).toBe('ath-123');
    expect(result.current.trends).toEqual(mockTrends);
    expect(result.current.error).toBeNull();
    expect(athleteTrendsService.getAthleteTrends).toHaveBeenCalledWith('ath-123', { weeks: 4 });
  });

  it('maneja el caso de atleta sin ficha vinculada en estructura', async () => {
    vi.mocked(structureService.getMe).mockResolvedValueOnce({
      ...mockMe,
      athleteId: '',
    });

    const { result } = renderHook(() => useAthleteTrends(4));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('No encontramos tu ficha de atleta.');
    expect(result.current.trends).toBeNull();
    expect(athleteTrendsService.getAthleteTrends).not.toHaveBeenCalled();
  });

  it('maneja el error si el servicio de tendencias falla', async () => {
    vi.mocked(structureService.getMe).mockResolvedValueOnce(mockMe);
    vi.mocked(athleteTrendsService.getAthleteTrends).mockRejectedValueOnce(
      new Error('Fallo de red'),
    );

    const { result } = renderHook(() => useAthleteTrends(4));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Fallo de red');
    expect(result.current.trends).toBeNull();
  });

  it('no ejecuta pedidos si enabled es false', async () => {
    const { result } = renderHook(() => useAthleteTrends(4, false));

    expect(result.current.loading).toBe(false);
    expect(structureService.getMe).not.toHaveBeenCalled();
    expect(athleteTrendsService.getAthleteTrends).not.toHaveBeenCalled();
  });

  it('recarga los datos cuando se invoca reload()', async () => {
    vi.mocked(structureService.getMe).mockResolvedValue(mockMe);
    vi.mocked(athleteTrendsService.getAthleteTrends).mockResolvedValue(mockTrends);

    const { result } = renderHook(() => useAthleteTrends(4));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(athleteTrendsService.getAthleteTrends).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.reload();
    });

    await waitFor(() => {
      expect(athleteTrendsService.getAthleteTrends).toHaveBeenCalledTimes(2);
    });
  });
});
