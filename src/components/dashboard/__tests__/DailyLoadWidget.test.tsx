import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DailyLoadWidget } from '../DailyLoadWidget';
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

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-ath-1', email: 'atleta@protraining.com', role: 'Atleta' },
    isAuthenticated: true,
  }),
}));

vi.mock('../../../api/structureService', () => ({
  structureService: {
    getMe: vi.fn(),
  },
}));

vi.mock('../../../api/seguimientoService', async () => {
  const actual = await vi.importActual('../../../api/seguimientoService');
  return {
    ...actual,
    getDailyLoad: vi.fn(),
  };
});

describe('DailyLoadWidget (KAN-571)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    vi.mocked(structureService.getMe).mockResolvedValue({
      id: 'user-ath-1',
      athleteId: 'ath-1',
    } as never);
  });

  const renderComponent = () =>
    render(
      <MemoryRouter>
        <DailyLoadWidget />
      </MemoryRouter>,
    );

  it('muestra estado vacío cuando el atleta aún no registró carga hoy', async () => {
    vi.mocked(seguimientoService.getDailyLoad).mockResolvedValueOnce(null);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Aún no registraste carga hoy')).toBeDefined();
    });

    expect(screen.getByText('Pendiente hoy')).toBeDefined();
    const btnRegister = screen.getByRole('button', { name: /Registrar carga de hoy/i });
    expect(btnRegister).toBeDefined();

    fireEvent.click(btnRegister);
    expect(mockNavigate).toHaveBeenCalledWith('/athlete/daily-load');
  });

  it('muestra las métricas totales y chips de actividades cuando hay carga registrada', async () => {
    vi.mocked(seguimientoService.getDailyLoad).mockResolvedValueOnce({
      date: '2026-11-09',
      message: 'Carga obtenida',
      totalMinutes: 152,
      totalLoad: 398,
      gym: { minutes: 30, rpe: 5 },
      sportTraining: { minutes: 2, rpe: 4 },
      match1: { minutes: 0, rpe: null },
      match2: { minutes: 0, rpe: null },
      individualWork: { minutes: 120, rpe: 2 },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('152')).toBeDefined();
    });

    expect(screen.getByText('398')).toBeDefined();
    expect(screen.getByText('Hoy · Registrada')).toBeDefined();
    expect(screen.getByText(/Gimnasio:/i)).toBeDefined();
    expect(screen.getByText(/30m/i)).toBeDefined();
    expect(screen.getByText(/Deporte:/i)).toBeDefined();
    expect(screen.getByText(/2m/i)).toBeDefined();

    const btnDetail = screen.getByRole('button', { name: /Ver detalle o actualizar/i });
    fireEvent.click(btnDetail);
    expect(mockNavigate).toHaveBeenCalledWith('/athlete/daily-load');
  });
});

