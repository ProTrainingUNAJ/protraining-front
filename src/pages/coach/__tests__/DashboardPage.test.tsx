import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { DashboardPage } from '../DashboardPage';
import type { Organization } from '../../../types/structure';
import type { AthleteTrafficLightItem } from '../../../components/monitoring/trafficLight.types';
import { fetchCoachTodayOverview } from '../../../api/coachToday';

const { listRecommendationsMock } = vi.hoisted(() => ({
  listRecommendationsMock: vi.fn().mockResolvedValue([]),
}));
vi.mock('../../../api/recommendations', async () => {
  const actual = await vi.importActual<typeof import('../../../api/recommendations')>(
    '../../../api/recommendations',
  );
  return {
    ...actual,
    recommendationsService: {
      ...actual.recommendationsService,
      listRecommendations: listRecommendationsMock,
    },
  };
});

vi.mock('../../../api/structureService', () => ({
  structureService: {
    getOrganizations: vi.fn().mockResolvedValue([{ id: 'org-1', name: 'Club Pro' }]),
    getCategories: vi.fn().mockResolvedValue([{ id: 'cat-1', name: 'Primera' }]),
    getAthletePhotoUrl: vi.fn(),
  },
}));

vi.mock('../../../api/coachToday', () => ({
  fetchCoachTodayOverview: vi.fn().mockResolvedValue({ athletes: [], partial: false }),
}));

// Ficha rápida y ajuste del día se prueban en sus propios tests: acá alcanza con un doble que
// permita aprobar el ajuste.
vi.mock('../../../components/monitoring/AthleteQuickSheet', () => ({
  AthleteQuickSheet: ({ athlete }: { athlete: { name: string } | null }) =>
    athlete ? <div role="dialog">Ficha de {athlete.name}</div> : null,
}));
vi.mock('../../../components/monitoring/DayAdjustmentModal', () => ({
  DayAdjustmentModal: ({
    athleteId,
    athleteName,
    onAdjustmentApplied,
    onClose,
  }: {
    athleteId: string;
    athleteName: string;
    onAdjustmentApplied?: (a: { status: string; athleteId: string }) => void;
    onClose: () => void;
  }) => (
    <div role="dialog" aria-label={`Ajuste del día de ${athleteName}`}>
      <button
        type="button"
        onClick={() => {
          onAdjustmentApplied?.({ status: 'Approved', athleteId });
          onClose();
        }}
      >
        Aprobar ajuste
      </button>
    </div>
  ),
}));

vi.mock('../../../api/seguimientoService', () => ({
  summarizeTrafficLightCounts: (items: { status: string }[]) => ({
    all: items.length,
    red: items.filter((i) => i.status === 'red').length,
    yellow: items.filter((i) => i.status === 'yellow').length,
    green: items.filter((i) => i.status === 'green').length,
    gray: items.filter((i) => i.status === 'gray').length,
  }),
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

  it('pasa un layout guardado con el orden anterior al orden nuevo del Inicio (KAN-594)', async () => {
    const oldLayout = [
      {
        id: 'row-1',
        name: 'Fila 1',
        className: 'wireframe-row-1',
        cards: [{ id: 'w-suite', name: 'ProTraining Suite', colSpan: 1, type: 'suite' }],
      },
    ];
    localStorage.setItem('protraining_bento_rows_coach_v8', JSON.stringify(oldLayout));

    render(
      <MemoryRouter initialEntries={['/pf/dashboard']}>
        <DashboardPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Requieren atención hoy')).toBeDefined();
    });
    expect(screen.queryByText('Gestión Integral de Atletas')).toBeNull();
    expect(localStorage.getItem('protraining_bento_rows_coach_v8')).toBeNull();
    const persisted = JSON.parse(localStorage.getItem('protraining_bento_rows_coach_v9') ?? '[]');
    expect(persisted[0].cards.map((c: { type: string }) => c.type)).toEqual([
      'attention-today',
      'traffic-light-summary',
      'pain-alerts',
    ]);
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

function athlete(overrides: Partial<AthleteTrafficLightItem>): AthleteTrafficLightItem {
  return {
    id: 'ath-x',
    name: 'Atleta',
    position: '',
    category: 'Primera',
    status: 'green',
    statusLabel: '',
    recommendation: '',
    ...overrides,
  };
}

// Plantel del seed de la demo (KAN-479): Diego con dolor en el cuádriceps que su rutina de hoy
// carga, Lucas, Camila y Sofía en amarillo, y tres que no hicieron el check-in.
const DEMO_TEAM: AthleteTrafficLightItem[] = [
  athlete({
    id: 'ath-diego',
    name: 'Diego Ramírez',
    status: 'red',
    pains: [{ zone: 'Cuádriceps derecho', level: 4 }],
    hasDayConflict: true,
  }),
  athlete({ id: 'ath-lucas', name: 'Lucas Fernández', status: 'yellow', sleepHours: 5 }),
  athlete({ id: 'ath-camila', name: 'Camila López', status: 'yellow', rpe: 9 }),
  athlete({ id: 'ath-sofia', name: 'Sofía Martínez', status: 'yellow', isSick: true }),
  athlete({ id: 'ath-martin', name: 'Martín Pérez', status: 'green' }),
  athlete({ id: 'ath-nico', name: 'Nicolás Díaz', status: 'gray' }),
  athlete({ id: 'ath-agus', name: 'Agustina Ruiz', status: 'gray' }),
  athlete({ id: 'ath-tomas', name: 'Tomás Benítez', status: 'gray' }),
];

function renderCoachHome() {
  return render(
    <MemoryRouter initialEntries={['/pf/dashboard']}>
      <DashboardPage />
    </MemoryRouter>,
  );
}

describe('DashboardPage - Requieren atención hoy (KAN-594)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('muestra a los atletas en rojo y amarillo con su motivo, y cuenta a los que no hicieron el check-in', async () => {
    vi.mocked(fetchCoachTodayOverview).mockResolvedValue({ athletes: DEMO_TEAM, partial: false });
    renderCoachHome();

    const panel = await screen.findByRole('region', { name: 'Requieren atención hoy' });
    const scoped = within(panel);
    await waitFor(() => expect(scoped.getByText('Diego Ramírez')).toBeDefined());

    expect(scoped.getByText('Dolor cuádriceps derecho · nivel 4')).toBeDefined();
    expect(scoped.getByText('La rutina de hoy carga esa zona')).toBeDefined();
    expect(
      scoped.getByRole('button', { name: 'Ajustar rutina de hoy de Diego Ramírez' }),
    ).toBeDefined();
    expect(scoped.getByText('Durmió 5 h')).toBeDefined();
    expect(scoped.getByText('Esfuerzo alto · RPE 9')).toBeDefined();
    // Se ven los 3 primeros; el 4.º queda detrás de "Ver 1 más" para no estirar la fila 1
    expect(scoped.queryByText('Enfermedad')).toBeNull();
    const more = scoped.getByRole('button', { name: 'Ver 1 más' });
    expect(more.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(more);
    expect(scoped.getByText('Enfermedad')).toBeDefined();
    expect(scoped.getByRole('button', { name: 'Ver menos' }).getAttribute('aria-expanded')).toBe(
      'true',
    );
    // Solo Diego tiene conflicto con la rutina: los demás tienen "Ver ficha" y nada más
    expect(scoped.getAllByRole('button', { name: /Ajustar rutina/ })).toHaveLength(1);
    // Los que no hicieron el check-in van contados en una línea, no como tarjetas
    expect(scoped.getByText(/Nicolás, Agustina y 1 más/)).toBeDefined();
    expect(scoped.queryByText('Tomás Benítez')).toBeNull();
    expect(screen.getByText(/4 atletas necesitan que los mires antes de entrenar/)).toBeDefined();
  });

  it('aprobar el ajuste del día desde el Inicio saca el botón "Ajustar rutina"', async () => {
    vi.mocked(fetchCoachTodayOverview).mockResolvedValue({ athletes: DEMO_TEAM, partial: false });
    renderCoachHome();

    const panel = await screen.findByRole('region', { name: 'Requieren atención hoy' });
    fireEvent.click(
      await within(panel).findByRole('button', { name: 'Ajustar rutina de hoy de Diego Ramírez' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Aprobar ajuste' }));

    await waitFor(() => {
      expect(within(panel).queryByRole('button', { name: /Ajustar rutina/ })).toBeNull();
    });
    expect(within(panel).getByText('Diego Ramírez')).toBeDefined();
  });

  it('"Ver ficha" abre la ficha rápida del atleta', async () => {
    vi.mocked(fetchCoachTodayOverview).mockResolvedValue({ athletes: DEMO_TEAM, partial: false });
    renderCoachHome();

    fireEvent.click(await screen.findByRole('button', { name: 'Ver ficha de Lucas Fernández' }));
    expect(screen.getByText('Ficha de Lucas Fernández')).toBeDefined();
  });

  it('sin atletas en rojo ni amarillo dice que nadie necesita atención y no muestra alarmas de dolor', async () => {
    vi.mocked(fetchCoachTodayOverview).mockResolvedValue({
      athletes: [athlete({ id: 'a1', name: 'Martín Pérez', status: 'green' })],
      partial: false,
    });
    renderCoachHome();

    expect(await screen.findByText('Nadie necesita atención hoy.')).toBeDefined();
    expect(screen.getByText('Sin dolores reportados hoy.')).toBeDefined();
    expect(screen.queryByText('Molestia crítica')).toBeNull();
  });

  it('si el semáforo no responde, muestra el error con "Reintentar" en lugar de ceros', async () => {
    vi.mocked(fetchCoachTodayOverview)
      .mockRejectedValueOnce(new Error('No se pudo consultar el semáforo del día.'))
      .mockResolvedValue({ athletes: DEMO_TEAM, partial: false });
    renderCoachHome();

    const alerts = await screen.findAllByRole('alert');
    expect(alerts.length).toBeGreaterThanOrEqual(3);
    expect(screen.queryByText('0 %')).toBeNull();
    expect(screen.queryByText('Nadie necesita atención hoy.')).toBeNull();

    fireEvent.click(screen.getAllByRole('button', { name: 'Reintentar' })[0]);
    await waitFor(() => {
      expect(screen.getAllByText('Diego Ramírez').length).toBeGreaterThan(0);
    });
    expect(fetchCoachTodayOverview).toHaveBeenCalledTimes(2);
  });

  it('cada anillo del semáforo dice su color y su cantidad sin pasar el mouse', async () => {
    vi.mocked(fetchCoachTodayOverview).mockResolvedValue({ athletes: DEMO_TEAM, partial: false });
    renderCoachHome();

    const semaforo = await screen.findByRole('region', { name: 'Semáforo del día' });
    await waitFor(() =>
      expect(within(semaforo).getByRole('button', { name: /^Rojo: 1 de 8/ })).toBeDefined(),
    );
    expect(within(semaforo).getByRole('button', { name: /^Amarillo: 3 de 8/ })).toBeDefined();
    expect(within(semaforo).getByRole('button', { name: /^Sin check-in: 3 de 8/ })).toBeDefined();
    expect(within(semaforo).getByText('Verde')).toBeDefined();
    expect(within(semaforo).getByText('Diego Ramírez')).toBeDefined();
  });

  it('con 0 check-ins muestra un estado propio en lugar de anillos en cero', async () => {
    vi.mocked(fetchCoachTodayOverview).mockResolvedValue({
      athletes: [
        athlete({ id: 'g1', name: 'Nicolás Díaz', status: 'gray' }),
        athlete({ id: 'g2', name: 'Agustina Ruiz', status: 'gray' }),
      ],
      partial: false,
    });
    renderCoachHome();

    expect(await screen.findByText('Nadie hizo el check-in todavía')).toBeDefined();
    expect(screen.getByText('0/2 atletas')).toBeDefined();
  });
});

function ShowLocation() {
  const location = useLocation();
  return <p data-testid="location">{location.pathname + location.search}</p>;
}

describe('DashboardPage - banner de recomendaciones pendientes (KAN-481)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('si todas las pendientes son de hábitos, "Revisar" abre directo esa vista', async () => {
    listRecommendationsMock.mockResolvedValue([
      { id: 'r-1', athleteId: 'a-1', type: 'Habits', status: 'Pending', title: 'Hábitos' },
      { id: 'r-2', athleteId: 'a-2', type: 'Habits', status: 'Pending', title: 'Hábitos' },
    ]);
    render(
      <MemoryRouter initialEntries={['/pf/dashboard']}>
        <Routes>
          <Route path="/pf/dashboard" element={<DashboardPage />} />
          <Route path="/pf/recommendations" element={<ShowLocation />} />
        </Routes>
      </MemoryRouter>,
    );

    const banner = await screen.findByRole('region', {
      name: 'Recomendaciones pendientes de revisión',
    });
    fireEvent.click(within(banner).getByRole('button'));

    expect(screen.getByTestId('location').textContent).toBe('/pf/recommendations?view=habits');
  });
});
