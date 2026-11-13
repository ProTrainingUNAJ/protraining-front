import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { ExerciseTypeBadge } from '../ExerciseTypeBadge';

describe('ExerciseTypeBadge (KAN-453)', () => {
  it('no muestra nada cuando el tipo es Weight o default', () => {
    const { container: c1 } = render(<ExerciseTypeBadge type="Weight" />);
    expect(c1.firstChild).toBeNull();

    const { container: c2 } = render(<ExerciseTypeBadge type={null} />);
    expect(c2.firstChild).toBeNull();

    const { container: c3 } = render(<ExerciseTypeBadge type={undefined} />);
    expect(c3.firstChild).toBeNull();
  });

  it('muestra badge Distancia para tipo Distance', () => {
    render(<ExerciseTypeBadge type="Distance" />);
    const badge = screen.getByText('Distancia');
    expect(badge).toBeTruthy();
    expect(badge.className).toContain('badge badge-info');
  });

  it('muestra badge Tiempo para tipo Time', () => {
    render(<ExerciseTypeBadge type="Time" />);
    const badge = screen.getByText('Tiempo');
    expect(badge).toBeTruthy();
    expect(badge.className).toContain('badge badge-warning');
  });

  it('muestra badge Repeticiones para tipo Reps', () => {
    render(<ExerciseTypeBadge type="Reps" />);
    const badge = screen.getByText('Repeticiones');
    expect(badge).toBeTruthy();
    expect(badge.className).toContain('badge badge-success');
  });
});
