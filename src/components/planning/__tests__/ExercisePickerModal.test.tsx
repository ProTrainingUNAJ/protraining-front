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

  it('filters by sub-muscle when Piernas is selected and then Isquiotibiales is clicked', async () => {
    render(<ExercisePickerModal onClose={vi.fn()} onSelect={vi.fn()} />);

    // Tap on 'Piernas' chip
    fireEvent.click(screen.getByRole('button', { name: 'Piernas' }));

    // Sub-muscle chips appear
    const isquiosChip = await screen.findByRole('button', { name: 'Isquiotibiales' });
    expect(isquiosChip).toBeTruthy();

    // Tap on 'Isquiotibiales' chip
    fireEvent.click(isquiosChip);

    await waitFor(() => {
      expect(exercisesService.search).toHaveBeenCalledWith(
        '',
        1,
        12,
        false,
        true,
        'Piernas',
        'isquiotibiales',
      );
    });
  });

  it('shows specific empty state message when a selected muscle has no exercises', async () => {
    vi.spyOn(exercisesService, 'search').mockResolvedValue({
      items: [],
      page: 1,
      totalPages: 0,
      totalCount: 0,
    });

    render(<ExercisePickerModal onClose={vi.fn()} onSelect={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Piernas' }));
    const isquiosChip = await screen.findByRole('button', { name: 'Isquiotibiales' });
    fireEvent.click(isquiosChip);

    expect(await screen.findByText('No hay ejercicios para ese músculo.')).toBeTruthy();
  });

  it('does not render sub-muscle chips container when Pecho or Core is selected (KAN-633)', async () => {
    render(<ExercisePickerModal onClose={vi.fn()} onSelect={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Pecho' }));

    await waitFor(() => {
      expect(exercisesService.search).toHaveBeenCalledWith(
        '',
        1,
        12,
        false,
        true,
        'Pecho',
        undefined,
      );
    });

    expect(screen.queryByLabelText('Filtro por músculo puntual')).toBeNull();
    expect(screen.getAllByRole('button', { name: 'Pecho' })).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'Core' }));

    await waitFor(() => {
      expect(exercisesService.search).toHaveBeenCalledWith(
        '',
        1,
        12,
        false,
        true,
        'Core',
        undefined,
      );
    });

    expect(screen.queryByLabelText('Filtro por músculo puntual')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Abdominales' })).toBeNull();
  });

  it('renders Cuello without duplicating Hombros subchip when Hombros is selected (KAN-633)', async () => {
    render(<ExercisePickerModal onClose={vi.fn()} onSelect={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Hombros' }));

    expect(await screen.findByRole('button', { name: 'Cuello' })).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Hombros' })).toHaveLength(1);
  });
});
