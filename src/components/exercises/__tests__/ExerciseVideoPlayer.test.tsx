import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ExerciseVideoPlayer } from '../ExerciseVideoPlayer';

describe('ExerciseVideoPlayer (KAN-380)', () => {
  it('CRITERIO 1: renderiza un iframe embebido con el video de YouTube cuando el link es válido', () => {
    render(
      <ExerciseVideoPlayer
        videoUrl="https://www.youtube.com/watch?v=aclHkVaku9U"
        exerciseName="Sentadilla Trasera"
      />,
    );

    const iframe = screen.getByTitle('Video de técnica: Sentadilla Trasera') as HTMLIFrameElement;
    expect(iframe).toBeTruthy();
    expect(iframe.getAttribute('src')).toBe(
      'https://www.youtube-nocookie.com/embed/aclHkVaku9U?rel=0',
    );
  });

  it('CRITERIO: muestra enlace directo a YouTube para ver el video si no se puede o no permite reproducir', () => {
    render(
      <ExerciseVideoPlayer
        videoUrl="https://www.youtube.com/watch?v=aclHkVaku9U"
        exerciseName="Sentadilla Trasera"
      />,
    );

    const link = screen.getByRole('link', { name: /abrir en youtube/i }) as HTMLAnchorElement;
    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toBe('https://www.youtube.com/watch?v=aclHkVaku9U');
    expect(link.getAttribute('target')).toBe('_blank');
  });

  it('si la URL no es un video de YouTube válido, no renderiza nada por seguridad', () => {
    const { container } = render(
      <ExerciseVideoPlayer videoUrl="javascript:alert(1)" exerciseName="Ejercicio Inseguro" />,
    );

    expect(container.firstChild).toBeNull();
  });
});
