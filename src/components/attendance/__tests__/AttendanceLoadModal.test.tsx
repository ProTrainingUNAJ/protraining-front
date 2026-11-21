import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AttendanceLoadModal } from '../AttendanceLoadModal';
import { submitDailyLoad } from '../../../api/seguimientoService';

vi.mock('../../../api/seguimientoService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../api/seguimientoService')>();
  return {
    ...actual,
    submitDailyLoad: vi.fn(),
  };
});

describe('AttendanceLoadModal (KAN-621)', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('no renderiza nada si isOpen es false', () => {
    const { container } = render(
      <AttendanceLoadModal
        isOpen={false}
        onClose={mockOnClose}
        athleteId="ath-1"
        athleteName="Lucas Gómez"
        onSuccess={mockOnSuccess}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it('renderiza título, nombre del atleta, selector de actividad y método Foster', () => {
    render(
      <AttendanceLoadModal
        isOpen={true}
        onClose={mockOnClose}
        athleteId="ath-1"
        athleteName="Lucas Gómez"
        onSuccess={mockOnSuccess}
      />,
    );

    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByText(/Carga de Entrenamiento/i)).toBeDefined();
    expect(screen.getByText('Lucas Gómez')).toBeDefined();
    const select = screen.getByLabelText(/Tipo de Actividad/i) as HTMLSelectElement;
    expect(select).toBeDefined();
    expect(screen.getByRole('option', { name: /Gimnasio/i })).toBeDefined();
    expect(screen.getByRole('option', { name: /Campo/i })).toBeDefined();
    expect(screen.getByRole('option', { name: /Partido/i })).toBeDefined();
    expect(screen.getByRole('option', { name: /Individual/i })).toBeDefined();
    expect(screen.getByRole('progressbar', { name: /Carga acumulada en el día/i })).toBeDefined();
    expect(screen.getByText(/Método Foster:/i)).toBeDefined();
  });

  it('calcula en tiempo real las Unidades Arbitrarias (UA = Minutos × RPE)', () => {
    render(
      <AttendanceLoadModal
        isOpen={true}
        onClose={mockOnClose}
        athleteId="ath-1"
        athleteName="Lucas Gómez"
        onSuccess={mockOnSuccess}
      />,
    );

    const minutesInput = screen.getByLabelText(/Duración de la sesión/i);
    const rpeSlider = screen.getByLabelText(/Esfuerzo Percibido/i);

    // Ingresar 60 minutos y RPE 7 -> 60 * 7 = 420 UA
    fireEvent.change(minutesInput, { target: { value: '60' } });
    fireEvent.change(rpeSlider, { target: { value: '7' } });

    expect(screen.getByText(/60 min × 7 RPE =/i)).toBeDefined();
    expect(screen.getAllByText(/420 UA/i).length).toBeGreaterThan(0);
  });

  it('los chips de incremento rápido fijan y suman minutos correctamente', () => {
    render(
      <AttendanceLoadModal
        isOpen={true}
        onClose={mockOnClose}
        athleteId="ath-1"
        athleteName="Lucas Gómez"
        onSuccess={mockOnSuccess}
      />,
    );

    const input = screen.getByLabelText(/Duración de la sesión/i) as HTMLInputElement;

    // Tocar chip "60 min"
    fireEvent.click(screen.getByRole('button', { name: '60 min' }));
    expect(input.value).toBe('60');

    // Tocar "+15 min" -> pasa a 75 min
    fireEvent.click(screen.getByRole('button', { name: '+15 min' }));
    expect(input.value).toBe('75');
  });

  it('impide guardar si no hay minutos cargados', async () => {
    render(
      <AttendanceLoadModal
        isOpen={true}
        onClose={mockOnClose}
        athleteId="ath-1"
        athleteName="Lucas Gómez"
        onSuccess={mockOnSuccess}
      />,
    );

    // Botón deshabilitado por tener 0 minutos
    const submitBtn = screen.getByRole('button', { name: /Guardar Carga/i });
    expect(submitBtn.hasAttribute('disabled')).toBe(true);
  });

  it('guarda exitosamente mediante submitDailyLoad y llama a onSuccess', async () => {
    vi.mocked(submitDailyLoad).mockResolvedValue({
      message: 'Carga registrada',
      totalMinutes: 60,
      totalLoad: 420,
      date: '2026-11-16',
      gym: { minutes: 60, rpe: 7 },
      sportTraining: { minutes: 0, rpe: null },
      match1: { minutes: 0, rpe: null },
      match2: { minutes: 0, rpe: null },
      individualWork: { minutes: 0, rpe: null },
    });

    render(
      <AttendanceLoadModal
        isOpen={true}
        onClose={mockOnClose}
        athleteId="ath-1"
        athleteName="Lucas Gómez"
        onSuccess={mockOnSuccess}
      />,
    );

    // Cargar 60 minutos
    fireEvent.click(screen.getByRole('button', { name: '60 min' }));

    const submitBtn = screen.getByRole('button', { name: /Guardar Carga/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(submitDailyLoad).toHaveBeenCalledWith('ath-1', {
        gym: { minutes: 60, rpe: 7 },
        sportTraining: { minutes: 0, rpe: null },
        match1: { minutes: 0, rpe: null },
        match2: { minutes: 0, rpe: null },
        individualWork: { minutes: 0, rpe: null },
      });
      expect(screen.getByText(/¡Carga del día registrada exitosamente!/i)).toBeDefined();
    });
  });

  it('muestra mensaje de error si submitDailyLoad falla', async () => {
    vi.mocked(submitDailyLoad).mockRejectedValue(new Error('Atleta no encontrado.'));

    render(
      <AttendanceLoadModal
        isOpen={true}
        onClose={mockOnClose}
        athleteId="ath-1"
        athleteName="Lucas Gómez"
        onSuccess={mockOnSuccess}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '60 min' }));
    fireEvent.click(screen.getByRole('button', { name: /Guardar Carga/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
      expect(screen.getByText('Atleta no encontrado.')).toBeDefined();
    });
  });

  it('permite alternar entre 1° y 2° Partido al seleccionar la categoría Partido', async () => {
    vi.mocked(submitDailyLoad).mockResolvedValue({
      message: 'Carga registrada',
      totalMinutes: 90,
      totalLoad: 720,
      date: '2026-11-16',
      gym: { minutes: 0, rpe: null },
      sportTraining: { minutes: 0, rpe: null },
      match1: { minutes: 0, rpe: null },
      match2: { minutes: 90, rpe: 8 },
      individualWork: { minutes: 0, rpe: null },
    });

    render(
      <AttendanceLoadModal
        isOpen={true}
        onClose={mockOnClose}
        athleteId="ath-1"
        athleteName="Lucas Gómez"
        onSuccess={mockOnSuccess}
      />,
    );

    const select = screen.getByLabelText(/Tipo de Actividad/i);
    fireEvent.change(select, { target: { value: 'match' } });

    // Comprobar que aparecen los botones de instancia
    expect(screen.getByRole('button', { name: /1° Partido/i })).toBeDefined();
    const partido2Btn = screen.getByRole('button', { name: /2° Partido/i });
    expect(partido2Btn).toBeDefined();

    // Cambiar a 2° Partido
    fireEvent.click(partido2Btn);

    // Cargar 90 minutos y RPE 8
    fireEvent.click(screen.getByRole('button', { name: '90 min' }));
    const rpeSlider = screen.getByLabelText(/Esfuerzo Percibido/i);
    fireEvent.change(rpeSlider, { target: { value: '8' } });

    // Guardar
    const submitBtn = screen.getByRole('button', { name: /Guardar Carga/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(submitDailyLoad).toHaveBeenCalledWith('ath-1', {
        gym: { minutes: 0, rpe: null },
        sportTraining: { minutes: 0, rpe: null },
        match1: { minutes: 0, rpe: null },
        match2: { minutes: 90, rpe: 8 },
        individualWork: { minutes: 0, rpe: null },
      });
    });
  });
});
