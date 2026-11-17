import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ExerciseDetailModal } from '../ExerciseDetailModal';

describe('ExerciseDetailModal', () => {
  const sampleExercise = {
    id: 'ex-123',
    exerciseName: 'Sentadilla con barra',
    muscleGroup: 'Piernas',
    exerciseType: 'Weight',
    images: ['https://example.com/squat_1.jpg', 'https://example.com/squat_2.jpg'],
    primaryMuscles: ['quadriceps', 'glutes'],
    secondaryMuscles: ['hamstrings', 'calves'],
  };

  it('no renderiza nada cuando isOpen es false', () => {
    const { container } = render(
      <ExerciseDetailModal isOpen={false} onClose={vi.fn()} exercise={sampleExercise} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('no renderiza nada cuando exercise es null', () => {
    const { container } = render(
      <ExerciseDetailModal isOpen={true} onClose={vi.fn()} exercise={null} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renderiza título, badges, técnica animada y músculos cuando isOpen es true', () => {
    render(<ExerciseDetailModal isOpen={true} onClose={vi.fn()} exercise={sampleExercise} />);

    expect(screen.getByRole('heading', { name: /sentadilla con barra/i })).toBeDefined();
    expect(screen.getByText('Piernas')).toBeDefined();
    expect(screen.getByText(/músculos involucrados/i)).toBeDefined();
    expect(screen.getByText(/cuádriceps \(principal\)/i)).toBeDefined();
    expect(screen.getByText(/glúteos \(principal\)/i)).toBeDefined();
    expect(screen.getByText(/isquiotibiales \(secundario\)/i)).toBeDefined();
    expect(screen.getByText(/pautas para una buena técnica/i)).toBeDefined();
  });

  it('cierra el modal al hacer clic en el botón de cerrar', () => {
    const onClose = vi.fn();
    render(<ExerciseDetailModal isOpen={true} onClose={onClose} exercise={sampleExercise} />);

    const closeBtn = screen.getByRole('button', { name: /cerrar detalle del ejercicio/i });
    fireEvent.click(closeBtn);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('cierra el modal al hacer clic en el botón Entendido del pie', () => {
    const onClose = vi.fn();
    render(<ExerciseDetailModal isOpen={true} onClose={onClose} exercise={sampleExercise} />);

    const closeBtn = screen.getByRole('button', { name: /entendido/i });
    fireEvent.click(closeBtn);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('cierra el modal al presionar la tecla Escape', () => {
    const onClose = vi.fn();
    render(<ExerciseDetailModal isOpen={true} onClose={onClose} exercise={sampleExercise} />);

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('muestra el fallback de técnica si el ejercicio no tiene imágenes', () => {
    const noImagesExercise = {
      ...sampleExercise,
      images: [],
    };

    render(<ExerciseDetailModal isOpen={true} onClose={vi.fn()} exercise={noImagesExercise} />);

    expect(
      screen.getByText(/ilustración técnica en preparación para este ejercicio/i),
    ).toBeDefined();
  });
});
