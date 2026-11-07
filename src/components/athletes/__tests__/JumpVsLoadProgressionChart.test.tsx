import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { JumpVsLoadProgressionChart } from '../JumpVsLoadProgressionChart';
import { FitnessTestEvolutionSeries, WeeklyLoadEvolutionPoint } from '../../../types/seguimiento';

vi.mock('recharts', async (importOriginal) => {
  const original = await importOriginal<typeof import('recharts')>();
  return {
    ...original,
    ResponsiveContainer: ({ children }: { children: React.ReactElement }) =>
      React.cloneElement(children, { width: 600, height: 300 }),
  };
});

describe('JumpVsLoadProgressionChart (KAN-437 / #142)', () => {
  const mockJumpTests: FitnessTestEvolutionSeries[] = [
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
  ];

  const mockWeeklyLoads: WeeklyLoadEvolutionPoint[] = [
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
    {
      weekStartDate: '2026-10-05',
      weekEndDate: '2026-10-11',
      totalLoad: 1100,
      totalMinutes: 160,
    },
    {
      weekStartDate: '2026-10-12',
      weekEndDate: '2026-10-18',
      totalLoad: 0,
      totalMinutes: 0,
    },
    {
      weekStartDate: '2026-10-19',
      weekEndDate: '2026-10-25',
      totalLoad: 1600,
      totalMinutes: 220,
    },
  ];

  it('CRITERIO 1: DADO un atleta con 4 tests de salto y su carga cargada CUANDO el PF ve el gráfico ENTONCES visualiza ambas series', () => {
    render(
      <JumpVsLoadProgressionChart
        fitnessTests={mockJumpTests}
        weeklyLoads={mockWeeklyLoads}
        isCoach={true}
      />,
    );

    expect(screen.getByText('Salto vs. Carga Semanal')).toBeDefined();
    expect(screen.getByTestId('jump-load-chart-wrap')).toBeDefined();
    expect(
      screen.getByText(
        'Relación entre altura de salto (cm) y carga de entrenamiento acumulada (min × RPE).',
      ),
    ).toBeDefined();
  });

  it('CRITERIO: Solo para el PF. El atleta ve su salto en "Mi evolución", pero sin la carga (isCoach = false)', () => {
    render(
      <JumpVsLoadProgressionChart
        fitnessTests={mockJumpTests}
        weeklyLoads={mockWeeklyLoads}
        isCoach={false}
      />,
    );

    expect(screen.getByText('Progresión de Salto')).toBeDefined();
    expect(
      screen.getByText('Altura alcanzada en tests físicos de salto vertical (cm).'),
    ).toBeDefined();
    // No debe mencionar la carga semanal en el subtítulo
    expect(screen.queryByText(/carga de entrenamiento acumulada/i)).toBeNull();
  });

  it('muestra estado vacío cuando no hay tests de salto registrados', () => {
    render(<JumpVsLoadProgressionChart fitnessTests={[]} weeklyLoads={[]} isCoach={true} />);

    expect(screen.getByTestId('jump-load-empty')).toBeDefined();
    expect(screen.getByText('Sin tests de salto registrados')).toBeDefined();
  });

  it('muestra el estado de carga mientras se obtienen los datos', () => {
    render(
      <JumpVsLoadProgressionChart
        fitnessTests={[]}
        weeklyLoads={[]}
        isCoach={true}
        loading={true}
      />,
    );

    expect(screen.getByText('Cargando evolución de salto y carga…')).toBeDefined();
  });
});
