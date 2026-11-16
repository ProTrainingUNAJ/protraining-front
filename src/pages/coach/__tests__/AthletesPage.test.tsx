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
    vi.mocked(structureService.getOrganizations).mockResolvedValue(mockOrgs as unknown as Organization[]);
    vi.mocked(structureService.getCategories).mockResolvedValue(mockCategories as unknown as Category[]);
    vi.mocked(structureService.withCategories).mockResolvedValue(mockAthletes as unknown as Athlete[]);
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

  it('muestra la organización y categoría en la tarjeta del atleta de forma homogénea', async () => {
    render(
      <MemoryRouter>
        <AthletesPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getAllByText('Club Demo')).toHaveLength(2);
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
    expect(screen.getByText(/Correo Electrónico \(Email\)/i)).toBeDefined();
    expect(screen.getByText(/Seguridad y Contraseña/i)).toBeDefined();
    expect(screen.getByText(/Estado de la Cuenta: Activo/i)).toBeDefined();
  });
});
