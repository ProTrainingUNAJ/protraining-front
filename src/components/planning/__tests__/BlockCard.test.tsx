import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { BlockCard } from '../BlockCard';
import { DayBlock } from '../../../types/trainingPlans';

describe('BlockCard', () => {
  const sampleBlock: DayBlock = {
    key: 'block-1',
    title: 'Fuerza A',
    order: 1,
    exercises: [
      {
        key: 'ex-1',
        exerciseId: 'cat-squat',
        exerciseName: 'Sentadilla Trasera',
        order: 1,
        intensityType: 'RPE',
        weeklyProgression: {
          1: {
            weekNumber: 1,
            sets: 3,
            reps: 8,
            repsRange: '8',
            targetPercentage: 70,
            intensityType: 'RPE',
            targetRpe: 8,
            targetRir: null,
          },
        },
      },
      {
        key: 'ex-2',
        exerciseId: 'cat-bench',
        exerciseName: 'Press de Banca',
        order: 2,
        intensityType: 'RPE',
        weeklyProgression: {
          1: {
            weekNumber: 1,
            sets: 3,
            reps: 8,
            repsRange: '8',
            targetPercentage: 70,
            intensityType: 'RPE',
            targetRpe: 8,
            targetRir: null,
          },
        },
      },
    ],
  };

  it('permite renombrar el título del bloque invocando onRename', () => {
    const onRename = vi.fn();
    render(
      <BlockCard
        block={sampleBlock}
        weekNumbers={[1]}
        disabled={false}
        canMoveUp={true}
        canMoveDown={true}
        onRename={onRename}
        onDuplicate={vi.fn()}
        onRemove={vi.fn()}
        onMoveUp={vi.fn()}
        onMoveDown={vi.fn()}
        onAddExercise={vi.fn()}
        onUpdateExerciseProgression={vi.fn()}
        onUpdateExerciseIntensity={vi.fn()}
        onRemoveExercise={vi.fn()}
        onMoveExerciseUp={vi.fn()}
        onMoveExerciseDown={vi.fn()}
      />,
    );

    const titleInput = screen.getByLabelText('Nombre del bloque 1') as HTMLInputElement;
    expect(titleInput.value).toBe('Fuerza A');

    fireEvent.change(titleInput, { target: { value: 'Fuerza Máxima' } });
    expect(onRename).toHaveBeenCalledWith('Fuerza Máxima');
  });

  it('reordena bloques: deshabilita subir cuando canMoveUp es false y bajar cuando canMoveDown es false', () => {
    const { rerender } = render(
      <BlockCard
        block={sampleBlock}
        weekNumbers={[1]}
        disabled={false}
        canMoveUp={false}
        canMoveDown={true}
        onRename={vi.fn()}
        onDuplicate={vi.fn()}
        onRemove={vi.fn()}
        onMoveUp={vi.fn()}
        onMoveDown={vi.fn()}
        onAddExercise={vi.fn()}
        onUpdateExerciseProgression={vi.fn()}
        onUpdateExerciseIntensity={vi.fn()}
        onRemoveExercise={vi.fn()}
        onMoveExerciseUp={vi.fn()}
        onMoveExerciseDown={vi.fn()}
      />,
    );

    const upBtn = screen.getByLabelText('Subir bloque Fuerza A') as HTMLButtonElement;
    const downBtn = screen.getByLabelText('Bajar bloque Fuerza A') as HTMLButtonElement;

    expect(upBtn.disabled).toBe(true);
    expect(downBtn.disabled).toBe(false);

    rerender(
      <BlockCard
        block={sampleBlock}
        weekNumbers={[1]}
        disabled={false}
        canMoveUp={true}
        canMoveDown={false}
        onRename={vi.fn()}
        onDuplicate={vi.fn()}
        onRemove={vi.fn()}
        onMoveUp={vi.fn()}
        onMoveDown={vi.fn()}
        onAddExercise={vi.fn()}
        onUpdateExerciseProgression={vi.fn()}
        onUpdateExerciseIntensity={vi.fn()}
        onRemoveExercise={vi.fn()}
        onMoveExerciseUp={vi.fn()}
        onMoveExerciseDown={vi.fn()}
      />,
    );

    expect((screen.getByLabelText('Subir bloque Fuerza A') as HTMLButtonElement).disabled).toBe(
      false,
    );
    expect((screen.getByLabelText('Bajar bloque Fuerza A') as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it('duplicar y borrar bloque llaman a sus callbacks correspondientes', () => {
    const onDuplicate = vi.fn();
    const onRemove = vi.fn();

    render(
      <BlockCard
        block={sampleBlock}
        weekNumbers={[1]}
        disabled={false}
        canMoveUp={true}
        canMoveDown={true}
        onRename={vi.fn()}
        onDuplicate={onDuplicate}
        onRemove={onRemove}
        onMoveUp={vi.fn()}
        onMoveDown={vi.fn()}
        onAddExercise={vi.fn()}
        onUpdateExerciseProgression={vi.fn()}
        onUpdateExerciseIntensity={vi.fn()}
        onRemoveExercise={vi.fn()}
        onMoveExerciseUp={vi.fn()}
        onMoveExerciseDown={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByLabelText('Duplicar bloque Fuerza A'));
    expect(onDuplicate).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByLabelText('Eliminar bloque Fuerza A'));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('agregar ejercicio y reordenar ejercicios dentro del bloque', () => {
    const onAddExercise = vi.fn();
    const onMoveExerciseUp = vi.fn();

    render(
      <BlockCard
        block={sampleBlock}
        weekNumbers={[1]}
        disabled={false}
        canMoveUp={true}
        canMoveDown={true}
        onRename={vi.fn()}
        onDuplicate={vi.fn()}
        onRemove={vi.fn()}
        onMoveUp={vi.fn()}
        onMoveDown={vi.fn()}
        onAddExercise={onAddExercise}
        onUpdateExerciseProgression={vi.fn()}
        onUpdateExerciseIntensity={vi.fn()}
        onRemoveExercise={vi.fn()}
        onMoveExerciseUp={onMoveExerciseUp}
        onMoveExerciseDown={vi.fn()}
      />,
    );

    // Agregar ejercicio
    fireEvent.click(screen.getByRole('button', { name: /Agregar ejercicio al bloque/i }));
    expect(onAddExercise).toHaveBeenCalledTimes(1);

    // Mover Press de banca hacia arriba (del índice 1 al 0)
    const moveUpBench = screen.getByLabelText('Subir Press de Banca');
    fireEvent.click(moveUpBench);
    expect(onMoveExerciseUp).toHaveBeenCalledWith(1);
  });
});
