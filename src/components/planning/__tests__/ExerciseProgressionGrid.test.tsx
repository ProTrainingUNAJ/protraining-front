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

  it('abre el modal de detalle y técnica al hacer clic en la miniatura o en el nombre (KAN-623)', () => {
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

    // Inicialmente no está abierto
    expect(screen.queryByRole('dialog')).toBeNull();

    // Clic en el nombre del ejercicio
    const nameBtn = screen.getByRole('button', {
      name: 'Sentadilla Trasera',
    });
    fireEvent.click(nameBtn);

    // Modal abierto con título y pautas
    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByRole('heading', { name: /sentadilla trasera/i })).toBeDefined();
    expect(screen.getByText(/pautas para una buena técnica/i)).toBeDefined();

    // Cerrar modal
    const closeBtn = screen.getByRole('button', { name: /cerrar detalle del ejercicio/i });
    fireEvent.click(closeBtn);
    expect(screen.queryByRole('dialog')).toBeNull();

    // Clic en la miniatura
    const thumbBtn = screen.getByRole('button', {
      name: /ver técnica y detalle de sentadilla trasera/i,
    });
    fireEvent.click(thumbBtn);
    expect(screen.getByRole('dialog')).toBeDefined();
  });

  it('para ejercicios Time muestra columna Segundos y actualiza targetTimeSeconds', () => {
    const onUpdateProgression = vi.fn();
    const timeExercise: BlockExercise = {
      key: 'ex-time',
      exerciseId: 'cat-trote',
      exerciseName: 'Trote',
      exerciseType: 'Time',
      order: 1,
      intensityType: 'RPE',
      weeklyProgression: {
        1: {
          weekNumber: 1,
          sets: 4,
          reps: 30,
          repsRange: '30',
          targetPercentage: null,
          intensityType: 'RPE',
          targetRpe: 7,
          targetRir: null,
          targetTimeSeconds: 30,
          targetDistanceMeters: null,
          notes: null,
        },
      },
    };

    render(
      <ExerciseProgressionGrid
        exercise={timeExercise}
        weekNumbers={[1]}
        disabled={false}
        onUpdateProgression={onUpdateProgression}
        onUpdateIntensityType={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    expect(screen.getByText('Segundos')).toBeDefined();
    expect(screen.queryByText('Reps / Rango')).toBeNull();

    const secondsInput = screen.getByLabelText('Segundos de Trote semana 1') as HTMLInputElement;
    expect(secondsInput.value).toBe('30');

    fireEvent.change(secondsInput, { target: { value: '300' } });
    expect(onUpdateProgression).toHaveBeenCalledWith(1, {
      targetTimeSeconds: 300,
      reps: 300,
      repsRange: '300',
    });
  });

  it('para ejercicios Distance muestra columna Metros y actualiza targetDistanceMeters', () => {
    const onUpdateProgression = vi.fn();
    const distanceExercise: BlockExercise = {
      key: 'ex-dist',
      exerciseId: 'cat-pasadas',
      exerciseName: 'Pasadas 400m',
      exerciseType: 'Distance',
      order: 1,
      intensityType: 'RPE',
      weeklyProgression: {
        1: {
          weekNumber: 1,
          sets: 6,
          reps: 100,
          repsRange: '100',
          targetPercentage: 90,
          intensityType: 'RPE',
          targetRpe: 8,
          targetRir: null,
          targetDistanceMeters: 100,
          targetTimeSeconds: null,
          notes: null,
        },
      },
    };

    render(
      <ExerciseProgressionGrid
        exercise={distanceExercise}
        weekNumbers={[1]}
        disabled={false}
        onUpdateProgression={onUpdateProgression}
        onUpdateIntensityType={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    expect(screen.getByText('Metros')).toBeDefined();
    expect(screen.queryByText('Reps / Rango')).toBeNull();

    const metersInput = screen.getByLabelText(
      'Metros de Pasadas 400m semana 1',
    ) as HTMLInputElement;
    expect(metersInput.value).toBe('100');

    fireEvent.change(metersInput, { target: { value: '400' } });
    expect(onUpdateProgression).toHaveBeenCalledWith(1, {
      targetDistanceMeters: 400,
      reps: 400,
      repsRange: '400',
    });
  });

  it('para ejercicios de fuerza mantiene la columna Reps / Rango y copia metas al copiar Sem 1', () => {
    const onUpdateProgression = vi.fn();
    const { rerender } = render(
      <ExerciseProgressionGrid
        exercise={sampleExercise}
        weekNumbers={[1, 2]}
        disabled={false}
        onUpdateProgression={onUpdateProgression}
        onUpdateIntensityType={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    expect(screen.getByText('Reps / Rango')).toBeDefined();

    const timeExercise: BlockExercise = {
      key: 'ex-time-copy',
      exerciseId: 'cat-trote',
      exerciseName: 'Trote',
      exerciseType: 'Time',
      order: 1,
      intensityType: 'RPE',
      weeklyProgression: {
        1: {
          weekNumber: 1,
          sets: 1,
          reps: 300,
          repsRange: '300',
          targetPercentage: null,
          intensityType: 'RPE',
          targetRpe: 6,
          targetRir: null,
          targetTimeSeconds: 300,
          targetDistanceMeters: null,
          notes: 'Continuo',
        },
        2: {
          weekNumber: 2,
          sets: 1,
          reps: 30,
          repsRange: '30',
          targetPercentage: null,
          intensityType: 'RPE',
          targetRpe: 6,
          targetRir: null,
          targetTimeSeconds: 30,
          targetDistanceMeters: null,
          notes: null,
        },
      },
    };

    rerender(
      <ExerciseProgressionGrid
        exercise={timeExercise}
        weekNumbers={[1, 2]}
        disabled={false}
        onUpdateProgression={onUpdateProgression}
        onUpdateIntensityType={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: /copiar semana 1 de trote a todas las semanas/i }),
    );
    expect(onUpdateProgression).toHaveBeenCalledWith(
      2,
      expect.objectContaining({
        targetTimeSeconds: 300,
        targetDistanceMeters: null,
        notes: 'Continuo',
      }),
    );
  });
});
