import { describe, expect, it, vi } from 'vitest';
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

  it('ejecuta onClick al hacer clic o al presionar Enter o Espacio cuando es interactivo', () => {
    const onClick = vi.fn();
    render(
      <ExerciseThumbnail
        images={['https://example.com/squat.jpg']}
        exerciseName="Sentadilla"
        onClick={onClick}
      />,
    );

    const thumb = screen.getByRole('button', { name: /ver técnica y detalle de sentadilla/i });
    expect(thumb).toBeDefined();

    fireEvent.click(thumb);
    expect(onClick).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(thumb, { key: 'Enter' });
    expect(onClick).toHaveBeenCalledTimes(2);

    fireEvent.keyDown(thumb, { key: ' ' });
    expect(onClick).toHaveBeenCalledTimes(3);
  });
});
