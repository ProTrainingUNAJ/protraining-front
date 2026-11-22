import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DashboardPage } from '../DashboardPage';
import type { Organization } from '../../../types/structure';

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

vi.mock('../../../api/trainingPlans', () => ({
  trainingPlansService: {
    schedule: vi.fn().mockResolvedValue([]),
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

  it('no muestra "Predio y Horario" con datos de ejemplo en el layout por defecto (KAN-583)', async () => {
    render(
      <MemoryRouter initialEntries={['/pf/dashboard']}>
        <DashboardPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Mayor Carga (UA)')).toBeDefined();
    });
    expect(screen.queryByText('Predio y Horario')).toBeNull();
    expect(screen.queryByText(/Predio UNAJ/)).toBeNull();
  });

  it('reemplaza "Predio y Horario" de un layout guardado por "Próximo entrenamiento" (KAN-583)', async () => {
    const savedLayout = [
      {
        id: 'row-1',
        name: 'Fila 1',
        className: 'wireframe-row-1',
        cards: [
          { id: 'w-session', name: 'Predio y Horario', colSpan: 1, type: 'training-session' },
          { id: 'w-r1-2', name: 'Módulo Disponible', colSpan: 1, type: 'empty' },
          { id: 'w-top-ua', name: 'Mayor Carga (UA)', colSpan: 1, type: 'top-ua-athletes' },
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
        cards: [{ id: 'w-pain', name: 'Alertas de Dolor', colSpan: 1, type: 'pain-alerts' }],
      },
      {
        id: 'row-4',
        name: 'Fila 4',
        className: 'wireframe-row-4',
        cards: [{ id: 'w-r4-1', name: 'Módulo Disponible', colSpan: 1, type: 'empty' }],
      },
    ];
    localStorage.setItem('protraining_bento_rows_coach_v8', JSON.stringify(savedLayout));

    render(
      <MemoryRouter initialEntries={['/pf/dashboard']}>
        <DashboardPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Mayor Carga (UA)')).toBeDefined();
    });
    expect(screen.queryByText('Predio y Horario')).toBeNull();
    expect(screen.queryByText(/Predio UNAJ/)).toBeNull();

    const persisted = JSON.parse(localStorage.getItem('protraining_bento_rows_coach_v8') ?? '[]');
    expect(persisted[0].cards[0]).toMatchObject({ id: 'w-session', type: 'next-training' });
    expect(screen.getByText('Próximo entrenamiento')).toBeDefined();
  });

  it('muestra banner de bienvenida a ProTraining si el PF no tiene organizaciones creadas sin redirigir', async () => {
    const { structureService } = await import('../../../api/structureService');
    vi.spyOn(structureService, 'getOrganizations').mockResolvedValue([]);

    render(
      <MemoryRouter initialEntries={['/pf']}>
        <DashboardPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/¡Te damos la bienvenida a ProTraining!/i)).toBeDefined();
      expect(screen.getByRole('button', { name: /\+ Crear Organización/i })).toBeDefined();
    });
  });

  it('no muestra el modal de bienvenida (PfWelcomeModal) si el PF ya cuenta con organizaciones creadas (KAN-621)', async () => {
    const { structureService } = await import('../../../api/structureService');
    vi.spyOn(structureService, 'getOrganizations').mockResolvedValue([
      { id: 'org-1', name: 'Club Pro' } as Organization,
    ]);

    // PF logueado en navegador limpio (sin flag en localStorage)
    localStorage.setItem(
      'protraining_session',
      JSON.stringify({
        accessToken: 'mock-token',
        user: { id: 'usr-pf-1', fullName: 'Entrenador Juan' },
      }),
    );

    render(
      <MemoryRouter initialEntries={['/pf/dashboard']}>
        <DashboardPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Mayor Carga (UA)')).toBeDefined();
    });

    // El modal de bienvenida no debe aparecer porque ya tiene organización
    expect(screen.queryByText(/Primer paso: Creá tu organización deportiva/i)).toBeNull();
  });

  it('muestra el modal de bienvenida (PfWelcomeModal) si el PF no tiene ninguna organización creada (KAN-621)', async () => {
    const { structureService } = await import('../../../api/structureService');
    vi.spyOn(structureService, 'getOrganizations').mockResolvedValue([]);

    localStorage.setItem(
      'protraining_session',
      JSON.stringify({
        accessToken: 'mock-token',
        user: { id: 'usr-pf-nuevo', fullName: 'Entrenador Nuevo' },
      }),
    );

    render(
      <MemoryRouter initialEntries={['/pf/dashboard']}>
        <DashboardPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Primer paso: Creá tu organización deportiva/i)).toBeDefined();
      expect(screen.getByText(/¡Te damos la bienvenida, Entrenador Nuevo!/i)).toBeDefined();
    });
  });

  it('no muestra el modal de bienvenida mientras se están cargando las organizaciones para evitar parpadeos (KAN-621)', async () => {
    const { structureService } = await import('../../../api/structureService');
    let resolveOrgs: (val: Organization[]) => void = () => {};
    const orgsPromise = new Promise<Organization[]>((resolve) => {
      resolveOrgs = resolve;
    });
    vi.spyOn(structureService, 'getOrganizations').mockImplementation(() => orgsPromise);

    localStorage.setItem(
      'protraining_session',
      JSON.stringify({
        accessToken: 'mock-token',
        user: { id: 'usr-pf-loading', fullName: 'Entrenador Loading' },
      }),
    );

    render(
      <MemoryRouter initialEntries={['/pf/dashboard']}>
        <DashboardPage />
      </MemoryRouter>,
    );

    // Mientras la promesa está pendiente, no debe mostrarse el modal
    expect(screen.queryByText(/Primer paso: Creá tu organización deportiva/i)).toBeNull();

    // Cuando se resuelve con 0 organizaciones, entonces sí aparece
    resolveOrgs([]);
    await waitFor(() => {
      expect(screen.getByText(/Primer paso: Creá tu organización deportiva/i)).toBeDefined();
    });
  });
});
