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

  it('permite colapsar el ejercicio ocultando la tabla y mostrando un resumen compacto (KAN-623)', () => {
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

    // Inicialmente expandido, la tabla está visible
    expect(screen.getByRole('table')).toBeDefined();

    // Colapsar
    const collapseBtn = screen.getByRole('button', { name: /colapsar sentadilla trasera/i });
    fireEvent.click(collapseBtn);

    // La tabla ya no se renderiza
    expect(screen.queryByRole('table')).toBeNull();

    // Muestra el resumen compacto de una línea
    expect(screen.getByText(/4 semanas · 3x10 · 70% RM · RPE 7.5/i)).toBeDefined();

    // Expandir nuevamente
    const expandBtn = screen.getByRole('button', { name: /expandir sentadilla trasera/i });
    fireEvent.click(expandBtn);
    expect(screen.getByRole('table')).toBeDefined();
  });

  it('copia los valores de la semana 1 a todas las semanas restantes al presionar Copiar Sem 1 a todas (KAN-623)', () => {
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

    const copyBtn = screen.getByRole('button', {
      name: /copiar semana 1 de sentadilla trasera a todas las semanas/i,
    });
    fireEvent.click(copyBtn);

    // Debe invocar onUpdateProgression para las semanas 2, 3 y 4
    expect(onUpdateProgression).toHaveBeenCalledTimes(3);
    expect(onUpdateProgression).toHaveBeenCalledWith(
      2,
      expect.objectContaining({
        sets: 3,
        reps: 10,
        repsRange: '10',
        targetPercentage: 70,
        targetRpe: 7.5,
        notes: 'Semana 1 base',
      }),
    );
    expect(onUpdateProgression).toHaveBeenCalledWith(
      3,
      expect.objectContaining({
        sets: 3,
        reps: 10,
      }),
    );
    expect(onUpdateProgression).toHaveBeenCalledWith(
      4,
      expect.objectContaining({
        sets: 3,
        reps: 10,
      }),
    );
  });

  it('renderiza la miniatura del ejercicio y el mapa anatomico de musculos involucrados (KAN-623)', () => {
    const exerciseWithMedia: BlockExercise = {
      ...sampleExercise,
      images: ['https://example.com/squat.jpg'],
      primaryMuscles: ['quadriceps'],
      secondaryMuscles: ['glutes', 'hamstrings'],
    };

    render(
      <ExerciseProgressionGrid
        exercise={exerciseWithMedia}
        weekNumbers={[1, 2, 3, 4]}
        disabled={false}
        onUpdateProgression={vi.fn()}
        onUpdateIntensityType={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    // Miniatura
    const img = screen.getByRole('img', { name: /ilustración de sentadilla trasera/i });
    expect(img).toBeDefined();
    expect(img.getAttribute('src')).toBe('https://example.com/squat.jpg');

    // Mapa anatómico
    const muscleMap = screen.getByRole('img', {
      name: /músculos involucrados en sentadilla trasera/i,
    });
    expect(muscleMap).toBeDefined();
  });
});
