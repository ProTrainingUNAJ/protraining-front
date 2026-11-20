import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { DailyTrafficLightWidget } from '../DailyTrafficLightWidget';
import * as checkInHelper from '../../athlete/checkin/checkInHelper';
import * as seguimientoService from '../../../api/seguimientoService';
import { structureService } from '../../../api/structureService';

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-ath-1', email: 'atleta@protraining.com', role: 'Atleta' },
    isAuthenticated: true,
  }),
}));

vi.mock('../../../api/structureService', () => ({
  structureService: {
    getMe: vi.fn(),
  },
}));

vi.mock('../../../api/seguimientoService', async () => {
  const actual = await vi.importActual('../../../api/seguimientoService');
  return {
    ...actual,
    getAthleteTodayCheckIn: vi.fn(),
  };
});

describe('DailyTrafficLightWidget navigation to the athlete check-in', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    vi.mocked(structureService.getMe).mockResolvedValue({
      id: 'user-ath-1',
      athleteId: 'ath-1',
    } as never);
  });

  it('opens the check-in screen from the pending state', async () => {
    vi.spyOn(checkInHelper, 'getCheckInCompleted').mockReturnValue(null);
    vi.mocked(seguimientoService.getAthleteTodayCheckIn).mockResolvedValue(null);

    render(
      <MemoryRouter initialEntries={['/athlete']}>
        <Routes>
          <Route path="/athlete" element={<DailyTrafficLightWidget />} />
          <Route path="/athlete/check-in" element={<div data-testid="check-in-page" />} />
          <Route path="*" element={<div data-testid="not-found" />} />
        </Routes>
      </MemoryRouter>,
    );

    const btnComplete = await screen.findByRole('button', {
      name: /Completar Check-in de hoy/i,
    });
    fireEvent.click(btnComplete);

    await waitFor(() => {
      expect(screen.getByTestId('check-in-page')).toBeDefined();
    });
    expect(screen.queryByTestId('not-found')).toBeNull();
  });

  it('opens the check-in screen from the completed state', async () => {
    vi.spyOn(checkInHelper, 'getCheckInCompleted').mockReturnValue({
      result: {
        trafficLight: 'Red',
        trafficLightReason: 'Lesión activa reportada',
      },
      completedAt: '2026-11-09T08:00:00Z',
    });

    render(
      <MemoryRouter initialEntries={['/athlete']}>
        <Routes>
          <Route path="/athlete" element={<DailyTrafficLightWidget />} />
          <Route path="/athlete/check-in" element={<div data-testid="check-in-page" />} />
          <Route path="*" element={<div data-testid="not-found" />} />
        </Routes>
      </MemoryRouter>,
    );

    const btnView = await screen.findByRole('button', {
      name: /Ver o actualizar mi Check-in/i,
    });
    fireEvent.click(btnView);

    await waitFor(() => {
      expect(screen.getByTestId('check-in-page')).toBeDefined();
    });
    expect(screen.queryByTestId('not-found')).toBeNull();
  });
});
