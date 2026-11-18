import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DashboardPage } from '../DashboardPage';

vi.mock('../../../api/structureService', () => ({
  structureService: {
    getOrganizations: vi.fn().mockResolvedValue([{ id: 'org-1', name: 'Club Pro' }]),
    getCategories: vi.fn().mockResolvedValue([{ id: 'cat-1', name: 'Primera' }]),
    getAthletePhotoUrl: vi.fn(),
  },
}));

vi.mock('../../../api/seguimientoService', () => ({
  fetchAllCategoriesTrafficLight: vi.fn().mockResolvedValue([]),
  summarizeTrafficLightCounts: vi
    .fn()
    .mockReturnValue({ all: 0, green: 0, yellow: 0, red: 0, gray: 0 }),
  fetchAllCategoriesAttendanceToday: vi.fn().mockResolvedValue([
    {
      athleteId: 'ath-1',
      athleteName: 'Lucas Gómez',
      status: 'Present',
      totalMinutes: 140,
      totalLoad: 850,
    },
  ]),
}));

vi.mock('../../../api/recordProposals', () => ({
  recordProposalsService: {
    listPending: vi.fn().mockResolvedValue([]),
    approve: vi.fn(),
    discard: vi.fn(),
  },
}));

vi.mock('../../../hooks/useAthleteEvolution', () => ({
  useAthleteEvolution: () => ({
    evolution: [],
    loading: false,
  }),
}));

describe('DashboardPage - Mayor Carga (UA) Widget (KAN-621)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renderiza el widget de Mayor Carga (UA) en el dashboard del coach', async () => {
    render(
      <MemoryRouter initialEntries={['/pf/dashboard']}>
        <DashboardPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Mayor Carga (UA)')).toBeDefined();
      expect(screen.getByText('Lucas Gómez')).toBeDefined();
      expect(screen.getByText('850')).toBeDefined();
    });
  });

  it('migra el widget de Mayor Carga si localStorage tenía el layout previo sin él', async () => {
    // Simular un layout guardado previo con 'empty' en row1.cards[2]
    const legacyLayout = [
      {
        id: 'row-1',
        name: 'Fila 1',
        className: 'wireframe-row-1',
        cards: [
          { id: 'w-session', name: 'Predio y Horario', colSpan: 1, type: 'training-session' },
          { id: 'w-r1-2', name: 'Módulo Disponible', colSpan: 1, type: 'empty' },
          { id: 'w-r1-3', name: 'Módulo Disponible', colSpan: 1, type: 'empty' },
        ],
      },
      {
        id: 'row-2',
        name: 'Fila 2',
        className: 'wireframe-row-2',
        cards: [
          { id: 'w-traffic', name: 'Semáforo del Día', colSpan: 1, type: 'traffic-light-summary' },
          { id: 'w-checkin', name: 'Progreso de Check-in', colSpan: 1, type: 'checkin-progress' },
          { id: 'w-suite', name: 'ProTraining Suite', colSpan: 1, type: 'suite' },
        ],
      },
      {
        id: 'row-3',
        name: 'Fila 3',
        className: 'wireframe-row-3',
        cards: [
          { id: 'w-pain', name: 'Alertas de Dolor', colSpan: 1, type: 'pain-alerts' },
          {
            id: 'w-epley',
            name: 'Propuestas de Récord Epley',
            colSpan: 1,
            type: 'epley-proposals',
          },
        ],
      },
      {
        id: 'row-4',
        name: 'Fila 4',
        className: 'wireframe-row-4',
        cards: [
          { id: 'w-r4-1', name: 'Módulo Disponible', colSpan: 1, type: 'empty' },
          { id: 'w-r4-2', name: 'Módulo Disponible', colSpan: 1, type: 'empty' },
          { id: 'w-r4-3', name: 'Módulo Disponible', colSpan: 1, type: 'empty' },
        ],
      },
    ];

    localStorage.setItem('protraining_bento_rows_coach_v8', JSON.stringify(legacyLayout));

    render(
      <MemoryRouter initialEntries={['/pf/dashboard']}>
        <DashboardPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Mayor Carga (UA)')).toBeDefined();
      expect(screen.getByText('Lucas Gómez')).toBeDefined();
    });
  });
});
