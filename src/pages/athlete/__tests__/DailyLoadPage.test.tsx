import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DailyLoadPage } from '../DailyLoadPage';
import * as seguimientoService from '../../../api/seguimientoService';
import { structureService } from '../../../api/structureService';
import * as athleteDashboardLayout from '../../../utils/athleteDashboardLayout';

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

describe('DailyLoadPage (KAN-626)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    window.localStorage.setItem('protraining_athlete_me_user-1', 'ath-123');

    vi.mocked(structureService.getMe).mockResolvedValue({
      id: 'user-1',
      athleteId: 'ath-123',
    } as never);

    vi.mocked(seguimientoService.getAthleteWeek).mockResolvedValue({
      weekStart: '2026-11-16',
      weekEnd: '2026-11-22',
      completedDays: ['2026-11-16'],
      days: [
        { date: '2026-11-16', dayOfWeek: 'Monday', completed: true },
        { date: '2026-11-17', dayOfWeek: 'Tuesday', completed: false },
        { date: '2026-11-18', dayOfWeek: 'Wednesday', completed: false },
        { date: '2026-11-19', dayOfWeek: 'Thursday', completed: false },
        { date: '2026-11-20', dayOfWeek: 'Friday', completed: false },
        { date: '2026-11-21', dayOfWeek: 'Saturday', completed: false },
        { date: '2026-11-22', dayOfWeek: 'Sunday', completed: false },
      ],
    });

    vi.mocked(seguimientoService.getDailyLoad).mockResolvedValue({
      date: '2026-11-21',
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

  it('AC01 · renderiza el resumen semanal simplificado con "X de 7 días con actividad" e indicadores de días', async () => {
    renderComponent();

    expect(screen.getByRole('heading', { level: 1, name: /Carga del día/i })).toBeDefined();

    await waitFor(() => {
      expect(screen.getAllByText(/1 de 7 días con actividad/i).length).toBeGreaterThan(0);
    });

    // Days strip
    expect(screen.getByLabelText('Lun: completado')).toBeDefined();
    expect(screen.getByLabelText('Mar: pendiente')).toBeDefined();
  });

  it('AC02 · muestra el listado cronológico de actividades registradas hoy con minutos, RPE y UA calculada', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Gimnasio')).toBeDefined();
    });

    expect(screen.getAllByText('60 min').length).toBeGreaterThan(0);
    expect(screen.getByText(/RPE 7/i)).toBeDefined();
    expect(screen.getAllByText('420 UA').length).toBeGreaterThan(0);
    expect(screen.getByText('Total minutos de hoy')).toBeDefined();
  });

  it('AC02 (partidos) · identifica claramente Partido 1 y Partido 2 en el listado cuando ambos están registrados', async () => {
    vi.mocked(seguimientoService.getDailyLoad).mockResolvedValueOnce({
      date: '2026-11-21',
      message: 'Carga obtenida',
      totalMinutes: 135,
      totalLoad: 1140,
      gym: { minutes: 0, rpe: null },
      sportTraining: { minutes: 0, rpe: null },
      match1: { minutes: 90, rpe: 9 },
      match2: { minutes: 45, rpe: 7 },
      individualWork: { minutes: 0, rpe: null },
    });

    renderComponent();

    await waitFor(() => {
      const matchTitles = screen.getAllByText('Partido');
      expect(matchTitles.length).toBe(2);
    });

    expect(screen.getByText('Partido 1')).toBeDefined();
    expect(screen.getByText('Partido 2')).toBeDefined();
    expect(screen.getByText('90 min')).toBeDefined();
    expect(screen.getByText('45 min')).toBeDefined();
  });

  it('AC03 · muestra el empty state cuando no hay actividades hoy con invitación a agregar', async () => {
    vi.mocked(seguimientoService.getDailyLoad).mockResolvedValueOnce({
      date: '2026-11-21',
      message: 'Sin actividades',
      totalMinutes: 0,
      totalLoad: 0,
      gym: { minutes: 0, rpe: null },
      sportTraining: { minutes: 0, rpe: null },
      match1: { minutes: 0, rpe: null },
      match2: { minutes: 0, rpe: null },
      individualWork: { minutes: 0, rpe: null },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Todavía no registraste actividades hoy')).toBeDefined();
    });

    expect(
      screen.getByText(
        /Registrá los minutos y el nivel de esfuerzo de tus entrenamientos o partidos del día/i,
      ),
    ).toBeDefined();

    // CTA button in empty state
    const addBtns = screen.getAllByRole('button', { name: /Agregar actividad/i });
    expect(addBtns.length).toBeGreaterThan(0);
  });

  it('AC04 & AC05 · presionar "+ Agregar actividad" abre el modal con opciones unificadas (incluyendo subselector para Partido)', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Gimnasio')).toBeDefined();
    });

    fireEvent.click(screen.getAllByRole('button', { name: /Agregar actividad/i })[0]);

    // Modal is open
    expect(screen.getByRole('heading', { name: /Registrar actividad/i })).toBeDefined();
    expect(screen.getByRole('radio', { name: /Gimnasio/i })).toBeDefined();
    expect(screen.getByRole('radio', { name: /Entrenamiento deportivo/i })).toBeDefined();
    expect(screen.getByRole('radio', { name: /Partido/i })).toBeDefined();
    expect(screen.getByRole('radio', { name: /Trabajo individual/i })).toBeDefined();

    // Select "Partido"
    const matchRadio = screen.getByRole('radio', { name: /Partido/i });
    fireEvent.click(matchRadio);

    // Subselector appears to identify Partido 1 vs Partido 2
    expect(screen.getByText('Identificar partido:')).toBeDefined();
    expect(screen.getByRole('radio', { name: /Partido 1/i })).toBeDefined();
    expect(screen.getByRole('radio', { name: /Partido 2/i })).toBeDefined();
  });

  it('AC06 & AC07 · permite cargar minutos con atajos rápidos, seleccionar RPE y envía payload preservando otras actividades', async () => {
    vi.mocked(seguimientoService.submitDailyLoad).mockResolvedValueOnce({
      date: '2026-11-21',
      message: 'Carga guardada',
      totalMinutes: 120,
      totalLoad: 900,
      gym: { minutes: 60, rpe: 7 }, // Existing
      sportTraining: { minutes: 60, rpe: 8 }, // Newly added
      match1: { minutes: 0, rpe: null },
      match2: { minutes: 0, rpe: null },
      individualWork: { minutes: 0, rpe: null },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Gimnasio')).toBeDefined();
    });

    fireEvent.click(screen.getAllByRole('button', { name: /Agregar actividad/i })[0]);

    // Select Sport Training
    fireEvent.click(screen.getByRole('radio', { name: /Entrenamiento deportivo/i }));

    // Use 60m quick preset
    fireEvent.click(screen.getByRole('button', { name: '60m' }));

    // Select RPE level 8
    fireEvent.click(screen.getByRole('button', { name: 'Nivel 8' }));

    // Live preview of Foster Load
    expect(screen.getByText('480 UA')).toBeDefined();
    expect(screen.getByText(/(60 min × RPE 8)/i)).toBeDefined();

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /Guardar actividad/i }));

    await waitFor(() => {
      expect(seguimientoService.submitDailyLoad).toHaveBeenCalledWith(
        'ath-123',
        expect.objectContaining({
          gym: { minutes: 60, rpe: 7 }, // Preserved
          sportTraining: { minutes: 60, rpe: 8 }, // Added
        }),
      );
    });
  });

  it('AC08 · al presionar "Editar" en una actividad se abre el modal precargado con sus valores', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Editar Gimnasio/i })).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /Editar Gimnasio/i }));

    // Modal title indicates edition
    expect(screen.getByRole('heading', { name: /Editar actividad/i })).toBeDefined();

    // Preloaded values
    const minutesInput = screen.getByLabelText(/Minutos dedicados/i) as HTMLInputElement;
    expect(minutesInput.value).toBe('60');
    expect(screen.getByText('Nivel 7')).toBeDefined();
  });

  it('AC09 · validación: no permite guardar si los minutos son 0 o falta el RPE', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Gimnasio')).toBeDefined();
    });

    fireEvent.click(screen.getAllByRole('button', { name: /Agregar actividad/i })[0]);

    // Select Sport Training (0 minutes initially)
    fireEvent.click(screen.getByRole('radio', { name: /Entrenamiento deportivo/i }));

    // Click save with 0 minutes
    fireEvent.click(screen.getByRole('button', { name: /Guardar actividad/i }));

    expect(screen.getByText('Debe ingresar minutos mayores a 0 para registrar.')).toBeDefined();
    expect(seguimientoService.submitDailyLoad).not.toHaveBeenCalled();
  });

  it('AC10 · permite eliminar una actividad y actualiza la carga del día en el backend', async () => {
    vi.mocked(seguimientoService.submitDailyLoad).mockResolvedValueOnce({
      date: '2026-11-21',
      message: 'Carga actualizada',
      totalMinutes: 0,
      totalLoad: 0,
      gym: { minutes: 0, rpe: null },
      sportTraining: { minutes: 0, rpe: null },
      match1: { minutes: 0, rpe: null },
      match2: { minutes: 0, rpe: null },
      individualWork: { minutes: 0, rpe: null },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Eliminar Gimnasio/i })).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /Eliminar Gimnasio/i }));

    await waitFor(() => {
      expect(seguimientoService.submitDailyLoad).toHaveBeenCalledWith(
        'ath-123',
        expect.objectContaining({
          gym: { minutes: 0, rpe: null },
        }),
      );
    });
  });

  it('Home Widget Pinning · permite fijar el widget en el inicio y muestra advertencia si no hay lugar', async () => {
    vi.spyOn(athleteDashboardLayout, 'pinDailyLoadWidget').mockReturnValue(false);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Fijar en mi inicio/i })).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /Fijar en mi inicio/i }));

    await waitFor(() => {
      expect(
        screen.getByText('No hay lugar libre en tu inicio: quitá una tarjeta primero'),
      ).toBeDefined();
    });
  });
});
