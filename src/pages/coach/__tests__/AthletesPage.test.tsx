import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AthletesPage } from '../AthletesPage';
import { structureService } from '../../../api/structureService';
import type { Athlete, Category, Organization } from '../../../types/structure';

vi.mock('../../../api/structureService', () => ({
  structureService: {
    getAthletes: vi.fn(),
    getOrganizations: vi.fn(),
    getCategories: vi.fn(),
    withCategories: vi.fn(),
    getAthletePhotoUrl: vi.fn(),
    updateAthleteStatus: vi.fn(),
    updateAthleteEmail: vi.fn(),
    updateAthletePhone: vi.fn(),
  },
}));

vi.mock('../../../api/authService', () => ({
  authService: {
    resetAthletePassword: vi.fn(),
  },
}));

describe('AthletesPage · Modernización de Atletas (KAN-609)', () => {
  const mockAthletes = [
    {
      id: 'ath-1',
      firstName: 'Joaquín',
      lastName: 'Díaz',
      fullName: 'Joaquín Díaz',
      email: 'joaquin@protraining.com',
      phone: '1150000001',
      active: true,
      hasPhoto: false,
      categories: [
        {
          id: 'cat-1',
          name: 'Primera División',
          organizationId: 'org-1',
          organizationName: 'Club Demo',
        },
      ],
    },
    {
      id: 'ath-2',
      firstName: 'Lucas',
      lastName: 'Gómez',
      fullName: 'Lucas Gómez',
      email: 'lucas@protraining.com',
      phone: '1150000002',
      active: true,
      hasPhoto: false,
      categories: [
        {
          id: 'cat-1',
          name: 'Primera División',
          organizationId: 'org-1',
          organizationName: 'Club Demo',
        },
      ],
    },
  ];

  const mockOrgs = [
    {
      id: 'org-1',
      name: 'Club Demo',
      description: 'Club deportivo',
      categoriesCount: 1,
    },
  ];

  const mockCategories = [
    {
      id: 'cat-1',
      organizationId: 'org-1',
      name: 'Primera División',
      athletesCount: 2,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(structureService.getAthletes).mockResolvedValue(mockAthletes as unknown as Athlete[]);
    vi.mocked(structureService.getOrganizations).mockResolvedValue(
      mockOrgs as unknown as Organization[],
    );
    vi.mocked(structureService.getCategories).mockResolvedValue(
      mockCategories as unknown as Category[],
    );
    vi.mocked(structureService.withCategories).mockResolvedValue(
      mockAthletes as unknown as Athlete[],
    );
  });

  it('renderiza el encabezado con el nuevo subtítulo oficial', async () => {
    render(
      <MemoryRouter>
        <AthletesPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Joaquín Díaz')).toBeTruthy();
    });

    expect(
      screen.getByText('Plantel deportivo, métricas, salud y otras configuraciones.'),
    ).toBeDefined();
  });

  it('muestra el logo de la organización junto a Activo y las categorías limpias en la tarjeta', async () => {
    render(
      <MemoryRouter>
        <AthletesPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getAllByLabelText('Logo de Club Demo')).toHaveLength(2);
      expect(screen.getAllByText('Primera División')).toHaveLength(3); // 2 en tarjetas de atletas + 1 en select de filtro
    });
  });

  it('ofrece exactamente los 4 botones homogéneos en cada tarjeta de atleta', async () => {
    render(
      <MemoryRouter>
        <AthletesPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('metrics-btn-ath-1')).toBeDefined();
      expect(screen.getByTestId('health-btn-ath-1')).toBeDefined();
      expect(screen.getByTestId('settings-btn-ath-1')).toBeDefined();
    });

    expect(screen.getAllByRole('button', { name: /Categorías/i })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: /Métricas/i })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: /Salud/i })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: /Configuración/i })).toHaveLength(2);
  });

  it('abre el modal unificado de Métricas al hacer clic en Métricas', async () => {
    render(
      <MemoryRouter>
        <AthletesPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('metrics-btn-ath-1')).toBeDefined();
    });

    fireEvent.click(screen.getByTestId('metrics-btn-ath-1'));

    expect(screen.getByText(/Métricas de Progreso · Joaquín Díaz/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Récords \(1RM\)/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Evolución Temporal/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Benchmark Grupal/i })).toBeDefined();
  });

  it('abre el modal unificado de Salud al hacer clic en Salud', async () => {
    render(
      <MemoryRouter>
        <AthletesPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('health-btn-ath-1')).toBeDefined();
    });

    fireEvent.click(screen.getByTestId('health-btn-ath-1'));

    expect(screen.getByText(/Salud y Ficha Médica · Joaquín Díaz/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Historial de Lesiones/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Ficha Médica & Apto Físico/i })).toBeDefined();

    // Cambiar a pestaña de Ficha Médica
    fireEvent.click(screen.getByRole('button', { name: /Ficha Médica & Apto Físico/i }));
    expect(screen.getByText(/Motivo de la consulta médica \*/i)).toBeDefined();
    expect(screen.queryByText(/Seleccioná un motivo frecuente/i)).toBeNull();
  });

  it('abre el modal unificado de Configuración al hacer clic en Configuración', async () => {
    render(
      <MemoryRouter>
        <AthletesPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('settings-btn-ath-1')).toBeDefined();
    });

    fireEvent.click(screen.getByTestId('settings-btn-ath-1'));

    expect(screen.getByText(/Configuración · Joaquín Díaz/i)).toBeDefined();
    expect(screen.getByRole('heading', { name: /Foto de Perfil/i })).toBeDefined();
    expect(screen.getByText('Subí una fotografía del atleta.')).toBeDefined();
    expect(screen.queryByText(/formato WebP para máximo rendimiento/i)).toBeNull();
    expect(screen.getByText(/Correo Electrónico \(Email\)/i)).toBeDefined();
    expect(screen.getByText(/Número de Teléfono \(Contacto\)/i)).toBeDefined();
    expect(screen.getByText(/Seguridad y Contraseña/i)).toBeDefined();
    expect(screen.getByText(/Estado de la Cuenta: Activo/i)).toBeDefined();
  });

  it('el avatar del atleta no es interactivo y solo se cambia foto desde Configuración (KAN-512)', async () => {
    render(
      <MemoryRouter>
        <AthletesPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Joaquín Díaz')).toBeTruthy();
    });

    expect(screen.queryByTitle('Subir o cambiar foto de perfil')).toBeNull();
  });

  it('el buscador tiene nombre accesible y filtra por nombre (KAN-594)', async () => {
    render(
      <MemoryRouter>
        <AthletesPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Joaquín Díaz')).toBeTruthy();
    });

    const search = screen.getByRole('searchbox', { name: 'Buscar atleta' });
    fireEvent.change(search, { target: { value: 'Lucas' } });

    await waitFor(() => {
      expect(screen.getByText('Lucas Gómez')).toBeDefined();
      expect(screen.queryByText('Joaquín Díaz')).toBeNull();
    });
  });

  it('aplica jerarquía visual diferenciada para Salud/Lesiones, Métricas/Evolución y acciones neutras (KAN-596)', async () => {
    const athletesWithInjury = [
      { ...mockAthletes[0], activeInjuriesCount: 2 },
      { ...mockAthletes[1], activeInjuriesCount: 0 },
    ];
    vi.mocked(structureService.withCategories).mockResolvedValueOnce(
      athletesWithInjury as unknown as Athlete[],
    );

    render(
      <MemoryRouter>
        <AthletesPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('health-btn-ath-1')).toBeDefined();
    });

    const healthWithInjury = screen.getByTestId('health-btn-ath-1');
    const healthWithoutInjury = screen.getByTestId('health-btn-ath-2');
    const metricsBtn = screen.getByTestId('metrics-btn-ath-1');
    const settingsBtn = screen.getByTestId('settings-btn-ath-1');
    const categoriesBtns = screen.getAllByRole('button', { name: /Categorías/i });

    expect(healthWithInjury.className).toContain('athlete-action--injuries');
    expect(healthWithInjury.className).toContain('athlete-action--active-injury');
    expect(healthWithInjury.textContent).toContain('Activa');
    expect(healthWithInjury.getAttribute('aria-label')).toContain('lesión activa (2)');

    expect(healthWithoutInjury.className).toContain('athlete-action--injuries');
    expect(healthWithoutInjury.className).not.toContain('athlete-action--active-injury');
    expect(healthWithoutInjury.textContent).not.toContain('Activa');

    expect(metricsBtn.className).toContain('athlete-action--evolution');
    expect(settingsBtn.className).toContain('btn-secondary');
    expect(settingsBtn.className).toContain('athlete-action--secondary');
    expect(categoriesBtns[0].className).toContain('btn-secondary');
    expect(categoriesBtns[0].className).toContain('athlete-action--secondary');
  });

  describe('atletas inactivos (KAN-660)', () => {
    const withInactive = [
      ...mockAthletes,
      {
        ...mockAthletes[1],
        id: 'ath-3',
        firstName: 'Ramiro',
        lastName: 'Paz',
        fullName: 'Ramiro Paz',
        email: 'ramiro@protraining.com',
        active: false,
      },
    ];

    beforeEach(() => {
      vi.mocked(structureService.getAthletes).mockResolvedValue(
        withInactive as unknown as Athlete[],
      );
      vi.mocked(structureService.withCategories).mockResolvedValue(
        withInactive as unknown as Athlete[],
      );
    });

    it('marca al inactivo con badge "Inactivo" y la tarjeta atenuada', async () => {
      render(
        <MemoryRouter>
          <AthletesPage />
        </MemoryRouter>,
      );

      const card = await screen.findByTestId('athlete-card-ath-3');
      expect(card.className).toContain('athletes-card--inactive');
      expect(card.textContent).toContain('Inactivo');
      expect(card.textContent).not.toContain('Activo ');
      expect(screen.getByTestId('athlete-card-ath-1').className).not.toContain(
        'athletes-card--inactive',
      );
    });

    it('"Solo activos" oculta a los inactivos y actualiza el conteo', async () => {
      render(
        <MemoryRouter>
          <AthletesPage />
        </MemoryRouter>,
      );

      expect(await screen.findByText('Ramiro Paz')).toBeDefined();
      expect(screen.getByTestId('athletes-count').textContent).toBe('3 atletas');

      fireEvent.click(screen.getByRole('checkbox', { name: 'Solo activos' }));

      await waitFor(() => {
        expect(screen.queryByText('Ramiro Paz')).toBeNull();
      });
      expect(screen.getByText('Joaquín Díaz')).toBeDefined();
      expect(screen.getByTestId('athletes-count').textContent).toBe('2 de 3 atletas');
    });

    it('renderiza las 4 acciones del atleta con etiquetas responsivas para una sola fila (KAN-660)', async () => {
      render(
        <MemoryRouter>
          <AthletesPage />
        </MemoryRouter>,
      );

      await screen.findByText('Joaquín Díaz');
      const card = screen.getByTestId('athlete-card-ath-1');
      const actionsContainer = card.querySelector('.athletes-card-actions');
      expect(actionsContainer).not.toBeNull();

      const buttons = actionsContainer?.querySelectorAll('button');
      expect(buttons?.length).toBe(4);

      // Botón 1: Categorías
      expect(buttons?.[0].textContent).toContain('Categorías');
      // Botón 2: Métricas
      expect(buttons?.[1].textContent).toContain('Métricas');
      // Botón 3: Salud
      expect(buttons?.[2].textContent).toContain('Salud');
      // Botón 4: Configuración con versión compacta "Config" para mobile
      expect(buttons?.[3].textContent).toContain('Configuración');
      expect(buttons?.[3].textContent).toContain('Config');
      expect(buttons?.[3].querySelector('.athlete-action-label-full')?.textContent).toBe(
        'Configuración',
      );
      expect(buttons?.[3].querySelector('.athlete-action-label-short')?.textContent).toBe('Config');
    });
  });
});
