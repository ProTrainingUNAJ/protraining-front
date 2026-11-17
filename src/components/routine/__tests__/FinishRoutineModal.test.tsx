import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FinishRoutineModal } from '../FinishRoutineModal';
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

  it('muestra los músculos que trabajaron, vincula minutos del cronómetro y permite seleccionar RPE', () => {
    render(
      <FinishRoutineModal
        isOpen={true}
        onClose={vi.fn()}
        athleteId="ath-123"
        timerSeconds={2700} // 45 minutos (45 * 60 = 2700 s)
        exercises={mockExercises}
      />,
    );

    // 1. Título y subtítulo presentes
    expect(screen.getByText('Finalizar entrenamiento')).toBeTruthy();

    // 2. Músculos involucrados en chips y silueta
    expect(screen.getByText(/Músculos que trabajaron hoy/i)).toBeTruthy();
    expect(screen.getByText('Cuádriceps')).toBeTruthy();
    expect(screen.getByText('Pectorales')).toBeTruthy();

    // 3. Minutos vinculados al cronómetro (45 min)
    const minutesInput = screen.getByLabelText(/Minutos de sesión entrenados/i) as HTMLInputElement;
    expect(minutesInput.value).toBe('45');
    expect(screen.getByText(/Cronómetro: 45 min 0 s/i)).toBeTruthy();

    // 4. Selector de RPE interactivo presente
    expect(screen.getByText(/Esfuerzo percibido \(RPE 1-10\)/i)).toBeTruthy();
    expect(screen.getByText('RPE 7')).toBeTruthy();

    // 5. Cálculo dinámico inicial de UA: 45 min * 7 RPE = 315 UA
    expect(screen.getByText('315')).toBeTruthy();
  });

  it('al cambiar RPE o minutos actualiza dinámicamente las Unidades Arbitrarias (UA)', () => {
    render(
      <FinishRoutineModal
        isOpen={true}
        onClose={vi.fn()}
        athleteId="ath-123"
        timerSeconds={3600} // 60 minutos
        exercises={mockExercises}
      />,
    );

    // Cambiar RPE a 8
    const rpe8Btn = screen.getByRole('button', { name: '8' });
    fireEvent.click(rpe8Btn);

    // 60 min * 8 RPE = 480 UA
    expect(screen.getByText('480')).toBeTruthy();
  });

  it('al confirmar exitosamente lanza confeti y carga la barra de UA conseguida', async () => {
    vi.mocked(seguimientoService.submitDailyLoad).mockResolvedValue({
      message: 'OK',
      date: '2026-11-16',
      totalMinutes: 60,
      totalLoad: 480,
      gym: {
        minutes: 60,
        rpe: 8,
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

    // Seleccionar RPE 8
    fireEvent.click(screen.getByRole('button', { name: '8' }));

    // Clic en confirmar
    const submitBtn = screen.getByRole('button', {
      name: /Confirmar y finalizar entrenamiento/i,
    });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(seguimientoService.submitDailyLoad).toHaveBeenCalledWith(
        'ath-123',
        expect.objectContaining({
          gym: { minutes: 60, rpe: 8 },
        }),
      );
    });

    // Criterio de aceptación: Debe mostrar pantalla de celebración con barra de UA
    await waitFor(() => {
      expect(screen.getByText('¡Entrenamiento completado!')).toBeTruthy();
      expect(screen.getByText(/Carga conseguida en la sesión/i)).toBeTruthy();
      expect(screen.getByText('480')).toBeTruthy();
    });

    expect(onFinishSuccess).toHaveBeenCalled();
  });
});
