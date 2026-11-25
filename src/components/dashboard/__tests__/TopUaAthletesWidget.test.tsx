import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TopUaAthletesWidget } from '../TopUaAthletesWidget';
import * as seguimientoService from '../../../api/seguimientoService';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../../api/structureService', () => ({
  structureService: {
    getAthletePhotoUrl: vi.fn((id: string) => `/api/structure/athletes/${id}/photo`),
  },
}));

vi.mock('../../../api/seguimientoService', async () => {
  const actual = await vi.importActual('../../../api/seguimientoService');
  return {
    ...actual,
    fetchAllCategoriesAttendanceToday: vi.fn(),
  };
});

describe('TopUaAthletesWidget Podio (KAN-621)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () =>
    render(
      <MemoryRouter>
        <TopUaAthletesWidget />
      </MemoryRouter>,
    );

  it('sin cargas hoy muestra un mensaje en lugar de un podio vacío (KAN-594)', async () => {
    vi.mocked(seguimientoService.fetchAllCategoriesAttendanceToday).mockResolvedValueOnce([
      {
        athleteId: 'ath-1',
        athleteName: 'Joaquín Díaz',
        status: 'NoRecord',
        totalMinutes: 0,
        totalLoad: 0,
      },
      {
        athleteId: 'ath-2',
        athleteName: 'Nicolás Herrera',
        status: 'NoRecord',
        totalMinutes: 0,
        totalLoad: 0,
      },
    ]);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('top-ua-empty').textContent).toBe('Sin cargas registradas hoy');
    });

    // Escalones con guiones parecen datos: no se dibujan
    expect(screen.queryByTestId('top-ua-podium')).toBeNull();
    expect(screen.queryByTestId('podium-step-1')).toBeNull();
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('renderiza la foto del líder en el puesto 1 y deja los puestos 2 y 3 vacíos si sólo 1 atleta registró carga', async () => {
    vi.mocked(seguimientoService.fetchAllCategoriesAttendanceToday).mockResolvedValueOnce([
      {
        athleteId: 'ath-lucas',
        athleteName: 'Lucas Gómez',
        status: 'Present',
        totalMinutes: 140,
        totalLoad: 850,
      },
    ]);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('podium-step-1')).toBeDefined();
    });

    const step1 = screen.getByTestId('podium-step-1');
    const step2 = screen.getByTestId('podium-step-2');
    const step3 = screen.getByTestId('podium-step-3');

    // Puesto 1: Contiene la foto de Lucas Gómez y su carga
    expect(step1.textContent).toContain('1');
    expect(step1.textContent).toContain('850 UA');
    expect(screen.getByAltText(/Foto de perfil de Lucas Gómez/i)).toBeDefined();

    // Nombre completo para lectores de pantalla y nombre corto visible (KAN-594)
    const nameEl = screen.getByText('Lucas Gómez');
    expect(nameEl.className).toContain('sr-only');
    expect(screen.getByText('Lucas G.').getAttribute('aria-hidden')).toBe('true');

    // Puestos 2 y 3: No aparece nadie (vacíos)
    expect(step2.textContent).toContain('2');
    expect(step2.textContent).toContain('—');
    expect(step3.textContent).toContain('3');
    expect(step3.textContent).toContain('—');
  });

  it('renderiza el podio completo con fotos para los 3 primeros puestos de UA', async () => {
    vi.mocked(seguimientoService.fetchAllCategoriesAttendanceToday).mockResolvedValueOnce([
      {
        athleteId: 'ath-lucas',
        athleteName: 'Lucas Gómez',
        status: 'Present',
        totalMinutes: 140,
        totalLoad: 850,
      },
      {
        athleteId: 'ath-joaquin',
        athleteName: 'Joaquín Díaz',
        status: 'Present',
        totalMinutes: 90,
        totalLoad: 600,
      },
      {
        athleteId: 'ath-nicolas',
        athleteName: 'Nicolás Herrera',
        status: 'Present',
        totalMinutes: 60,
        totalLoad: 350,
      },
    ]);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('podium-step-1')).toBeDefined();
    });

    const step1 = screen.getByTestId('podium-step-1');
    const step2 = screen.getByTestId('podium-step-2');
    const step3 = screen.getByTestId('podium-step-3');

    expect(step1.textContent).toContain('1');
    expect(step1.textContent).toContain('850 UA');
    expect(step2.textContent).toContain('2');
    expect(step2.textContent).toContain('600 UA');
    expect(step3.textContent).toContain('3');
    expect(step3.textContent).toContain('350 UA');

    // Las 3 fotos están presentes
    expect(screen.getByAltText(/Foto de perfil de Lucas Gómez/i)).toBeDefined();
    expect(screen.getByAltText(/Foto de perfil de Joaquín Díaz/i)).toBeDefined();
    expect(screen.getByAltText(/Foto de perfil de Nicolás Herrera/i)).toBeDefined();
  });

  it('navega a /pf/monitoring?tab=attendance al hacer clic en el widget o en Ver detalle', async () => {
    vi.mocked(seguimientoService.fetchAllCategoriesAttendanceToday).mockResolvedValueOnce([]);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Ver detalle')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Ver detalle'));
    expect(mockNavigate).toHaveBeenCalledWith('/pf/monitoring?tab=attendance', {
      state: { tab: 'attendance' },
    });

    fireEvent.click(screen.getByTestId('top-ua-athletes-widget'));
    expect(mockNavigate).toHaveBeenCalledWith('/pf/monitoring?tab=attendance', {
      state: { tab: 'attendance' },
    });
  });
});
