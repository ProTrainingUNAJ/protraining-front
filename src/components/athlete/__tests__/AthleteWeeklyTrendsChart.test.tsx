import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AthleteWeeklyTrendsChart } from '../AthleteWeeklyTrendsChart';
import type { AthleteWeeklyTrendsResponse } from '../../../types/seguimiento';

vi.mock('recharts', async (importOriginal) => {
  const original = await importOriginal<typeof import('recharts')>();
  return {
    ...original,
    ResponsiveContainer: ({ children }: { children: React.ReactElement }) =>
      React.cloneElement(children, { width: 600, height: 300 }),
  };
});

describe('AthleteWeeklyTrendsChart (KAN-490)', () => {
  const mock4WeeksTrends: AthleteWeeklyTrendsResponse = {
    athleteId: 'ath-1',
    from: '2026-10-26',
    to: '2026-11-22',
    weeks: [
      {
        weekStartDate: '2026-10-26',
        weekEndDate: '2026-11-01',
        averageWellness: 3.8,
        totalLoad: 1200,
        totalMinutes: 160,
        checkInCount: 4,
        loadCount: 3,
      },
      {
        weekStartDate: '2026-11-02',
        weekEndDate: '2026-11-08',
        averageWellness: 4.2,
        totalLoad: 1500,
        totalMinutes: 190,
        checkInCount: 6,
        loadCount: 4,
      },
      {
        weekStartDate: '2026-11-09',
        weekEndDate: '2026-11-15',
        averageWellness: 4.0,
        totalLoad: 1400,
        totalMinutes: 180,
        checkInCount: 5,
        loadCount: 4,
      },
      {
        weekStartDate: '2026-11-16',
        weekEndDate: '2026-11-22',
        averageWellness: 4.5,
        totalLoad: 1650,
        totalMinutes: 210,
        checkInCount: 7,
        loadCount: 5,
      },
    ],
  };

  it('renderiza correctamente el gráfico con un set completo de 4 semanas', () => {
    render(<AthleteWeeklyTrendsChart trends={mock4WeeksTrends} />);

    expect(
      screen.getByRole('region', {
        name: 'Tendencias de bienestar y carga de las últimas 4 semanas',
      }),
    ).toBeDefined();
    expect(screen.getByText('Tendencia de Bienestar y Carga')).toBeDefined();
    expect(screen.getByText('Últimas 4 semanas')).toBeDefined();

    // Comprobar KPIs calculados
    // (3.8 + 4.2 + 4.0 + 4.5) / 4 = 16.5 / 4 = 4.125 -> 4.1
    expect(screen.getByText('4.1')).toBeDefined();
    // Promedio de carga: (1200+1500+1400+1650)/4 = 5750/4 = 1438
    expect(screen.getByText('1.438')).toBeDefined();
    // Total checkins: 4 + 6 + 5 + 7 = 22
    expect(screen.getByText('22')).toBeDefined();

    // No debe mostrar aviso de semanas parciales cuando hay 4 semanas
    expect(screen.queryByText(/Mostrando .* semana/i)).toBeNull();
  });

  it('renderiza correctamente con semanas parciales (menos de 4 semanas) sin romperse', () => {
    const partialTrends: AthleteWeeklyTrendsResponse = {
      athleteId: 'ath-1',
      from: '2026-11-09',
      to: '2026-11-22',
      weeks: [
        {
          weekStartDate: '2026-11-09',
          weekEndDate: '2026-11-15',
          averageWellness: 4.0,
          totalLoad: 1200,
          totalMinutes: 150,
          checkInCount: 5,
          loadCount: 3,
        },
        {
          weekStartDate: '2026-11-16',
          weekEndDate: '2026-11-22',
          averageWellness: 3.5,
          totalLoad: 1600,
          totalMinutes: 200,
          checkInCount: 4,
          loadCount: 4,
        },
      ],
    };

    render(<AthleteWeeklyTrendsChart trends={partialTrends} />);

    expect(screen.getByText('Tendencia de Bienestar y Carga')).toBeDefined();
    expect(screen.getByText('Mostrando 2 semanas registradas de actividad.')).toBeDefined();
    expect(screen.getByText('3.8')).toBeDefined(); // (4.0 + 3.5)/2 = 3.75 -> 3.8
  });

  it('muestra el estado vacío amigable cuando no hay semanas con registros', () => {
    const emptyTrends: AthleteWeeklyTrendsResponse = {
      athleteId: 'ath-1',
      from: '2026-10-26',
      to: '2026-11-22',
      weeks: [],
    };

    render(<AthleteWeeklyTrendsChart trends={emptyTrends} />);

    expect(screen.getByTestId('athlete-trends-empty-state')).toBeDefined();
    expect(screen.getByText('Todavía no hay registros de bienestar o carga')).toBeDefined();
  });

  it('muestra el estado de carga mientras los datos se están recuperando', () => {
    render(<AthleteWeeklyTrendsChart trends={null} loading={true} />);

    expect(screen.getByRole('status', { name: 'Cargando tendencias' })).toBeDefined();
    expect(screen.getByText('Cargando tendencias de bienestar y carga…')).toBeDefined();
  });

  it('muestra el banner de error cuando falla la consulta', () => {
    render(
      <AthleteWeeklyTrendsChart trends={null} error="No se pudieron cargar las tendencias." />,
    );

    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.getByText('No se pudieron cargar las tendencias.')).toBeDefined();
  });
});
