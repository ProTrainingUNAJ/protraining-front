import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ExerciseDetailModal } from '../ExerciseDetailModal';
import { exercisesService } from '../../../api/exercises';

vi.mock('../../../api/exercises', () => ({
  exercisesService: {
    updateVideoUrl: vi.fn(),
  },
}));

describe('ExerciseDetailModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  describe('Edición de video de YouTube (KAN-659)', () => {
    it('no muestra el enlace de video cuando allowVideoEdit es false', () => {
      render(<ExerciseDetailModal isOpen={true} onClose={vi.fn()} exercise={sampleExercise} />);

      expect(screen.queryByRole('button', { name: /agregar video de youtube/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /cambiar video/i })).toBeNull();
    });

    it('muestra el enlace oculto inicialmente, valida URL no válida y guarda un link válido de YouTube', async () => {
      vi.mocked(exercisesService.updateVideoUrl).mockResolvedValue(undefined);
      const onVideoChange = vi.fn();

      render(
        <ExerciseDetailModal
          isOpen={true}
          onClose={vi.fn()}
          exercise={sampleExercise}
          allowVideoEdit
          onVideoChange={onVideoChange}
        />,
      );

      // El campo arranca oculto detrás del link discreto
      expect(screen.queryByLabelText(/link de video de youtube/i)).toBeNull();

      const trigger = screen.getByRole('button', { name: /agregar video de youtube/i });
      fireEvent.click(trigger);

      const input = screen.getByLabelText(/link de video de youtube/i) as HTMLInputElement;
      const saveBtn = screen.getByRole('button', { name: /^guardar$/i });

      // Link que no es de YouTube -> no llama a la API y muestra mensaje de error
      fireEvent.change(input, { target: { value: 'https://vimeo.com/123456' } });
      fireEvent.click(saveBtn);

      expect(exercisesService.updateVideoUrl).not.toHaveBeenCalled();
      expect(screen.getByText('El link tiene que ser un video de YouTube.')).toBeDefined();

      // Link válido de YouTube -> guarda y muestra confirmación
      const validUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      fireEvent.change(input, { target: { value: validUrl } });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(exercisesService.updateVideoUrl).toHaveBeenCalledWith('ex-123', validUrl);
      });
      expect(onVideoChange).toHaveBeenCalledWith('ex-123', validUrl);
      expect(await screen.findByText('¡Video de YouTube actualizado con éxito!')).toBeDefined();
    });

    it('muestra mensaje de error si falla el guardado en el servidor', async () => {
      vi.mocked(exercisesService.updateVideoUrl).mockRejectedValue(
        new Error('No se pudo actualizar el video.'),
      );

      render(
        <ExerciseDetailModal
          isOpen={true}
          onClose={vi.fn()}
          exercise={sampleExercise}
          allowVideoEdit
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: /agregar video de youtube/i }));
      fireEvent.change(screen.getByLabelText(/link de video de youtube/i), {
        target: { value: 'https://youtu.be/dQw4w9WgXcQ' },
      });
      fireEvent.click(screen.getByRole('button', { name: /^guardar$/i }));

      expect(await screen.findByText('No se pudo actualizar el video.')).toBeDefined();
    });

    it('muestra "Cambiar video" si ya tiene video y permite quitarlo', async () => {
      vi.mocked(exercisesService.updateVideoUrl).mockResolvedValue(undefined);
      const onVideoChange = vi.fn();

      render(
        <ExerciseDetailModal
          isOpen={true}
          onClose={vi.fn()}
          exercise={{
            ...sampleExercise,
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            videoSource: 'Pf',
          }}
          allowVideoEdit
          onVideoChange={onVideoChange}
        />,
      );

      const changeBtn = screen.getByRole('button', { name: /cambiar video/i });
      fireEvent.click(changeBtn);

      const input = screen.getByLabelText(/link de video de youtube/i) as HTMLInputElement;
      expect(input.value).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');

      const removeBtn = screen.getByRole('button', { name: /quitar video/i });
      fireEvent.click(removeBtn);

      await waitFor(() => {
        expect(exercisesService.updateVideoUrl).toHaveBeenCalledWith('ex-123', null);
      });
      expect(onVideoChange).toHaveBeenCalledWith('ex-123', null);
      expect(await screen.findByText('Se quitó tu video.')).toBeDefined();
      expect(input.value).toBe('');
    });
  });
});
