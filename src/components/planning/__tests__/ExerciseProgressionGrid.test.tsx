import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ExerciseProgressionGrid } from '../ExerciseProgressionGrid';
import { BlockExercise } from '../../../types/trainingPlans';

describe('ExerciseProgressionGrid', () => {
  const sampleExercise: BlockExercise = {
    key: 'ex-1',
    exerciseId: 'cat-squat',
    exerciseName: 'Sentadilla Trasera',
    order: 1,
    intensityType: 'RPE',
    weeklyProgression: {
      1: {
        weekNumber: 1,
        sets: 3,
        reps: 10,
        repsRange: '10',
        targetPercentage: 70,
        intensityType: 'RPE',
        targetRpe: 7.5,
        targetRir: null,
        notes: 'Semana 1 base',
      },
      2: {
        weekNumber: 2,
        sets: 4,
        reps: 8,
        repsRange: '8',
        targetPercentage: 75,
        intensityType: 'RPE',
        targetRpe: 8,
        targetRir: null,
        notes: 'Semana 2 incremento',
      },
      3: {
        weekNumber: 3,
        sets: 4,
        reps: 6,
        repsRange: '6-8',
        targetPercentage: 80,
        intensityType: 'RPE',
        targetRpe: 8.5,
        targetRir: null,
        notes: 'Semana 3 pico',
      },
      4: {
        weekNumber: 4,
        sets: 3,
        reps: 10,
        repsRange: '10',
        targetPercentage: 65,
        intensityType: 'RPE',
        targetRpe: 6,
        targetRir: null,
        notes: 'Semana 4 descarga',
      },
    },
  };

  it('renderiza todas las semanas configuradas en la grilla', () => {
    render(
      <ExerciseProgressionGrid
        exercise={sampleExercise}
        weekNumbers={[1, 2, 3, 4]}
        disabled={false}
        onUpdateProgression={vi.fn()}
        onUpdateIntensityType={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    expect(screen.getByText('Sem 1')).toBeDefined();
    expect(screen.getByText('Sem 2')).toBeDefined();
    expect(screen.getByText('Sem 3')).toBeDefined();
    expect(screen.getByText('Sem 4')).toBeDefined();
  });

  it('cambiar los valores de la semana 3 solo emite el cambio para la semana 3 sin tocar las otras', () => {
    const onUpdateProgression = vi.fn();
    render(
      <ExerciseProgressionGrid
        exercise={sampleExercise}
        weekNumbers={[1, 2, 3, 4]}
        disabled={false}
        onUpdateProgression={onUpdateProgression}
        onUpdateIntensityType={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    // Cambiar repeticiones en semana 3
    const repsWeek3 = screen.getByLabelText(
      'Repeticiones de Sentadilla Trasera semana 3',
    ) as HTMLInputElement;
    expect(repsWeek3.value).toBe('6-8');

    fireEvent.change(repsWeek3, { target: { value: '4-6' } });

    expect(onUpdateProgression).toHaveBeenCalledTimes(1);
    expect(onUpdateProgression).toHaveBeenCalledWith(3, {
      repsRange: '4-6',
      reps: 4,
    });

    // Modificar series en semana 3
    onUpdateProgression.mockClear();
    const setsWeek3 = screen.getByLabelText(
      'Series de Sentadilla Trasera semana 3',
    ) as HTMLInputElement;
    expect(setsWeek3.value).toBe('4');

    fireEvent.change(setsWeek3, { target: { value: '5' } });
    expect(onUpdateProgression).toHaveBeenCalledWith(3, { sets: 5 });

    // Modificar nota en semana 3
    onUpdateProgression.mockClear();
    const noteWeek3 = screen.getByLabelText(
      'Nota de Sentadilla Trasera semana 3',
    ) as HTMLInputElement;
    fireEvent.change(noteWeek3, { target: { value: 'Aumentar pausa abajo' } });
    expect(onUpdateProgression).toHaveBeenCalledWith(3, { notes: 'Aumentar pausa abajo' });
  });

  it('cambiar de RPE a RIR invoca onUpdateIntensityType con RIR', () => {
    const onUpdateIntensityType = vi.fn();
    render(
      <ExerciseProgressionGrid
        exercise={sampleExercise}
        weekNumbers={[1, 2, 3, 4]}
        disabled={false}
        onUpdateProgression={vi.fn()}
        onUpdateIntensityType={onUpdateIntensityType}
        onRemove={vi.fn()}
      />,
    );

    const rirButton = screen.getByRole('button', { name: /RIR/i });
    fireEvent.click(rirButton);

    expect(onUpdateIntensityType).toHaveBeenCalledWith('RIR');
  });

  it('cuando la métrica es RIR muestra la columna e inputs con RIR', () => {
    const rirExercise: BlockExercise = {
      ...sampleExercise,
      intensityType: 'RIR',
      weeklyProgression: {
        1: {
          ...sampleExercise.weeklyProgression[1],
          intensityType: 'RIR',
          targetRir: 2,
          targetRpe: null,
        },
      },
    };

    render(
      <ExerciseProgressionGrid
        exercise={rirExercise}
        weekNumbers={[1]}
        disabled={false}
        onUpdateProgression={vi.fn()}
        onUpdateIntensityType={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    expect(screen.getByText('RIR (0-5)')).toBeDefined();
    const rirInput = screen.getByLabelText(
      'RIR de Sentadilla Trasera semana 1',
    ) as HTMLInputElement;
    expect(rirInput.value).toBe('2');
  });
});
