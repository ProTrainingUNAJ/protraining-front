import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MonitoringPage } from '../MonitoringPage';
import { structureService } from '../../../api/structureService';
import {
  getCategoryTrafficLightToday,
  getCategoryAttendanceToday,
} from '../../../api/seguimientoService';
import { dayAdjustmentsService } from '../../../api/dayAdjustments';

vi.mock('../../../api/structureService', () => ({
  structureService: {
    getOrganizations: vi.fn(),
    getCategories: vi.fn(),
  },
}));

vi.mock('../../../api/seguimientoService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../api/seguimientoService')>();
  return {
    ...actual,
    getCategoryTrafficLightToday: vi.fn(),
    getCategoryAttendanceToday: vi.fn(),
  };
});

vi.mock('../../../api/dayAdjustments', () => ({
  dayAdjustmentsService: {
    getAthleteDayConflicts: vi.fn(),
    createOrGetDayAdjustment: vi.fn(),
    approveDayAdjustment: vi.fn(),
    rejectDayAdjustment: vi.fn(),
  },
}));

describe('MonitoringPage · Botón Ver ajuste sugerido (#157 · KAN-452)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(structureService.getOrganizations).mockResolvedValue([
      { id: 'org-1', name: 'Club Atlético', categoriesCount: 1 },
    ]);
    vi.mocked(structureService.getCategories).mockResolvedValue([
      { id: 'cat-1', name: 'Primera División', organizationId: 'org-1', athletesCount: 1 },
    ]);
    vi.mocked(getCategoryAttendanceToday).mockResolvedValue({
      categoryId: 'cat-1',
      date: '2026-11-10',
      totalRoster: 1,
      presentCount: 1,
      attendancePercentage: 100,
      athletes: [],
    });
  });

  it('DADO un atleta con conflicto de dolor CUANDO carga el semáforo ENTONCES se muestra el botón "Ver ajuste sugerido" y al tocarlo abre la propuesta', async () => {
    vi.mocked(getCategoryTrafficLightToday).mockResolvedValue([
      {
        athleteId: 'ath-1',
        athleteName: 'Lucas Gómez',
        trafficLight: 'Yellow',
        trafficLightReason: 'Molestia en el cuádriceps reportada hoy.',
        hasReportedToday: true,
        reportedAt: '2026-11-10T11:00:00Z',
        resultValue: 50,
        indicators: {
          painZones: 'cuadriceps:2',
          sleepHours: 8,
          sleepQuality: 4,
          effortRate: 6,
          isSick: false,
          hasActiveInjury: false,
        },
      },
    ]);

    vi.mocked(dayAdjustmentsService.getAthleteDayConflicts).mockResolvedValue({
      hasConflicts: true,
      painZones: 'cuadriceps:2',
      conflicts: [
        {
          exerciseId: 'ex-jump',
          name: 'Salto al cajón',
          zone: 'cuadriceps',
          painLevel: 2,
          reason: 'Impacto reactivo',
          substitutes: [{ exerciseId: 'ex-press', name: 'Prensa de piernas' }],
        },
      ],
    });

    vi.mocked(dayAdjustmentsService.createOrGetDayAdjustment).mockResolvedValue({
      id: 'adj-1',
      athleteId: 'ath-1',
      date: '2026-11-10',
      sessionId: 'sess-1',
      status: 'Pending',
      provider: 'Reglas',
      justification: 'Se cambia Salto al cajón por Prensa de piernas.',
      items: [
        {
          originalExerciseId: 'ex-jump',
          originalExerciseName: 'Salto al cajón',
          suggestedSubstituteExerciseId: 'ex-press',
          suggestedSubstituteExerciseName: 'Prensa de piernas',
          substituteExerciseId: 'ex-press',
          substituteExerciseName: 'Prensa de piernas',
          zone: 'cuadriceps',
          painLevel: 2,
          reason: 'Impacto reactivo',
          availableSubstitutes: [{ exerciseId: 'ex-press', name: 'Prensa de piernas' }],
        },
      ],
    });

    render(
      <MemoryRouter>
        <MonitoringPage />
      </MemoryRouter>,
    );

    // Esperar a que el atleta se cargue y evalúe su conflicto
    await waitFor(() => {
      expect(screen.getByText('Lucas Gómez')).toBeTruthy();
      expect(screen.getByTestId('btn-day-adjustment-ath-1')).toBeTruthy();
    });

    const btn = screen.getByTestId('btn-day-adjustment-ath-1');
    expect(btn.textContent).toContain('Ver ajuste sugerido');

    // Clic en el botón abre el modal de ajuste
    fireEvent.click(btn);

    await waitFor(() => {
      expect(screen.getByTestId('day-adjustment-modal')).toBeTruthy();
      expect(screen.getByText('"Se cambia Salto al cajón por Prensa de piernas."')).toBeTruthy();
    });
  });

  it('DADO un atleta sin dolor o sin conflictos CUANDO carga el semáforo ENTONCES no muestra el botón "Ver ajuste sugerido"', async () => {
    vi.mocked(getCategoryTrafficLightToday).mockResolvedValue([
      {
        athleteId: 'ath-2',
        athleteName: 'Mateo Rossi',
        trafficLight: 'Green',
        trafficLightReason: 'Óptimo estado físico',
        hasReportedToday: true,
        reportedAt: '2026-11-10T11:00:00Z',
        resultValue: 90,
        indicators: {
          painZones: null,
          sleepHours: 8,
          sleepQuality: 5,
          effortRate: 5,
          isSick: false,
          hasActiveInjury: false,
        },
      },
    ]);

    render(
      <MemoryRouter>
        <MonitoringPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Mateo Rossi')).toBeTruthy();
    });

    expect(screen.queryByTestId('btn-day-adjustment-ath-2')).toBeNull();
    expect(screen.queryByText('Ver ajuste sugerido')).toBeNull();
  });
});
