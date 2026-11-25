import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { CategoryMetricsPanel } from '../CategoryMetricsPanel';
import type { CategoryDashboardSummary } from '../../../types/categoryDashboard';

vi.mock('recharts', async (importOriginal) => {
  const original = await importOriginal<typeof import('recharts')>();
  return {
    ...original,
    ResponsiveContainer: ({ children }: { children: React.ReactElement }) =>
      React.cloneElement(children, { width: 600, height: 240 }),
  };
});

const summary: CategoryDashboardSummary = {
  categoryId: 'cat-1',
  from: '2026-10-20',
  to: '2026-11-20',
  athleteCount: 12,
  evaluatedDays: 4,
  attendance: {
    presentDays: 40,
    absentDays: 5,
    withoutRecordDays: 3,
    evaluatedAthleteDays: 48,
    attendancePercentage: 83.3,
  },
  injuries: { activeCount: 1, inRecoveryCount: 2, clearedInPeriodCount: 3, athletesAffected: 4 },
  load: {
    totalLoad: 4200,
    totalMinutes: 980,
    recordsCount: 37,
    weeks: [
      {
        weekStart: '2026-10-19',
        weekEnd: '2026-10-25',
        totalLoad: 1800,
        totalMinutes: 400,
        recordsCount: 15,
      },
    ],
  },
};

const emptySummary: CategoryDashboardSummary = {
  ...summary,
  evaluatedDays: 0,
  attendance: { ...summary.attendance, evaluatedAthleteDays: 0, attendancePercentage: 0 },
  injuries: { activeCount: 0, inRecoveryCount: 0, clearedInPeriodCount: 0, athletesAffected: 0 },
  load: { totalLoad: 0, totalMinutes: 0, recordsCount: 0, weeks: [] },
};

describe('CategoryMetricsPanel (KAN-504)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra presentismo, lesiones y carga solo con totales agregados', () => {
    render(<CategoryMetricsPanel summary={summary} />);

    expect(screen.getByTestId('category-dashboard-panel')).toBeDefined();
    expect(screen.getByTestId('category-dashboard-attendance').textContent).toBe('83.3%');
    expect(screen.getByTestId('category-dashboard-injuries').textContent).toBe('1 activas');
    expect(screen.getByTestId('category-dashboard-load').textContent).toMatch(/4\.?200 UA/);
    expect(screen.getByTestId('category-dashboard-chart')).toBeDefined();
    expect(screen.getByText(/Solo se muestran totales anónimos/)).toBeDefined();
  });

  it('muestra el estado de carga', () => {
    render(<CategoryMetricsPanel summary={null} loading />);
    expect(screen.getByTestId('category-dashboard-loading')).toBeDefined();
  });

  it('muestra el error y permite reintentar', () => {
    const onRetry = vi.fn();
    render(<CategoryMetricsPanel summary={null} error="No se pudo cargar" onRetry={onRetry} />);

    expect(screen.getByTestId('category-dashboard-error')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /Reintentar/i }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('muestra el estado vacío cuando no hay registros', () => {
    render(<CategoryMetricsPanel summary={emptySummary} />);
    expect(screen.getByTestId('category-dashboard-empty')).toBeDefined();
    expect(screen.queryByTestId('category-dashboard-chart')).toBeNull();
  });

  it('no tapa la barra con el cursor gris de Recharts al pasar el mouse', () => {
    render(<CategoryMetricsPanel summary={summary} />);

    const surface = document.querySelector('.recharts-surface');
    expect(surface).not.toBeNull();
    fireEvent.mouseMove(surface as Element, { clientX: 120, clientY: 120 });

    expect(document.querySelector('.recharts-tooltip-cursor')).toBeNull();
  });
});
