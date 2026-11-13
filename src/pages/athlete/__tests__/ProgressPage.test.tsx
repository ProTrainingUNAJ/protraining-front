import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProgressPage } from '../ProgressPage';
import { athleteRecordsService } from '../../../api/athleteRecords';
import { structureService } from '../../../api/structureService';
import { athleteBenchmarkService } from '../../../api/athleteBenchmark';
import { athleteEvolutionService } from '../../../api/athleteEvolution';

vi.mock('recharts', async (importOriginal) => {
  const original = await importOriginal<typeof import('recharts')>();
  return {
    ...original,
    ResponsiveContainer: ({ children }: { children: React.ReactElement }) =>
      React.cloneElement(children, { width: 600, height: 300 }),
  };
});

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'ath-123', fullName: 'Lucas Romero', role: 'Atleta' },
    isAuthenticated: true,
  }),
}));

describe('ProgressPage - Pestaña Mi Evolución para el Atleta (KAN-436 / #141)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(structureService, 'getMe').mockResolvedValue({
      athleteId: 'ath-123',
      firstName: 'Lucas',
      lastName: 'Romero',
      fullName: 'Lucas Romero',
      active: true,
      categories: [{ id: 'cat-1', organizationId: 'org-1', name: 'Sub 20', athletesCount: 15 }],
    });
    vi.spyOn(athleteBenchmarkService, 'getMyGroupBenchmark').mockResolvedValue({
      athleteId: 'ath-123',
      categoryId: 'cat-1',
      categoryName: 'Sub 20',
      metrics: [],
    });
    vi.spyOn(athleteEvolutionService, 'getEvolution').mockResolvedValue({
      athleteId: 'ath-123',
      from: '2026-08-01',
      to: '2026-11-01',
      strength: [],
      fitnessTests: [],
      wellness: { fatiguePoints: [], dailyPoints: [] },
      weeklyLoads: [],
      strengthUnavailable: false,
    });
  });

  it('permite al atleta cambiar a la pestaña "Mi evolución" y ver la progresión de 1RM', async () => {
    vi.spyOn(athleteRecordsService, 'listHistory').mockResolvedValue([
      {
        id: 'r1',
        exerciseId: 'ex-squat',
        exerciseName: 'Sentadilla trasera',
        weightKg: 100,
        origin: 'TestedInSession',
        achievedAt: '2026-09-01T10:00:00Z',
      },
      {
        id: 'r2',
        exerciseId: 'ex-squat',
        exerciseName: 'Sentadilla trasera',
        weightKg: 110,
        origin: 'Reported',
        achievedAt: '2026-10-01T10:00:00Z',
      },
    ]);

    render(
      <MemoryRouter>
        <ProgressPage />
      </MemoryRouter>,
    );

    // Pestañas visibles
    const tabMiProgreso = screen.getByRole('tab', { name: /Mi progreso/i });
    const tabMiEvolucion = screen.getByTestId('tab-mi-evolucion');
    expect(tabMiProgreso).toBeDefined();
    expect(tabMiEvolucion).toBeDefined();

    // Cambiar a Mi evolución
    fireEvent.click(tabMiEvolucion);

    // Debe mostrar la sección de Progresión de 1RM
    await waitFor(() => {
      expect(screen.getByText('Progresión de 1RM')).toBeDefined();
      expect(screen.getByTestId('exercise-selector')).toBeDefined();
    });

    // Muestra Sentadilla trasera en el selector
    expect(screen.getByText('Sentadilla trasera')).toBeDefined();
  });

  it('inicia en "Mi evolución" si se navega con ?tab=evolution', async () => {
    vi.spyOn(athleteRecordsService, 'listHistory').mockResolvedValue([]);

    render(
      <MemoryRouter initialEntries={['/athlete/progress?tab=evolution']}>
        <ProgressPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Progresión de 1RM')).toBeDefined();
      expect(screen.getByText('Sin récords cargados')).toBeDefined();
    });
  });

  it('CRITERIO KAN-435: muestra el banner "No pudimos cargar los récords de fuerza en este momento." cuando strengthUnavailable es true', async () => {
    vi.spyOn(athleteEvolutionService, 'getEvolution').mockResolvedValue({
      athleteId: 'ath-123',
      from: '2026-08-01',
      to: '2026-11-01',
      strength: [],
      fitnessTests: [],
      wellness: { fatiguePoints: [], dailyPoints: [] },
      weeklyLoads: [],
      strengthUnavailable: true,
    });
    vi.spyOn(athleteRecordsService, 'listHistory').mockResolvedValue([]);

    render(
      <MemoryRouter initialEntries={['/athlete/progress?tab=evolution']}>
        <ProgressPage />
      </MemoryRouter>,
    );

    // Debe mostrar la advertencia explícita en la sección de fuerza/1RM
    await waitFor(() => {
      expect(screen.getByTestId('strength-unavailable-banner')).toBeDefined();
      expect(
        screen.getByText('No pudimos cargar los récords de fuerza en este momento.'),
      ).toBeDefined();
    });

    // Sin mediciones en el período, "Mi progreso" lo dice en lugar de mostrar números de ejemplo
    const tabMiProgreso = screen.getByRole('tab', { name: /Mi progreso/i });
    fireEvent.click(tabMiProgreso);

    expect(screen.getByText('Todavía no hay mediciones en este período')).toBeDefined();
  });

  it('Mi progreso muestra la última medición real de cada métrica', async () => {
    vi.spyOn(athleteEvolutionService, 'getEvolution').mockResolvedValue({
      athleteId: 'ath-123',
      from: '2026-08-01',
      to: '2026-11-01',
      strength: [],
      fitnessTests: [
        {
          catalogTestId: 't-1',
          testName: 'Salto CMJ',
          motorCapacity: 'Potencia',
          unit: 'cm',
          points: [
            { date: '2026-09-01', value: 38 },
            { date: '2026-10-01', value: 41 },
          ],
        },
      ],
      wellness: { fatiguePoints: [], dailyPoints: [] },
      weeklyLoads: [],
      strengthUnavailable: false,
    });

    render(
      <MemoryRouter initialEntries={['/athlete/progress']}>
        <ProgressPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('+3 cm en el período')).toBeDefined();
    });
    expect(screen.getAllByText('Salto CMJ').length).toBeGreaterThan(0);
  });

  it('CRITERIO KAN-434 / KAN-435: maneja error 404 (atleta no encontrado o de otro PF) mostrando la alerta', async () => {
    vi.spyOn(athleteEvolutionService, 'getEvolution').mockRejectedValue(
      new Error('Atleta no encontrado'),
    );

    render(
      <MemoryRouter initialEntries={['/athlete/progress?tab=evolution']}>
        <ProgressPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('evolution-error-banner')).toBeDefined();
      expect(screen.getByText('Atleta no encontrado')).toBeDefined();
    });
  });
});
