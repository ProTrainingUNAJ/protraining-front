import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CheckInPage } from '../CheckInPage';
import * as checkInHelper from '../../../components/athlete/checkin/checkInHelper';
import * as seguimientoService from '../../../api/seguimientoService';
import { structureService } from '../../../api/structureService';

const ATHLETE_ID = 'lucas-athlete-id';
const INJURY_ID = 'lucas-injury-id';

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-lucas', email: 'atleta@protraining.com', role: 'Atleta' },
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
    submitCheckIn: vi.fn(),
    listCheckInInjuries: vi.fn(),
    syncPendingCheckIns: vi.fn(),
    countPendingCheckIns: vi.fn(),
    discardPendingCheckInsForDate: vi.fn(),
  };
});

vi.mock('../../../api/pushNotifications', () => ({
  isPushSupported: () => false,
  isUserSubscribed: () => Promise.resolve(false),
  subscribeUserToPush: vi.fn(),
}));

describe('CheckInPage with active injury scores', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    window.scrollTo = vi.fn();

    vi.mocked(structureService.getMe).mockResolvedValue({
      id: 'user-lucas',
      athleteId: ATHLETE_ID,
    } as never);

    vi.mocked(seguimientoService.listCheckInInjuries).mockResolvedValue([
      {
        id: INJURY_ID,
        athleteId: ATHLETE_ID,
        zone: 'isquiotibiales',
        description: 'Distensión grado 1 en un sprint del entrenamiento.',
        injuryDate: '2026-11-10',
        estimatedReturnDate: '2026-11-26',
        status: 'Active',
        clearedAt: null,
        createdAt: '2026-11-10T10:00:00Z',
      },
    ]);

    vi.mocked(seguimientoService.submitCheckIn).mockResolvedValue({
      message: 'Check-in registrado',
      trafficLight: 'Red',
      trafficLightReason: 'Lesión activa reportada',
      isOffline: false,
    });

    vi.mocked(seguimientoService.syncPendingCheckIns).mockResolvedValue(0);
    vi.mocked(seguimientoService.countPendingCheckIns).mockResolvedValue(0);
    vi.mocked(seguimientoService.discardPendingCheckInsForDate).mockResolvedValue(0);

    localStorage.setItem(`protraining_athlete_me_user-lucas`, ATHLETE_ID);
    checkInHelper.saveCheckInCompleted(ATHLETE_ID, {
      result: {
        message: 'Check-in registrado',
        trafficLight: 'Red',
        trafficLightReason: 'Lesión activa reportada',
      },
      draft: {
        hasStarted: true,
        currentStep: 4,
        maxReachedStep: 4,
        sleepHours: 8,
        sleepQuality: 3,
        fatigueLevel: 3,
        muscleSoreness: 3,
        moodRate: 3,
        stressLevel: 2,
        isSick: false,
        hasActiveInjury: true,
        healthQuestionsAnswered: true,
        musclePains: { isquiotibiales: 6 },
        injuryScores: { [INJURY_ID]: 4 },
        notes: '',
      },
      completedAt: '2026-11-16T08:00:00Z',
    });
  });

  const renderPage = () =>
    render(
      <MemoryRouter>
        <CheckInPage />
      </MemoryRouter>,
    );

  it('keeps the injury score when reopening and updating the check-in', async () => {
    renderPage();

    const editButton = await screen.findByRole('button', { name: /Editar respuestas/i });
    fireEvent.click(editButton);

    fireEvent.click(await screen.findByRole('button', { name: /Paso 3: Dolor y Zonas/i }));

    await screen.findByText(/isquiotibiales — Distensión grado 1/i);

    fireEvent.click(screen.getByRole('button', { name: /Resumen final/i }));

    const submitButton = await screen.findByRole('button', { name: /Enviar Check-in Diario/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(seguimientoService.submitCheckIn).toHaveBeenCalled();
    });

    const [athleteId, payload] = vi.mocked(seguimientoService.submitCheckIn).mock.calls[0];
    expect(athleteId).toBe(ATHLETE_ID);
    expect(payload.injuries).toEqual([{ injuryId: INJURY_ID, level: 4 }]);
  });
});
