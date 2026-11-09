import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DailyTrafficLightWidget } from '../DailyTrafficLightWidget';
import * as checkInHelper from '../../athlete/checkin/checkInHelper';
import * as seguimientoService from '../../../api/seguimientoService';
import { structureService } from '../../../api/structureService';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

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

describe('DailyTrafficLightWidget (KAN-547)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    vi.mocked(structureService.getMe).mockResolvedValue({
      id: 'user-ath-1',
      athleteId: 'ath-1',
    } as never);
  });

  const renderComponent = () =>
    render(
      <MemoryRouter>
        <DailyTrafficLightWidget />
      </MemoryRouter>,
    );

  it('renders off/pending state when athlete has not submitted check-in today', async () => {
    vi.spyOn(checkInHelper, 'getCheckInCompleted').mockReturnValue(null);
    vi.mocked(seguimientoService.getAthleteTodayCheckIn).mockResolvedValueOnce(null);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Semáforo apagado')).toBeDefined();
    });

    expect(screen.getByText('Sin completar hoy')).toBeDefined();
    expect(
      screen.getByText(
        'Aún no registraste tu estado físico de hoy. Completá tu check-in para activar el semáforo.',
      ),
    ).toBeDefined();

    const redBulb = screen.getByTestId('traffic-bulb-red');
    const yellowBulb = screen.getByTestId('traffic-bulb-yellow');
    const greenBulb = screen.getByTestId('traffic-bulb-green');

    expect(redBulb.className).toContain('dtl-bulb--red-off');
    expect(yellowBulb.className).toContain('dtl-bulb--yellow-off');
    expect(greenBulb.className).toContain('dtl-bulb--green-off');

    const btnComplete = screen.getByRole('button', { name: /Completar Check-in de hoy/i });
    expect(btnComplete).toBeDefined();
    fireEvent.click(btnComplete);
    expect(mockNavigate).toHaveBeenCalledWith('/athlete/checkin');
  });

  it('renders Green light state when check-in is optimal', async () => {
    vi.spyOn(checkInHelper, 'getCheckInCompleted').mockReturnValue({
      result: {
        trafficLight: 'Green',
        trafficLightReason: 'Sin dolor reportado y buen descanso',
      },
      draft: {
        sleepHours: 8,
      } as never,
      completedAt: '2026-11-09T08:00:00Z',
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Semáforo Verde · Óptimo')).toBeDefined();
    });

    expect(screen.getByText('Apto para entrenar')).toBeDefined();
    expect(screen.getByText('Sin dolor reportado y buen descanso')).toBeDefined();
    expect(screen.getByText(/8h descanso/i)).toBeDefined();

    const redBulb = screen.getByTestId('traffic-bulb-red');
    const yellowBulb = screen.getByTestId('traffic-bulb-yellow');
    const greenBulb = screen.getByTestId('traffic-bulb-green');

    expect(redBulb.className).toContain('dtl-bulb--red-off');
    expect(yellowBulb.className).toContain('dtl-bulb--yellow-off');
    expect(greenBulb.className).toContain('dtl-bulb--green-on');

    const btnView = screen.getByRole('button', { name: /Ver o actualizar mi Check-in/i });
    fireEvent.click(btnView);
    expect(mockNavigate).toHaveBeenCalledWith('/athlete/checkin');
  });

  it('renders Yellow light state when check-in reports attention/fatigue', async () => {
    vi.spyOn(checkInHelper, 'getCheckInCompleted').mockReturnValue({
      result: {
        trafficLight: 'Yellow',
        trafficLightReason: 'Fatiga moderada y molestia muscular',
      },
      draft: {
        sleepHours: 6,
      } as never,
      completedAt: '2026-11-09T08:00:00Z',
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Semáforo Amarillo · Atención')).toBeDefined();
    });

    expect(screen.getByText('Atención')).toBeDefined();
    expect(screen.getByText('Fatiga moderada y molestia muscular')).toBeDefined();

    const redBulb = screen.getByTestId('traffic-bulb-red');
    const yellowBulb = screen.getByTestId('traffic-bulb-yellow');
    const greenBulb = screen.getByTestId('traffic-bulb-green');

    expect(redBulb.className).toContain('dtl-bulb--red-off');
    expect(yellowBulb.className).toContain('dtl-bulb--yellow-on');
    expect(greenBulb.className).toContain('dtl-bulb--green-off');
  });

  it('renders Red light state when check-in reports active injury or acute pain', async () => {
    vi.spyOn(checkInHelper, 'getCheckInCompleted').mockReturnValue({
      result: {
        trafficLight: 'Red',
        trafficLightReason: 'Lesión activa reportada',
      },
      draft: {
        sleepHours: 5,
      } as never,
      completedAt: '2026-11-09T08:00:00Z',
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Semáforo Rojo · Cuidado')).toBeDefined();
    });

    expect(screen.getByText('Precaución')).toBeDefined();
    expect(screen.getByText('Lesión activa reportada')).toBeDefined();

    const redBulb = screen.getByTestId('traffic-bulb-red');
    const yellowBulb = screen.getByTestId('traffic-bulb-yellow');
    const greenBulb = screen.getByTestId('traffic-bulb-green');

    expect(redBulb.className).toContain('dtl-bulb--red-on');
    expect(yellowBulb.className).toContain('dtl-bulb--yellow-off');
    expect(greenBulb.className).toContain('dtl-bulb--green-off');
  });

  it('falls back to remote backend if localStorage check-in is not present', async () => {
    vi.spyOn(checkInHelper, 'getCheckInCompleted').mockReturnValue(null);
    vi.mocked(seguimientoService.getAthleteTodayCheckIn).mockResolvedValueOnce({
      id: 'checkin-remote-1',
      athleteId: 'ath-1',
      date: '2026-11-09',
      trafficLight: 'Green',
      trafficLightReason: 'Óptimo sincronizado desde el servidor',
      sleepHours: 7.5,
      sleepQuality: 4,
      muscleSoreness: 1,
      fatigueLevel: 1,
      moodRate: 4,
      stressLevel: 1,
      isSick: false,
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Semáforo Verde · Óptimo')).toBeDefined();
    });

    expect(screen.getByText('Óptimo sincronizado desde el servidor')).toBeDefined();
  });
});
