import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DailyLoadPage } from '../DailyLoadPage';
import * as seguimientoService from '../../../api/seguimientoService';
import { structureService } from '../../../api/structureService';

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'atleta@protraining.com', role: 'Atleta' },
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
    submitDailyLoad: vi.fn(),
    getDailyLoad: vi.fn(),
    getAthleteWeek: vi.fn(),
  };
});

describe('DailyLoadPage (KAN-571)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();

    vi.mocked(structureService.getMe).mockResolvedValue({
      id: 'user-1',
      athleteId: 'ath-123',
    } as never);

    vi.mocked(seguimientoService.getAthleteWeek).mockResolvedValue({
      weekStart: '2026-11-09',
      weekEnd: '2026-11-15',
      completedDays: ['2026-11-09'],
      days: [
        { date: '2026-11-09', dayOfWeek: 'Monday', completed: true },
        { date: '2026-11-10', dayOfWeek: 'Tuesday', completed: false },
        { date: '2026-11-11', dayOfWeek: 'Wednesday', completed: false },
        { date: '2026-11-12', dayOfWeek: 'Thursday', completed: false },
        { date: '2026-11-13', dayOfWeek: 'Friday', completed: false },
        { date: '2026-11-14', dayOfWeek: 'Saturday', completed: false },
        { date: '2026-11-15', dayOfWeek: 'Sunday', completed: false },
      ],
    });

    vi.mocked(seguimientoService.getDailyLoad).mockResolvedValue({
      date: '2026-11-09',
      message: 'Carga obtenida',
      totalMinutes: 60,
      totalLoad: 420,
      gym: { minutes: 60, rpe: 7 },
      sportTraining: { minutes: 0, rpe: null },
      match1: { minutes: 0, rpe: null },
      match2: { minutes: 0, rpe: null },
      individualWork: { minutes: 0, rpe: null },
    });
  });

  const renderComponent = () =>
    render(
      <MemoryRouter>
        <DailyLoadPage />
      </MemoryRouter>,
    );

  it('renderiza la estructura estándar del AppShell con PageHeader', async () => {
    const { container } = renderComponent();

    expect(container.querySelector('.app-page-container')).toBeDefined();
    expect(screen.getByRole('heading', { level: 1, name: /Carga del día/i })).toBeDefined();
    expect(screen.getByText('Registrá minutos y RPE por actividad')).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('Tu semana')).toBeDefined();
    });
  });

  it('permite cambiar entre los chips de actividad y actualiza la tarjeta', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: 'Gimnasio' })).toBeDefined();
    });

    const sportChip = screen.getByRole('button', { name: 'Entrenamiento del deporte' });
    fireEvent.click(sportChip);

    expect(
      screen.getByRole('heading', { level: 2, name: 'Entrenamiento del deporte' }),
    ).toBeDefined();
  });

  it('valida que no se envíen minutos 0 y RPE vacío', async () => {
    vi.mocked(seguimientoService.getDailyLoad).mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 404 },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Guardar carga/i })).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /Guardar carga/i }));

    expect(screen.getByText('Debe ingresar minutos mayores a 0 para registrar.')).toBeDefined();
    expect(seguimientoService.submitDailyLoad).not.toHaveBeenCalled();
  });

  it('registra la actividad con éxito y muestra la pantalla de confirmación', async () => {
    vi.mocked(seguimientoService.submitDailyLoad).mockResolvedValueOnce({
      date: '2026-11-09',
      message: 'Carga registrada exitosamente.',
      totalMinutes: 90,
      totalLoad: 630,
      gym: { minutes: 90, rpe: 7 },
      sportTraining: { minutes: 0, rpe: null },
      match1: { minutes: 0, rpe: null },
      match2: { minutes: 0, rpe: null },
      individualWork: { minutes: 0, rpe: null },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByLabelText(/Minutos/i)).toBeDefined();
    });

    fireEvent.change(screen.getByLabelText(/Minutos/i), { target: { value: '90' } });
    fireEvent.change(screen.getByLabelText(/RPE/i), { target: { value: '7' } });

    fireEvent.click(screen.getByRole('button', { name: /Guardar carga/i }));

    await waitFor(() => {
      expect(screen.getByText('¡Carga registrada!')).toBeDefined();
    });
    expect(screen.getByText('Carga del día: 630')).toBeDefined();
    expect(screen.getByRole('button', { name: /Registrar otra actividad/i })).toBeDefined();
  });

  it('permite cambiar a la pestaña "Ver carga de hoy" y visualiza el resumen y tarjetas', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Ver carga de hoy/i })).toBeDefined();
    });

    fireEvent.click(screen.getByRole('tab', { name: /Ver carga de hoy/i }));

    await waitFor(() => {
      expect(screen.getByText(/Total minutos · 2026-11-09/i)).toBeDefined();
    });
    expect(screen.getByText('Carga del día (minutos × RPE)')).toBeDefined();
    expect(screen.getByText('60 min · RPE 7')).toBeDefined();
  });

  it('muestra estado vacío si el backend devuelve 404 en "Ver carga de hoy"', async () => {
    vi.mocked(seguimientoService.getDailyLoad).mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 404 },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Ver carga de hoy/i })).toBeDefined();
    });

    fireEvent.click(screen.getByRole('tab', { name: /Ver carga de hoy/i }));

    await waitFor(() => {
      expect(screen.getByText('Aún no registraste carga hoy')).toBeDefined();
    });
    expect(screen.getByRole('button', { name: /Ir a registrar/i })).toBeDefined();
  });
});
