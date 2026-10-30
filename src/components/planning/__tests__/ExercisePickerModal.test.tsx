import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExercisePickerModal } from '../ExercisePickerModal';
import { exercisesService } from '../../../api/exercises';
import { CatalogExercise } from '../../../types/trainingPlans';

// KAN-554: el selector muestra un solo ejercicio base y permite elegir la variante exacta.
const closeGrip: CatalogExercise = {
  id: 'variant-close',
  name: 'Press de banca con barra con agarre cerrado',
  muscleGroup: 'Pecho',
  equipment: 'barra con pesas',
  images: [],
  variantLabel: 'Agarre cerrado',
};

const bench: CatalogExercise = {
  id: 'base-bench',
  name: 'Press de banca con barra - Agarre medio',
  muscleGroup: 'Pecho',
  equipment: 'barra con pesas',
  images: [],
  variants: [closeGrip],
};

describe('ExercisePickerModal', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(exercisesService, 'search').mockResolvedValue({
      items: [bench],
      page: 1,
      totalPages: 1,
      totalCount: 1,
    });
  });

  it('asks for the grouped catalog and shows one row per base exercise', async () => {
    render(<ExercisePickerModal onClose={vi.fn()} onSelect={vi.fn()} />);

    expect(await screen.findByText(bench.name)).toBeTruthy();
    expect(screen.getByText('1 variante')).toBeTruthy();
    expect(screen.queryByText('Agarre cerrado')).toBeNull();
    expect(exercisesService.search).toHaveBeenCalledWith('', 1, 12, false, true);
  });

  it('selects the exact variant id when the PF picks a variant', async () => {
    const onSelect = vi.fn();
    render(<ExercisePickerModal onClose={vi.fn()} onSelect={onSelect} />);

    fireEvent.click(await screen.findByRole('button', { name: /Ver variantes de/ }));
    fireEvent.click(screen.getByText('Agarre cerrado'));

    await waitFor(() => expect(onSelect).toHaveBeenCalledWith(closeGrip));
  });

  it('still selects the base exercise directly', async () => {
    const onSelect = vi.fn();
    render(<ExercisePickerModal onClose={vi.fn()} onSelect={onSelect} />);

    fireEvent.click(await screen.findByText(bench.name));

    expect(onSelect).toHaveBeenCalledWith(bench);
  });
});
