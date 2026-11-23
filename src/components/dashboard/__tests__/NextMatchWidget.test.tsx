import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NextMatchWidget } from '../NextMatchWidget';
import { structureService } from '../../../api/structureService';
import { matchesApi } from '../../../api/matches';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});
vi.mock('../../../api/structureService', () => ({
  structureService: { getOrganizations: vi.fn(), getCategories: vi.fn() },
}));
vi.mock('../../../api/matches', () => ({
  matchesApi: { getCategoryMatches: vi.fn(), getCategorySeasonPhases: vi.fn() },
}));
vi.mock('../../../utils/argentinaDate', () => ({ todayInArgentina: () => '2026-11-22' }));

const matchesMock = vi.mocked(matchesApi.getCategoryMatches);

function match(id: string, categoryId: string, date: string, opponent: string) {
  return {
    id,
    categoryId,
    opponent,
    matchDate: `${date}T15:30:00`,
    startTime: '15:30:00',
    homeOrAway: 'Home' as const,
  };
}

function renderWidget() {
  return render(
    <MemoryRouter>
      <NextMatchWidget />
    </MemoryRouter>,
  );
}

describe('NextMatchWidget (KAN-594)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(structureService.getOrganizations).mockResolvedValue([
      { id: 'org-1', name: 'Club Quilmes', categoriesCount: 2 },
    ]);
    vi.mocked(structureService.getCategories).mockResolvedValue([
      { id: 'cat-1', organizationId: 'org-1', name: 'Primera División', athletesCount: 10 },
      { id: 'cat-2', organizationId: 'org-1', name: 'Reserva', athletesCount: 5 },
    ]);
    vi.mocked(matchesApi.getCategorySeasonPhases).mockResolvedValue([
      {
        id: 'p-1',
        name: 'Pretemporada',
        type: 'Preseason' as never,
        startDate: '2026-10-17',
        endDate: '2026-11-27',
      },
    ]);
  });

  it('muestra el partido más cercano de cualquier categoría, con cuánto falta y la fase', async () => {
    matchesMock.mockImplementation(async (categoryId: string) =>
      categoryId === 'cat-1'
        ? [
            match('m-1', 'cat-1', '2026-11-28', 'Atlético Varela'),
            match('m-0', 'cat-1', '2026-11-10', 'Pasado FC'),
          ]
        : [match('m-2', 'cat-2', '2026-12-05', 'Reserva Sur')],
    );

    renderWidget();

    expect(await screen.findByText('vs. Atlético Varela')).toBeDefined();
    expect(screen.getByText('Faltan 6 días')).toBeDefined();
    expect(screen.getByText(/sábado 28\/11 · 15:30/)).toBeDefined();
    expect(screen.getByText('Local')).toBeDefined();
    expect(screen.getByText('Club Quilmes · Primera División')).toBeDefined();
    expect(screen.getByText('Fase actual: Pretemporada')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: /Ver calendario/ }));
    expect(navigateMock).toHaveBeenCalledWith('/pf/calendar');
  });

  it('sin partidos en los próximos 30 días muestra el mensaje vacío', async () => {
    matchesMock.mockResolvedValue([match('m-9', 'cat-1', '2027-02-01', 'Muy Lejos')]);
    renderWidget();
    expect(
      await screen.findByText('No hay partidos cargados en los próximos 30 días.'),
    ).toBeDefined();
  });

  it('si fallan todas las categorías muestra el error con Reintentar', async () => {
    matchesMock.mockRejectedValue(new Error('caído'));
    renderWidget();
    expect(
      await screen.findByText('No se pudo consultar el calendario de partidos.'),
    ).toBeDefined();
    expect(screen.getByRole('button', { name: /Reintentar/ })).toBeDefined();
  });
});
