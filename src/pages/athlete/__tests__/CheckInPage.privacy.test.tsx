import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CheckInPage } from '../CheckInPage';
import * as checkInHelper from '../../../components/athlete/checkin/checkInHelper';
import * as seguimientoService from '../../../api/seguimientoService';
import { structureService } from '../../../api/structureService';

const ATHLETE_ID = 'atleta-privacidad';
const INITIAL_DAY = '2026-11-22';

const state = vi.hoisted(() => ({ day: '2026-11-22' }));

vi.mock('../../../utils/argentinaDate', async () => {
  const actual = await vi.importActual<typeof import('../../../utils/argentinaDate')>(
    '../../../utils/argentinaDate',
  );
  return {
    ...actual,
    todayInArgentina: () => state.day,
  };
});

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-privacidad', email: 'atleta@protraining.com', role: 'Atleta' },
    isAuthenticated: true,
  }),
}));

vi.mock('../../../api/structureService', () => ({
  structureService: { getMe: vi.fn() },
}));

vi.mock('../../../api/seguimientoService', async () => {
  const actual = await vi.importActual('../../../api/seguimientoService');
  return {
    ...actual,
    submitCheckIn: vi.fn(),
    listCheckInInjuries: vi.fn(),
    getAthleteTodayCheckIn: vi.fn(),
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

vi.mock('../../../components/athlete/checkin/checkInHelper', async () => {
  const actual = await vi.importActual('../../../components/athlete/checkin/checkInHelper');
  return {
    ...actual,
    getTodayKey: vi.fn(() => state.day),
  };
});

describe('privacidad del check-in al cambiar de día y al editar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    state.day = INITIAL_DAY;
    window.scrollTo = vi.fn();

    vi.mocked(checkInHelper.getTodayKey).mockImplementation(() => state.day);
    vi.mocked(structureService.getMe).mockResolvedValue({
      id: 'user-privacidad',
      athleteId: ATHLETE_ID,
    } as never);
    vi.mocked(seguimientoService.listCheckInInjuries).mockResolvedValue([]);
    vi.mocked(seguimientoService.getAthleteTodayCheckIn).mockResolvedValue(null);
    vi.mocked(seguimientoService.syncPendingCheckIns).mockResolvedValue(0);
    vi.mocked(seguimientoService.countPendingCheckIns).mockResolvedValue(0);
    vi.mocked(seguimientoService.discardPendingCheckInsForDate).mockResolvedValue(0);
    localStorage.setItem('protraining_athlete_me_user-privacidad', ATHLETE_ID);
  });

  const renderPage = () =>
    render(
      <MemoryRouter>
        <CheckInPage />
      </MemoryRouter>,
    );

  it('descarta el borrador médico al detectar que empezó otro día', async () => {
    const draftKey = `protraining_checkin_draft_${ATHLETE_ID}_${INITIAL_DAY}`;
    localStorage.setItem(
      draftKey,
      JSON.stringify({ hasStarted: true, currentStep: 3, isSick: true, notes: 'Dolor' }),
    );

    renderPage();
    await screen.findByRole('button', { name: /Paso 3: Dolor y Zonas/i });

    state.day = '2026-11-23';
    fireEvent(window, new Event('focus'));

    await waitFor(() => expect(localStorage.getItem(draftKey)).toBeNull());
  });

  it('no guarda un borrador médico al editar un check-in ya enviado', async () => {
    localStorage.setItem(
      `protraining_checkin_completed_${ATHLETE_ID}_${INITIAL_DAY}`,
      JSON.stringify({ result: { trafficLight: 'Green' }, completedAt: '2026-11-22T10:00:00Z' }),
    );
    vi.mocked(seguimientoService.getAthleteTodayCheckIn).mockResolvedValue({
      sleepHours: 8,
      sleepQuality: 4,
      muscleSoreness: 2,
      fatigueLevel: 2,
      moodRate: 3,
      stressLevel: 2,
      isSick: false,
      painZones: 'isquiotibiales:6',
      hasActiveInjury: true,
      injuries: [{ injuryId: 'lesion-1', zone: 'isquiotibiales', level: 7 }],
      trafficLight: 'Red',
      trafficLightReason: 'Lesión activa reportada',
    } as never);

    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Editar respuestas' }));

    await screen.findByRole('button', { name: /Resumen final/i });
    const draftKeys = Array.from({ length: localStorage.length }, (_, index) =>
      localStorage.key(index),
    ).filter((key) => key?.startsWith('protraining_checkin_draft_'));
    expect(draftKeys).toEqual([]);
  });

  it('borra al montar los borradores y confirmaciones de días anteriores', async () => {
    const oldDraftKey = `protraining_checkin_draft_${ATHLETE_ID}_2026-11-21`;
    const oldCompletedKey = `protraining_checkin_completed_${ATHLETE_ID}_2026-11-21`;
    localStorage.setItem(
      oldDraftKey,
      JSON.stringify({ hasStarted: true, currentStep: 3, isSick: true, notes: 'Dolor' }),
    );
    localStorage.setItem(
      oldCompletedKey,
      JSON.stringify({ trafficLight: 'Red', completedAt: '2026-11-21T10:00:00Z' }),
    );

    renderPage();

    await waitFor(() => {
      expect(localStorage.getItem(oldDraftKey)).toBeNull();
      expect(localStorage.getItem(oldCompletedKey)).toBeNull();
    });
  });

  it('no abre el formulario si falla la red al recuperar las respuestas', async () => {
    localStorage.setItem(
      `protraining_checkin_completed_${ATHLETE_ID}_${INITIAL_DAY}`,
      JSON.stringify({ trafficLight: 'Green', completedAt: '2026-11-22T10:00:00Z' }),
    );
    vi.mocked(seguimientoService.getAthleteTodayCheckIn).mockRejectedValue(
      new Error('Network Error'),
    );

    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Editar respuestas' }));

    expect(await screen.findByText(/No se pudieron recuperar tus respuestas/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Editar respuestas' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Enviar Check-in Diario/i })).toBeNull();
  });

  it('no abre el formulario si el back no tiene check-in para hoy', async () => {
    localStorage.setItem(
      `protraining_checkin_completed_${ATHLETE_ID}_${INITIAL_DAY}`,
      JSON.stringify({ trafficLight: 'Green', completedAt: '2026-11-22T10:00:00Z' }),
    );

    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Editar respuestas' }));

    expect(await screen.findByText(/No hay respuestas guardadas para editar/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Editar respuestas' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Enviar Check-in Diario/i })).toBeNull();
  });

  it('muestra el check-in del back aunque no exista el indicador local', async () => {
    vi.mocked(seguimientoService.getAthleteTodayCheckIn).mockResolvedValue({
      id: 'checkin-hoy',
      athleteId: ATHLETE_ID,
      date: INITIAL_DAY,
      trafficLight: 'Green',
      trafficLightReason: null,
      sleepHours: 8,
      sleepQuality: 4,
      muscleSoreness: 1,
      fatigueLevel: 2,
      moodRate: 4,
      stressLevel: 2,
      isSick: false,
      hasActiveInjury: false,
      painZones: null,
      injuries: [],
    } as never);

    renderPage();

    expect(await screen.findByRole('button', { name: 'Editar respuestas' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Iniciar' })).toBeNull();
    expect(screen.queryByText('Pendiente de hoy')).toBeNull();
    expect(screen.getByText('Completado')).toBeTruthy();
    expect(
      JSON.parse(
        localStorage.getItem(`protraining_checkin_completed_${ATHLETE_ID}_${INITIAL_DAY}`) ?? '{}',
      ),
    ).toMatchObject({ trafficLight: 'Green', isOffline: false });
  });

  it('precarga los valores de descanso del día anterior si existen en el backend', async () => {
    vi.mocked(seguimientoService.getAthleteTodayCheckIn).mockImplementation(
      async (_id, targetDate) => {
        if (targetDate === '2026-11-21') {
          return {
            id: 'checkin-ayer',
            athleteId: ATHLETE_ID,
            date: '2026-11-21',
            trafficLight: 'Green',
            sleepHours: 7,
            sleepQuality: 4,
            fatigueLevel: 2,
            muscleSoreness: 2,
            moodRate: 4,
            stressLevel: 2,
            isSick: false,
            hasActiveInjury: false,
          } as never;
        }
        return null;
      },
    );

    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Iniciar' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Ir al siguiente paso' }));

    expect(await screen.findByText('7 horas')).toBeTruthy();
    expect(screen.getByText('buena')).toBeTruthy();
    expect(screen.getByText('fresco')).toBeTruthy();
    expect(screen.getByText('leve')).toBeTruthy();
  });

  it('usa los valores preajustados (8 horas y 5/5 en las restantes) si no existe registro del día anterior', async () => {
    vi.mocked(seguimientoService.getAthleteTodayCheckIn).mockResolvedValue(null);

    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Iniciar' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Ir al siguiente paso' }));

    expect(await screen.findByText('8 horas')).toBeTruthy();
    expect(screen.getByText('excelente')).toBeTruthy();
    expect(screen.getByText('enérgico')).toBeTruthy();
    expect(screen.getByText('sin dolor')).toBeTruthy();
    expect(screen.getAllByText('Nivel 5/5').length).toBe(3);
  });
});
