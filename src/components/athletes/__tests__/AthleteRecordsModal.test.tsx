import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { AthleteRecordsModal } from '../AthleteRecordsModal';
import { athleteRecordsService } from '../../../api/athleteRecords';
import { athleteEvolutionService } from '../../../api/athleteEvolution';
import { AthleteEvolutionResponse } from '../../../types/seguimiento';

vi.mock('recharts', async (importOriginal) => {
  const original = await importOriginal<typeof import('recharts')>();
  return {
    ...original,
    ResponsiveContainer: ({ children }: { children: React.ReactElement }) =>
      React.cloneElement(children, { width: 600, height: 300 }),
  };
});

describe('AthleteRecordsModal - Pestaña Evolución para el PF (KAN-436 / KAN-437 / #142)', () => {
  const emptyEvolution: AthleteEvolutionResponse = {
    athleteId: 'ath-10',
    from: '2026-08-01',
    to: '2026-11-01',
    strength: [],
    fitnessTests: [],
    wellness: { fatiguePoints: [], dailyPoints: [] },
    weeklyLoads: [],
    strengthUnavailable: false,
  };

  const sampleEvolution: AthleteEvolutionResponse = {
    athleteId: 'ath-10',
    from: '2026-08-01',
    to: '2026-11-01',
    strength: [
      {
        exerciseId: 'ex-squat',
        exerciseName: 'Sentadilla trasera',
        unit: 'kg',
        points: [
          { date: '2026-08-10', value: 100, label: '100 kg' },
          { date: '2026-09-15', value: 110, label: '110 kg' },
        ],
      },
    ],
    fitnessTests: [
      {
        catalogTestId: 'test-jump',
        testName: 'Salto Vertical CMJ',
        motorCapacity: 'Power',
        unit: 'cm',
        points: [
          { date: '2026-09-07', value: 38.5, label: '38.5 cm' },
          { date: '2026-09-21', value: 40.0, label: '40.0 cm' },
          { date: '2026-10-05', value: 41.5, label: '41.5 cm' },
          { date: '2026-10-19', value: 43.0, label: '43.0 cm' },
        ],
      },
    ],
    wellness: { fatiguePoints: [], dailyPoints: [] },
    weeklyLoads: [
      {
        weekStartDate: '2026-09-07',
        weekEndDate: '2026-09-13',
        totalLoad: 1200,
        totalMinutes: 180,
      },
      {
        weekStartDate: '2026-09-14',
        weekEndDate: '2026-09-20',
        totalLoad: 1500,
        totalMinutes: 210,
      },
      {
        weekStartDate: '2026-09-21',
        weekEndDate: '2026-09-27',
        totalLoad: 900,
        totalMinutes: 140,
      },
      {
        weekStartDate: '2026-09-28',
        weekEndDate: '2026-10-04',
        totalLoad: 1800,
        totalMinutes: 240,
      },
    ],
    strengthUnavailable: false,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(athleteRecordsService, 'listCurrent').mockResolvedValue([]);
    vi.spyOn(athleteRecordsService, 'listHistory').mockResolvedValue([]);
    vi.spyOn(athleteEvolutionService, 'getEvolution').mockResolvedValue(emptyEvolution);
  });

  it('permite al PF alternar entre la pestaña Récords y la pestaña Evolución', async () => {
    render(<AthleteRecordsModal athleteId="ath-10" athleteName="Mateo Rossi" onClose={vi.fn()} />);

    expect(screen.getByText('Récords de Mateo Rossi')).toBeDefined();
    expect(screen.getByRole('tab', { name: /Récords/i })).toBeDefined();
    const evolutionTab = screen.getByTestId('tab-evolucion-pf');
    expect(evolutionTab).toBeDefined();

    expect(screen.getByText('Cargar un récord')).toBeDefined();

    fireEvent.click(evolutionTab);

    await waitFor(() => {
      expect(screen.getByTestId('evolution-pf-container')).toBeDefined();
      expect(screen.getByTestId('range-selector-3m')).toBeDefined();
    });
  });

  it('CRITERIO 1: DADO un atleta con 4 tests de salto y su carga cargada CUANDO el PF elige "3 meses" ENTONCES ve las dos series en ese rango', async () => {
    vi.spyOn(athleteEvolutionService, 'getEvolution').mockResolvedValue(sampleEvolution);

    render(
      <AthleteRecordsModal
        athleteId="ath-10"
        athleteName="Mateo Rossi"
        initialTab="evolution"
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => {
      // Selector de rango con 3 meses activo por defecto
      const btn3m = screen.getByTestId('range-selector-3m');
      expect(btn3m.getAttribute('aria-pressed')).toBe('true');

      // Gráfico de salto vs. carga con las dos series
      expect(screen.getByText('Salto vs. Carga Semanal')).toBeDefined();
      expect(screen.getByTestId('jump-load-chart-wrap')).toBeDefined();

      // Gráfico de 1RM presente
      expect(screen.getByTestId('rm-line-chart-wrap')).toBeDefined();
      expect(screen.getByText('Sentadilla trasera')).toBeDefined();
    });
  });

  it('CRITERIO 2: DADO que se cambia el rango CUANDO se elige "4 semanas" ENTONCES los dos gráficos de la pestaña se actualizan', async () => {
    const getEvolutionMock = vi
      .spyOn(athleteEvolutionService, 'getEvolution')
      .mockResolvedValue(sampleEvolution);

    render(
      <AthleteRecordsModal
        athleteId="ath-10"
        athleteName="Mateo Rossi"
        initialTab="evolution"
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('range-selector-4w')).toBeDefined();
    });

    // Inicialmente se consultó por defecto (3 meses)
    expect(getEvolutionMock).toHaveBeenCalledWith('ath-10', { months: 3 });

    // El PF cambia a "4 semanas"
    fireEvent.click(screen.getByTestId('range-selector-4w'));

    await waitFor(() => {
      // Se volvió a consultar con las opciones de 4 semanas
      expect(getEvolutionMock).toHaveBeenCalledWith(
        'ath-10',
        expect.objectContaining({ from: expect.any(String), to: expect.any(String) }),
      );
      // Los dos gráficos siguen presentes en el DOM sincronizados
      expect(screen.getByTestId('jump-load-chart-wrap')).toBeDefined();
      expect(screen.getByTestId('rm-line-chart-wrap')).toBeDefined();
    });
  });

  it('muestra el banner de advertencia cuando Entrenamiento está en modo degradado (strengthUnavailable)', async () => {
    vi.spyOn(athleteEvolutionService, 'getEvolution').mockResolvedValue({
      ...emptyEvolution,
      strengthUnavailable: true,
    });

    render(
      <AthleteRecordsModal
        athleteId="ath-10"
        athleteName="Mateo Rossi"
        initialTab="evolution"
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('strength-unavailable-alert')).toBeDefined();
      expect(
        screen.getByText('No pudimos cargar los récords de fuerza en este momento.'),
      ).toBeDefined();
    });
  });
});
