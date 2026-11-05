import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
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

  it('si la URL no es estándar o no se puede embeber, muestra fallback con botón que abre YouTube', () => {
    render(
      <ExerciseVideoPlayer
        videoUrl="https://youtube.com/live/some-stream"
        exerciseName="Ejercicio Especial"
      />,
    );

    expect(screen.getByText('Este video no puede reproducirse embebido.')).toBeTruthy();

    const button = screen.getByRole('link', { name: /abrir en youtube/i }) as HTMLAnchorElement;
    expect(button).toBeTruthy();
    expect(button.getAttribute('href')).toBe('https://youtube.com/live/some-stream');
    expect(button.getAttribute('target')).toBe('_blank');
  });
});
