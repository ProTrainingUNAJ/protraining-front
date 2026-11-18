import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TopUaAthletesWidget } from '../TopUaAthletesWidget';
import * as seguimientoService from '../../../api/seguimientoService';
import { structureService } from '../../../api/structureService';

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

describe('TopUaAthletesWidget (KAN-621)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () =>
    render(
      <MemoryRouter>
        <TopUaAthletesWidget />
      </MemoryRouter>,
    );

  it('muestra estado sin cargas cuando no hay atletas con registro de carga hoy', async () => {
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
      expect(screen.getByText('Sin cargas registradas hoy')).toBeDefined();
      expect(screen.getByText('Los atletas aún no registraron minutos o RPE.')).toBeDefined();
    });
  });

  it('renderiza al atleta con mayor UA marcado en verde', async () => {
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
        totalMinutes: 60,
        totalLoad: 300,
      },
    ]);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Lucas Gómez')).toBeDefined();
      expect(screen.getByText('850')).toBeDefined();
      expect(screen.getByText('140 min totales')).toBeDefined();
    });

    const leaderItem = screen.getByTestId('top-ua-leader');
    expect(leaderItem).toBeDefined();
    expect(leaderItem.textContent).toContain('Lucas Gómez');
    expect(leaderItem.textContent).toContain('Mayor Carga');

    // El segundo atleta aparece en el ranking sin el badge de Mayor Carga
    expect(screen.getByText('Joaquín Díaz')).toBeDefined();
    expect(screen.getByText('300')).toBeDefined();
  });

  it('marca a múltiples atletas en verde si empatan en el primer puesto de UA', async () => {
    vi.mocked(seguimientoService.fetchAllCategoriesAttendanceToday).mockResolvedValueOnce([
      {
        athleteId: 'ath-1',
        athleteName: 'Lucas Gómez',
        status: 'Present',
        totalMinutes: 90,
        totalLoad: 500,
      },
      {
        athleteId: 'ath-2',
        athleteName: 'Martín Pérez',
        status: 'Present',
        totalMinutes: 100,
        totalLoad: 500,
      },
    ]);

    renderComponent();

    await waitFor(() => {
      const leaders = screen.getAllByTestId('top-ua-leader');
      expect(leaders.length).toBe(2);
      expect(screen.getByText('2 Líderes')).toBeDefined();
    });
  });

  it('navega a la pestaña de Asistencia & RPE al hacer clic en Ver detalle', async () => {
    vi.mocked(seguimientoService.fetchAllCategoriesAttendanceToday).mockResolvedValueOnce([]);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Ver detalle')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Ver detalle'));
    expect(mockNavigate).toHaveBeenCalledWith('/pf/monitoring?tab=attendance');
  });
});
