import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ExerciseMuscleMiniMap } from '../ExerciseMuscleMiniMap';

describe('ExerciseMuscleMiniMap', () => {
  it('renderiza las siluetas frontal y dorsal con la etiqueta accesible', () => {
    render(
      <ExerciseMuscleMiniMap
        primaryMuscles={['quadriceps']}
        secondaryMuscles={['glutes', 'hamstrings']}
        exerciseName="Sentadilla con barra"
      />,
    );

    const map = screen.getByRole('img', {
      name: /músculos involucrados en sentadilla con barra/i,
    });
    expect(map).toBeDefined();

    const silhouettes = map.querySelectorAll('.plan-exercise-muscle-silhouette');
    expect(silhouettes.length).toBe(2);
  });

  it('infiere musculos a partir del nombre si no se pasan explicitamente', () => {
    render(<ExerciseMuscleMiniMap exerciseName="Press de banca plano" />);

    const map = screen.getByRole('img', {
      name: /músculos involucrados en press de banca plano/i,
    });
    expect(map).toBeDefined();
  });
});
