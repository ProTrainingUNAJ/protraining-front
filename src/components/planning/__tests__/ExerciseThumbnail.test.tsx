import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ExerciseThumbnail } from '../ExerciseThumbnail';

describe('ExerciseThumbnail', () => {
  it('renderiza la imagen correctamente cuando se proporciona una url valida', () => {
    render(
      <ExerciseThumbnail
        images={['https://example.com/bench_press.jpg']}
        exerciseName="Press de banca"
      />,
    );

    const img = screen.getByRole('img', { name: /ilustración de press de banca/i });
    expect(img).toBeDefined();
    expect(img.getAttribute('src')).toBe('https://example.com/bench_press.jpg');
  });

  it('muestra el fallback con icono si no se pasan imagenes', () => {
    const { container } = render(
      <ExerciseThumbnail images={[]} exerciseName="Ejercicio sin fotos" />,
    );

    expect(screen.queryByRole('img')).toBeNull();
    const fallback = container.querySelector('.plan-exercise-thumbnail-fallback');
    expect(fallback).toBeDefined();
  });

  it('cambia al fallback en caso de error de carga en la imagen', () => {
    render(
      <ExerciseThumbnail
        images={['https://example.com/invalid-image.jpg']}
        exerciseName="Sentadilla rota"
      />,
    );

    const img = screen.getByRole('img');
    fireEvent.error(img);

    expect(screen.queryByRole('img')).toBeNull();
  });
});
