import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FinishRoutineModal } from '../FinishRoutineModal';
import { formatMmSs, parseMmSs } from '../finishRoutineUtils';
import * as seguimientoService from '../../../api/seguimientoService';
import type { TodayRoutineExercise } from '../../../api/generated/entrenamiento';

vi.mock('../../../api/seguimientoService', () => ({
  submitDailyLoad: vi.fn(),
  getDailyLoad: vi.fn(),
}));

const mockExercises: TodayRoutineExercise[] = [
  {
    exerciseId: 'ex-squat',
    name: 'Sentadilla con barra',
    muscleGroup: 'Piernas',
    primaryMuscles: ['cuadriceps'],
    secondaryMuscles: ['gluteos'],
    sets: 4,
    reps: 8,
    isReference: false,
    images: [],
  },
  {
    exerciseId: 'ex-bench',
    name: 'Press de Banca',
    muscleGroup: 'Pecho',
    primaryMuscles: ['pecho'],
    secondaryMuscles: ['triceps'],
    sets: 4,
    reps: 8,
    isReference: false,
    images: [],
  },
];

describe('FinishRoutineModal (KAN-623)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(seguimientoService.getDailyLoad).mockResolvedValue(null);
  });

  describe('utilidades formatMmSs y parseMmSs', () => {
    it('formatea correctamente a formato digital estricto MM:SS', () => {
      expect(formatMmSs(0)).toBe('00:00');
      expect(formatMmSs(3)).toBe('00:03');
      expect(formatMmSs(21)).toBe('00:21');
      expect(formatMmSs(65)).toBe('01:05');
      expect(formatMmSs(2700)).toBe('45:00');
      expect(formatMmSs(3600)).toBe('60:00');
    });

    it('parsea strings MM:SS o números a segundos totales', () => {
      expect(parseMmSs('00:21')).toBe(21);
      expect(parseMmSs('00:03')).toBe(3);
      expect(parseMmSs('45:00')).toBe(2700);
      expect(parseMmSs('45')).toBe(2700);
      expect(parseMmSs('')).toBe(0);
    });
  });

  it('muestra tiempo en formato centrado 00:00, sin toggle de unidades ni badge cronómetro, y RPE coloreado', () => {
    render(
      <FinishRoutineModal
        isOpen={true}
        onClose={vi.fn()}
        athleteId="ath-123"
        timerSeconds={2700} // 45 minutos (2700 s)
        exercises={mockExercises}
      />,
    );

    // 1. Título y subtítulo presentes
    expect(screen.getByText('Finalizar entrenamiento')).toBeTruthy();

    // 2. Músculos involucrados en chips y silueta
    expect(screen.getByText(/Músculos que trabajaron hoy/i)).toBeTruthy();
    expect(screen.getByText('Cuádriceps')).toBeTruthy();
    expect(screen.getByText('Pectorales')).toBeTruthy();

    // 3. No deben existir elementos en amarillo eliminados (toggle min/seg ni badge de Cronómetro)
    expect(screen.queryByRole('group', { name: /Unidad de tiempo/i })).toBeNull();
    expect(screen.queryByText(/Cronómetro:/i)).toBeNull();

    // 4. Input de tiempo centrado y en formato 00:00
    const timeInput = screen.getByLabelText(/Tiempo de sesión entrenado/i) as HTMLInputElement;
    expect(timeInput.value).toBe('45:00');
    expect(timeInput.classList.contains('finish-routine-time-input')).toBe(true);

    // 5. Botones de incremento por defecto para >= 60s son - 1 min y + 1 min
    expect(screen.getByRole('button', { name: /- 1 min/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /\+ 1 min/i })).toBeTruthy();

    // 6. Selector de RPE interactivo presente con colores semánticos (RPE 7 activo por defecto)
    expect(screen.getByText(/Esfuerzo percibido \(RPE 1-10\)/i)).toBeTruthy();
    expect(screen.getByText('Nivel 7')).toBeTruthy();
    expect(screen.getByText(/RPE 7 · Muy duro/i)).toBeTruthy();
    expect(screen.getByText('Muy Duro')).toBeTruthy();

    // 7. Cálculo dinámico inicial de UA: 45 min * 7 RPE = 315 UA
    expect(screen.getByText('315')).toBeTruthy();
  });

  it('al cambiar RPE aplica el tier de color correspondiente (demanding en 6, etc.) y recalcula UA', () => {
    render(
      <FinishRoutineModal
        isOpen={true}
        onClose={vi.fn()}
        athleteId="ath-123"
        timerSeconds={3600} // 60 minutos
        exercises={mockExercises}
      />,
    );

    // Seleccionar RPE 6 (tier demanding - naranja como en DailyLoadPage)
    const rpe6Btn = screen.getByRole('button', { name: 'Nivel 6' });
    expect(rpe6Btn.classList.contains('finish-routine-rpe-btn--demanding')).toBe(true);

    fireEvent.click(rpe6Btn);

    // Debe marcarse como seleccionado
    expect(rpe6Btn.classList.contains('finish-routine-rpe-btn--selected')).toBe(true);
    expect(screen.getByText('Nivel 6')).toBeTruthy();
    expect(screen.getByText(/RPE 6 · Exigente/i)).toBeTruthy();
    expect(screen.getByText('Exigente')).toBeTruthy();
    expect(
      screen.getByText(/Fatiga progresiva, requiere concentración mental para sostener./i),
    ).toBeTruthy();

    // 60 min * 6 RPE = 360 UA
    expect(screen.getByText('360')).toBeTruthy();

    // Permite ajustar tiempo con botones + 1 min y - 1 min
    const plus1Btn = screen.getByRole('button', { name: /\+ 1 min/i });
    fireEvent.click(plus1Btn);
    const timeInput = screen.getByLabelText(/Tiempo de sesión entrenado/i) as HTMLInputElement;
    expect(timeInput.value).toBe('61:00');

    const minus1Btn = screen.getByRole('button', { name: /- 1 min/i });
    fireEvent.click(minus1Btn);
    expect(timeInput.value).toBe('60:00');
  });

  it('precarga segundos del cronómetro (< 60s) en formato 00:XX y adapta incrementos a 15 s', () => {
    render(
      <FinishRoutineModal
        isOpen={true}
        onClose={vi.fn()}
        athleteId="ath-123"
        timerSeconds={21} // 21 segundos
        exercises={mockExercises}
      />,
    );

    // 1. Input muestra 00:21 centrado
    const timeInput = screen.getByLabelText(/Tiempo de sesión entrenado/i) as HTMLInputElement;
    expect(timeInput.value).toBe('00:21');

    // 2. Botones de paso se adaptan a 15 s cuando es menor a 60s
    const plus15Btn = screen.getByRole('button', { name: /\+ 15 s/i });
    expect(plus15Btn).toBeTruthy();
    fireEvent.click(plus15Btn);
    expect(timeInput.value).toBe('00:36');

    const minus15Btn = screen.getByRole('button', { name: /- 15 s/i });
    fireEvent.click(minus15Btn);
    expect(timeInput.value).toBe('00:21');

    // 3. No muestra selector de unidad ni texto "seg" suelto
    expect(screen.queryByText(/Cronómetro:/i)).toBeNull();
  });

  it('al confirmar exitosamente guarda la carga, lanza confeti y muestra pantalla de celebración con duración MM:SS', async () => {
    vi.mocked(seguimientoService.submitDailyLoad).mockResolvedValue({
      message: 'OK',
      date: '2026-11-18',
      totalMinutes: 60,
      totalLoad: 360,
      gym: {
        minutes: 60,
        rpe: 6,
      },
      sportTraining: {},
      match1: {},
      match2: {},
      individualWork: {},
    });

    const onFinishSuccess = vi.fn();

    render(
      <FinishRoutineModal
        isOpen={true}
        onClose={vi.fn()}
        athleteId="ath-123"
        timerSeconds={3600}
        exercises={mockExercises}
        onFinishSuccess={onFinishSuccess}
      />,
    );

    // Seleccionar RPE 6
    fireEvent.click(screen.getByRole('button', { name: 'Nivel 6' }));

    // Clic en confirmar
    const submitBtn = screen.getByRole('button', {
      name: /Confirmar y finalizar entrenamiento/i,
    });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(seguimientoService.submitDailyLoad).toHaveBeenCalledWith(
        'ath-123',
        expect.objectContaining({
          gym: { minutes: 60, rpe: 6 },
        }),
      );
    });

    // Pantalla de celebración
    await waitFor(() => {
      expect(screen.getByText('¡Entrenamiento completado!')).toBeTruthy();
      expect(screen.getByText(/Carga conseguida en la sesión/i)).toBeTruthy();
      expect(screen.getByText('360')).toBeTruthy();
      expect(screen.getByText('60:00')).toBeTruthy();
      expect(screen.getByText('RPE 6')).toBeTruthy();
    });

    expect(onFinishSuccess).toHaveBeenCalled();
  });
});
