import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CategoryStatisticsPage } from '../CategoryStatisticsPage';
import { getCategoryDashboardRange } from '../../../utils/categoryDashboardRange';
import type { CategoryDashboardSummary } from '../../../types/categoryDashboard';

vi.mock('recharts', async (importOriginal) => {
  const original = await importOriginal<typeof import('recharts')>();
  return {
    ...original,
    ResponsiveContainer: ({ children }: { children: React.ReactElement }) =>
      React.cloneElement(children, { width: 600, height: 240 }),
  };
});

const { getByCategoryMock, getOrganizationsMock, getCategoriesMock } = vi.hoisted(() => ({
  getByCategoryMock: vi.fn(),
  getOrganizationsMock: vi.fn(),
  getCategoriesMock: vi.fn(),
}));

vi.mock('../../../api/categoryDashboard', () => ({
  categoryDashboardService: { getByCategory: getByCategoryMock },
}));

vi.mock('../../../api/structureService', () => ({
  structureService: {
    getOrganizations: getOrganizationsMock,
    getCategories: getCategoriesMock,
  },
}));

const summary: CategoryDashboardSummary = {
  categoryId: 'cat-2',
  from: '2026-08-20',
  to: '2026-11-20',
  athleteCount: 10,
  evaluatedDays: 6,
  attendance: {
    presentDays: 45,
    absentDays: 5,
    withoutRecordDays: 10,
    evaluatedAthleteDays: 60,
    attendancePercentage: 75,
  },
  injuries: { activeCount: 2, inRecoveryCount: 1, clearedInPeriodCount: 0, athletesAffected: 3 },
  load: { totalLoad: 2400, totalMinutes: 600, recordsCount: 20, weeks: [] },
};

function renderPage(entry = '/pf/category-statistics?catId=cat-2&period=3m') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <CategoryStatisticsPage />
    </MemoryRouter>,
  );
}

describe('CategoryStatisticsPage (KAN-504)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getOrganizationsMock.mockResolvedValue([{ id: 'org-1', name: 'Club' }]);
    getCategoriesMock.mockResolvedValue([
      { id: 'cat-1', organizationId: 'org-1', name: 'Primera', athletesCount: 8 },
      { id: 'cat-2', organizationId: 'org-1', name: 'Reserva', athletesCount: 10 },
    ]);
    getByCategoryMock.mockResolvedValue(summary);
  });

  it('toma la categoría y el período de la URL y muestra el resumen', async () => {
    renderPage();

    await waitFor(() => {
      expect(getByCategoryMock).toHaveBeenCalledWith('cat-2', getCategoryDashboardRange('3m'));
    });
    await waitFor(() => {
      expect(screen.getByTestId('category-dashboard-attendance').textContent).toBe('75.0%');
    });
    expect(screen.getByRole('combobox', { name: /Seleccionar categoría/i })).toBeDefined();
    expect(screen.getByRole('combobox', { name: /Seleccionar período/i })).toBeDefined();
  });

  it('vuelve a consultar al reintentar después de un error', async () => {
    getByCategoryMock.mockRejectedValueOnce(new Error('La categoría solicitada no existe.'));
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('category-dashboard-error')).toBeDefined();
    });
    expect(screen.getByText('La categoría solicitada no existe.')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: /Reintentar/i }));
    await waitFor(() => {
      expect(getByCategoryMock).toHaveBeenCalledTimes(2);
    });
  });

  it('explica qué hacer si el PF no tiene categorías', async () => {
    getCategoriesMock.mockResolvedValue([]);
    renderPage('/pf/category-statistics');

    await waitFor(() => {
      expect(screen.getByText('No hay categorías disponibles')).toBeDefined();
    });
    expect(getByCategoryMock).not.toHaveBeenCalled();
  });
});
