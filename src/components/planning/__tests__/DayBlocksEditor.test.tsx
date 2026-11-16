import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { DayBlocksEditor } from '../DayBlocksEditor';
import { DayPlan } from '../../../types/trainingPlans';
import { createDefaultBlocks } from '../../../utils/planDraft';

describe('DayBlocksEditor', () => {
  const sampleDays: DayPlan[] = [
    {
      dayOfWeek: 1, // Lunes
      blocks: [
        {
          key: 'b1',
          title: 'Entrada en calor / Movilidad',
          order: 1,
          exercises: [],
        },
        {
          key: 'b2',
          title: 'Fuerza A',
          order: 2,
          exercises: [],
        },
        {
          key: 'b3',
          title: 'Accesorios',
          order: 3,
          exercises: [],
        },
      ],
    },
    {
      dayOfWeek: 3, // Miércoles
      name: 'Miércoles',
      blocks: createDefaultBlocks(),
    },
  ];

  it('renderiza las pestañas de los días y permite cambiar de día', () => {
    const onSelectDay = vi.fn();
    render(
      <DayBlocksEditor
        days={sampleDays}
        selectedDayOfWeek={1}
        weekNumbers={[1, 2, 3, 4]}
        disabled={false}
        onSelectDay={onSelectDay}
        onAddDay={vi.fn()}
        onRemoveDay={vi.fn()}
        onAddBlock={vi.fn()}
        onReorderBlocks={vi.fn()}
        onRenameBlock={vi.fn()}
        onDuplicateBlock={vi.fn()}
        onRemoveBlock={vi.fn()}
        onOpenExercisePicker={vi.fn()}
        onUpdateExerciseProgression={vi.fn()}
        onUpdateExerciseIntensity={vi.fn()}
        onRemoveExercise={vi.fn()}
        onMoveExercise={vi.fn()}
      />,
    );

    const lunesTab = screen.getByRole('tab', { name: /Lunes/i });
    const miercolesTab = screen.getByRole('tab', { name: /Miércoles/i });
    expect(lunesTab).toBeDefined();
    expect(miercolesTab).toBeDefined();

    fireEvent.click(miercolesTab);
    expect(onSelectDay).toHaveBeenCalledWith(3);
  });

  it('permite agregar un nuevo bloque en el día activo', () => {
    const onAddBlock = vi.fn();
    render(
      <DayBlocksEditor
        days={sampleDays}
        selectedDayOfWeek={1}
        weekNumbers={[1, 2, 3, 4]}
        disabled={false}
        onSelectDay={vi.fn()}
        onAddDay={vi.fn()}
        onRemoveDay={vi.fn()}
        onAddBlock={onAddBlock}
        onReorderBlocks={vi.fn()}
        onRenameBlock={vi.fn()}
        onDuplicateBlock={vi.fn()}
        onRemoveBlock={vi.fn()}
        onOpenExercisePicker={vi.fn()}
        onUpdateExerciseProgression={vi.fn()}
        onUpdateExerciseIntensity={vi.fn()}
        onRemoveExercise={vi.fn()}
        onMoveExercise={vi.fn()}
      />,
    );

    const addBlockBtn = screen.getByRole('button', { name: /Agregar bloque/i });
    fireEvent.click(addBlockBtn);

    expect(onAddBlock).toHaveBeenCalledWith(1);
  });

  it('reordena bloques hacia arriba y hacia abajo llamando a onReorderBlocks', () => {
    const onReorderBlocks = vi.fn();
    render(
      <DayBlocksEditor
        days={sampleDays}
        selectedDayOfWeek={1}
        weekNumbers={[1, 2, 3, 4]}
        disabled={false}
        onSelectDay={vi.fn()}
        onAddDay={vi.fn()}
        onRemoveDay={vi.fn()}
        onAddBlock={vi.fn()}
        onReorderBlocks={onReorderBlocks}
        onRenameBlock={vi.fn()}
        onDuplicateBlock={vi.fn()}
        onRemoveBlock={vi.fn()}
        onOpenExercisePicker={vi.fn()}
        onUpdateExerciseProgression={vi.fn()}
        onUpdateExerciseIntensity={vi.fn()}
        onRemoveExercise={vi.fn()}
        onMoveExercise={vi.fn()}
      />,
    );

    // Mover "Fuerza A" (índice 1) hacia arriba (al índice 0)
    const moveUpFuerza = screen.getByLabelText('Subir bloque Fuerza A');
    fireEvent.click(moveUpFuerza);
    expect(onReorderBlocks).toHaveBeenCalledWith(1, 1, 0);

    // Mover "Fuerza A" (índice 1) hacia abajo (al índice 2)
    const moveDownFuerza = screen.getByLabelText('Bajar bloque Fuerza A');
    fireEvent.click(moveDownFuerza);
    expect(onReorderBlocks).toHaveBeenCalledWith(1, 1, 2);
  });

  it('permite abrir el menú de agregar día y seleccionar un día nuevo', () => {
    const onAddDay = vi.fn();
    render(
      <DayBlocksEditor
        days={sampleDays}
        selectedDayOfWeek={1}
        weekNumbers={[1, 2, 3, 4]}
        disabled={false}
        onSelectDay={vi.fn()}
        onAddDay={onAddDay}
        onRemoveDay={vi.fn()}
        onAddBlock={vi.fn()}
        onReorderBlocks={vi.fn()}
        onRenameBlock={vi.fn()}
        onDuplicateBlock={vi.fn()}
        onRemoveBlock={vi.fn()}
        onOpenExercisePicker={vi.fn()}
        onUpdateExerciseProgression={vi.fn()}
        onUpdateExerciseIntensity={vi.fn()}
        onRemoveExercise={vi.fn()}
        onMoveExercise={vi.fn()}
      />,
    );

    const addDayTrigger = screen.getByRole('button', {
      name: 'Agregar día a la planificación',
    });
    fireEvent.click(addDayTrigger);

    // Seleccionar Viernes (dayOfWeek: 5)
    const viernesBtn = screen.getByRole('menuitem', { name: 'Viernes' });
    fireEvent.click(viernesBtn);

    expect(onAddDay).toHaveBeenCalledWith(5);
  });

  it('muestra el resumen cuantitativo de volumen del día seleccionado en tiempo real (KAN-623)', () => {
    const daysWithExercises: DayPlan[] = [
      {
        dayOfWeek: 1,
        blocks: [
          {
            key: 'b1',
            title: 'Fuerza A',
            order: 1,
            exercises: [
              {
                key: 'ex-1',
                exerciseId: 'cat-1',
                exerciseName: 'Press Banca',
                order: 1,
                intensityType: 'RPE',
                weeklyProgression: {
                  1: {
                    weekNumber: 1,
                    sets: 4,
                    reps: 8,
                    repsRange: '8',
                    targetPercentage: 75,
                    intensityType: 'RPE',
                  },
                },
              },
              {
                key: 'ex-2',
                exerciseId: 'cat-2',
                exerciseName: 'Dominadas',
                order: 2,
                intensityType: 'RPE',
                weeklyProgression: {
                  1: {
                    weekNumber: 1,
                    sets: 3,
                    reps: 10,
                    repsRange: '10',
                    targetPercentage: null,
                    intensityType: 'RPE',
                  },
                },
              },
            ],
          },
          {
            key: 'b2',
            title: 'Accesorios',
            order: 2,
            exercises: [
              {
                key: 'ex-3',
                exerciseId: 'cat-3',
                exerciseName: 'Bíceps',
                order: 1,
                intensityType: 'RPE',
                weeklyProgression: {
                  1: {
                    weekNumber: 1,
                    sets: 3,
                    reps: 12,
                    repsRange: '12',
                    targetPercentage: null,
                    intensityType: 'RPE',
                  },
                },
              },
            ],
          },
        ],
      },
    ];

    render(
      <DayBlocksEditor
        days={daysWithExercises}
        selectedDayOfWeek={1}
        weekNumbers={[1, 2, 3, 4]}
        disabled={false}
        onSelectDay={vi.fn()}
        onAddDay={vi.fn()}
        onRemoveDay={vi.fn()}
        onAddBlock={vi.fn()}
        onReorderBlocks={vi.fn()}
        onRenameBlock={vi.fn()}
        onDuplicateBlock={vi.fn()}
        onRemoveBlock={vi.fn()}
        onOpenExercisePicker={vi.fn()}
        onUpdateExerciseProgression={vi.fn()}
        onUpdateExerciseIntensity={vi.fn()}
        onRemoveExercise={vi.fn()}
        onMoveExercise={vi.fn()}
      />,
    );

    const volumeSummary = screen.getByLabelText('Resumen de volumen del día');
    expect(volumeSummary).toBeDefined();

    // 2 bloques, 3 ejercicios, 10 series totales (4 + 3 + 3)
    expect(within(volumeSummary).getByText('2')).toBeDefined();
    expect(within(volumeSummary).getByText(/bloques/i)).toBeDefined();
    expect(within(volumeSummary).getByText('3')).toBeDefined();
    expect(within(volumeSummary).getByText(/ejercicios/i)).toBeDefined();
    expect(within(volumeSummary).getByText('10')).toBeDefined();
    expect(within(volumeSummary).getByText(/series estimadas/i)).toBeDefined();
  });
});
