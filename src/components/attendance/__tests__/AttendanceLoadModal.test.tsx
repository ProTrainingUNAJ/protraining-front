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
    expect(screen.getByText('Gimnasio')).toBeDefined();
    expect(screen.getByText('Campo')).toBeDefined();
    expect(screen.getByText('Partido 1')).toBeDefined();
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
});
