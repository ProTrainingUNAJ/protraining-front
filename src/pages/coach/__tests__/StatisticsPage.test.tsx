import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { StatisticsPage } from '../StatisticsPage';

vi.mock('recharts', async (importOriginal) => {
  const original = await importOriginal<typeof import('recharts')>();
  return {
    ...original,
    ResponsiveContainer: ({ children }: { children: React.ReactElement }) =>
      React.cloneElement(children, { width: 600, height: 240 }),
  };
});

class MockResizeObserver {
  observe() { }
  unobserve() { }
  disconnect() { }
}
global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

const {
  getOrganizationsMock,
  getCategoriesMock,
  getByCategoryMock,
  searchExercisesMock,
  getReliabilityByCategoryMock,
} = vi.hoisted(() => ({
  getOrganizationsMock: vi.fn(),
  getCategoriesMock: vi.fn(),
  getByCategoryMock: vi.fn(),
  searchExercisesMock: vi.fn(),
  getReliabilityByCategoryMock: vi.fn(),
}));

vi.mock('../../../api/structureService', () => ({
  structureService: {
    getOrganizations: getOrganizationsMock,
    getCategories: getCategoriesMock,
  },
}));

vi.mock('../../../api/categoryDashboard', () => ({
  categoryDashboardService: {
    getByCategory: getByCategoryMock,
  },
}));

vi.mock('../../../api/exercises', () => ({
  exercisesService: {
    search: searchExercisesMock,
  },
}));

vi.mock('../../../api/recordsReliability', () => ({
  recordsReliabilityService: {
    getByCategory: getReliabilityByCategoryMock,
  },
}));

describe('StatisticsPage (KAN-650, KAN-651)', () => {
  const mockOrganizations = [
    { id: 'org-1', name: 'Club Atlético Varela' },
    { id: 'org-2', name: 'Gimnasio Fitness Center' },
  ];

  const mockCategories = [
    { id: 'cat-1', name: 'Primera División', organizationId: 'org-1' },
    { id: 'cat-2', name: 'Reserva', organizationId: 'org-1' },
  ];

  const mockSummary = {
    categoryId: 'cat-1',
    from: '2026-10-21',
    to: '2026-11-21',
    athleteCount: 15,
    evaluatedDays: 10,
    attendance: {
      presentDays: 120,
      absentDays: 10,
      withoutRecordDays: 5,
      evaluatedAthleteDays: 135,
      attendancePercentage: 88.8,
    },
    injuries: {
      activeCount: 1,
      inRecoveryCount: 2,
      clearedInPeriodCount: 3,
      athletesAffected: 3,
    },
    load: {
      totalLoad: 4500,
      totalMinutes: 1200,
      recordsCount: 40,
      weeks: [],
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    getOrganizationsMock.mockResolvedValue(mockOrganizations);
    getCategoriesMock.mockImplementation(async (orgId: string) => {
      if (orgId === 'org-1') return mockCategories;
      return [];
    });

    searchExercisesMock.mockResolvedValue({
      items: [
        { id: 'ex-1', name: 'Sentadilla Trasera', primaryMuscles: ['Cuádriceps'] },
        { id: 'ex-2', name: 'Press de Banca', primaryMuscles: ['Pecho'] },
      ],
      total: 2,
      page: 1,
      pageSize: 50,
      totalPages: 1,
    });

    getByCategoryMock.mockResolvedValue(mockSummary);
    getReliabilityByCategoryMock.mockResolvedValue({
      categoryId: 'cat-1',
      totalAthletes: 15,
      totalRecords: 45,
      groups: [],
    });
  });

  it('renderiza la cabecera unificada con las píldoras de navegación y barra de filtros (KAN-650)', async () => {
    render(
      <MemoryRouter initialEntries={['/pf/statistics']}>
        <StatisticsPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Estadísticas & Informes')).toBeDefined();
    expect(screen.getByRole('button', { name: /estadísticas del plantel/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /confiabilidad de récords/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /ver ambas/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /informes & exportación/i })).toBeDefined();

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Club Atlético Varela' })).toBeDefined();
      expect(screen.getByRole('option', { name: 'Primera División' })).toBeDefined();
    });

    expect(screen.getByLabelText(/filtrar por organización/i)).toBeDefined();
    expect(screen.getByLabelText(/filtrar por categoría/i)).toBeDefined();
    expect(screen.getByLabelText(/seleccionar período de análisis/i)).toBeDefined();
  });

  it('conviven ambas secciones armoniosamente en modo "Ver Ambas" (tab=all) (KAN-650)', async () => {
    render(
      <MemoryRouter initialEntries={['/pf/statistics?tab=all']}>
        <StatisticsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /estadísticas del plantel/i })).toBeDefined();
      expect(screen.getByRole('heading', { name: /confiabilidad de récords/i })).toBeDefined();
    });

    // En modo 'all' conviven ambos filtros contextuales: período y ejercicio
    expect(screen.getByLabelText(/seleccionar período de análisis/i)).toBeDefined();
    expect(screen.getByLabelText(/filtrar por ejercicio/i)).toBeDefined();
  });

  it('cambia a la pestaña de Confiabilidad de Récords y muestra selector de ejercicio', async () => {
    render(
      <MemoryRouter initialEntries={['/pf/statistics']}>
        <StatisticsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Club Atlético Varela' })).toBeDefined();
    });

    const reliabilityTab = screen.getByRole('button', { name: /confiabilidad de récords/i });
    fireEvent.click(reliabilityTab);

    await waitFor(() => {
      expect(screen.getByLabelText(/filtrar por ejercicio/i)).toBeDefined();
    });
  });

  it('cambia a la pestaña de Informes & Exportación y renderiza las opciones de reporte', async () => {
    render(
      <MemoryRouter initialEntries={['/pf/statistics']}>
        <StatisticsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Club Atlético Varela' })).toBeDefined();
    });

    const reportsTab = screen.getByRole('button', { name: /informes & exportación/i });
    fireEvent.click(reportsTab);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /descargar csv/i })).toBeDefined();
      expect(screen.getByRole('button', { name: /imprimir \/ pdf/i })).toBeDefined();
      expect(screen.getByRole('button', { name: /whatsapp/i })).toBeDefined();
    });
  });

  it('resiliencia KAN-651: si el backend devuelve null (404/NotFound), no muestra alerta roja de error', async () => {
    getByCategoryMock.mockResolvedValue(null);

    render(
      <MemoryRouter initialEntries={['/pf/statistics?catId=cat-1']}>
        <StatisticsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(getByCategoryMock).toHaveBeenCalledWith(
        'cat-1',
        expect.anything(),
        { silentNotFound: true },
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('category-dashboard-empty')).toBeDefined();
      expect(screen.getByText(/todavía no hay registros en el período/i)).toBeDefined();
      expect(screen.queryByRole('alert')).toBeNull();
    });
  });

  it('filtra categorías en cascada al seleccionar una organización', async () => {
    render(
      <MemoryRouter initialEntries={['/pf/statistics']}>
        <StatisticsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Primera División' })).toBeDefined();
    });

    const orgSelect = screen.getByLabelText(/filtrar por organización/i);
    fireEvent.change(orgSelect, { target: { value: 'org-2' } });

    const catSelect = screen.getByLabelText(/filtrar por categoría/i) as HTMLSelectElement;
    expect(catSelect.disabled).toBe(true);
  });
});
