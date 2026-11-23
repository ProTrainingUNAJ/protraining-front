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
    // KAN-593: el borrador es el único dato médico permitido en el dispositivo y
    // se descarta apenas se envía. El registro de completado no guarda respuestas.
    checkInHelper.saveCheckInDraft(ATHLETE_ID, {
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
    });
  });

  const renderPage = () =>
    render(
      <MemoryRouter>
        <CheckInPage />
      </MemoryRouter>,
    );

  it('keeps the injury score when reopening an unsent check-in and resubmits it', async () => {
    renderPage();

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
    // la lesión clínica viaja en painZones aunque el atleta no haya pintado la silueta.
    expect(payload.painZones).toContain('isquiotibiales:6');

    expect(checkInHelper.getCheckInDraft(ATHLETE_ID)).toBeNull();
    const completedKeys = Array.from({ length: localStorage.length }, (_, index) =>
      localStorage.key(index),
    ).filter((key): key is string =>
      Boolean(key?.startsWith(`protraining_checkin_completed_${ATHLETE_ID}_`)),
    );
    expect(completedKeys).toHaveLength(1);
    const stored = localStorage.getItem(completedKeys[0]) ?? '';
    expect(stored).toContain('trafficLight');
    expect(stored).not.toContain('injuryScores');
    expect(stored).not.toContain('isquiotibiales');
    expect(stored).not.toContain('notes');
  });

  it('discards legacy completed records that kept the medical draft', async () => {
    const legacyKey = `protraining_checkin_completed_${ATHLETE_ID}_2026-11-01`;
    localStorage.setItem(
      legacyKey,
      JSON.stringify({
        result: { trafficLight: 'Red' },
        draft: { notes: 'Dolor persistente' },
        completedAt: '2026-11-01T08:00:00Z',
      }),
    );

    renderPage();

    await waitFor(() => {
      expect(localStorage.getItem(legacyKey)).toBeNull();
    });
  });

  // la ficha clínica manda aunque el borrador dijera "sin lesión".
  it('forces hasActiveInjury from the clinical record and keeps an explicit score of 0', async () => {
    checkInHelper.saveCheckInDraft(ATHLETE_ID, {
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
      hasActiveInjury: false,
      healthQuestionsAnswered: true,
      musclePains: {},
      injuryScores: { [INJURY_ID]: 0 },
      notes: '',
    });

    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: /Paso 3: Dolor y Zonas/i }));
    expect((await screen.findAllByText(/Lesión activa/i)).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /Resumen final/i }));
    expect(await screen.findByText(/Lesión activa reportada/i)).toBeDefined();
    expect((await screen.findAllByText(/isquiotibiales/i)).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /Enviar Check-in Diario/i }));

    await waitFor(() => {
      expect(seguimientoService.submitCheckIn).toHaveBeenCalled();
    });
    const [, payload] = vi.mocked(seguimientoService.submitCheckIn).mock.calls[0];
    expect(payload.hasActiveInjury).toBe(true);
    expect(payload.injuries).toEqual([{ injuryId: INJURY_ID, level: 0 }]);
  });

  // la lesión se ve antes de los carteles y no se inventa un puntaje al confirmar.
  it('shows the clinical injury while blocked and requires an explicit score', async () => {
    checkInHelper.saveCheckInDraft(ATHLETE_ID, {
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
      hasActiveInjury: false,
      healthQuestionsAnswered: false,
      musclePains: {},
      injuryScores: {},
      notes: '',
    });

    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: /Paso 3: Dolor y Zonas/i }));
    expect(screen.getByTitle('Lesión activa registrada en tu ficha clínica')).toBeDefined();

    fireEvent.click(await screen.findByRole('button', { name: 'No' }));
    // Responder "No" a la lesión no puede negar lo que dice la ficha clínica.
    fireEvent.click(await screen.findByRole('button', { name: 'No' }));

    expect(await screen.findByText(/Deslizá la barra para puntuar esta lesión/i)).toBeDefined();
    const nextButton = screen.getByRole('button', { name: /Ir al siguiente paso/i });
    expect(nextButton.hasAttribute('disabled')).toBe(true);
    expect(nextButton.getAttribute('title')).toMatch(/puntuar el dolor/i);
    expect(seguimientoService.submitCheckIn).not.toHaveBeenCalled();
  });

  // las lesiones llegan después del mount: con el draft ya desbloqueado ningún cartel
  // vuelve a abrir el modal, así que debe abrirse automáticamente al cargar la ficha.
  it('opens the 0-10 modal when active injuries arrive after an unlocked draft', async () => {
    checkInHelper.saveCheckInDraft(ATHLETE_ID, {
      hasStarted: true,
      currentStep: 3,
      maxReachedStep: 3,
      sleepHours: 8,
      sleepQuality: 3,
      fatigueLevel: 3,
      muscleSoreness: 3,
      moodRate: 3,
      stressLevel: 2,
      isSick: false,
      hasActiveInjury: true,
      healthQuestionsAnswered: true,
      musclePains: {},
      injuryScores: {},
      notes: '',
    });

    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: /Paso 3: Dolor y Zonas/i }));

    expect(
      await screen.findByRole('group', { name: /Nivel de dolor en Isquiotibiales/i }),
    ).toBeDefined();
    expect(await screen.findByText(/Deslizá la barra para puntuar esta lesión/i)).toBeDefined();
  });

  // KAN-593: al editar después de recargar no hay borrador; las respuestas deben
  // volver desde la respuesta del submit (incluido el dolor 0-10 de la lesión).
  it('restores the submitted responses when editing a completed check-in', async () => {
    checkInHelper.clearCheckInDraft(ATHLETE_ID);
    checkInHelper.saveCheckInCompleted(ATHLETE_ID, {
      trafficLight: 'Red',
      completedAt: new Date().toISOString(),
    });

    vi.mocked(seguimientoService.getAthleteTodayCheckIn).mockResolvedValue({
      id: 'checkin-1',
      athleteId: ATHLETE_ID,
      date: '2026-11-16',
      trafficLight: 'Red',
      trafficLightReason: 'Lesión activa reportada',
      sleepHours: 8,
      sleepQuality: 3,
      muscleSoreness: 2,
      fatigueLevel: 2,
      moodRate: 4,
      stressLevel: 2,
      isSick: false,
      painZones: 'isquiotibiales:6',
      hasActiveInjury: true,
      injuries: [{ injuryId: INJURY_ID, zone: 'isquiotibiales', level: 7 }],
    } as never);

    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Editar respuestas' }));

    expect(screen.queryByText(/No registrado|Sin registrar/i)).toBeNull();
    expect(screen.getAllByText('8').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Fresco').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Leve').length).toBeGreaterThan(0);

    fireEvent.click(await screen.findByRole('button', { name: /Paso 3: Dolor y Zonas/i }));
    expect(await screen.findByText(/isquiotibiales — Distensión grado 1/i)).toBeDefined();
    const scoreSlider = await screen.findByRole('slider', {
      name: /Nivel de dolor en Isquiotibiales/i,
    });
    expect((scoreSlider as HTMLInputElement).value).toBe('7');
  });
});
