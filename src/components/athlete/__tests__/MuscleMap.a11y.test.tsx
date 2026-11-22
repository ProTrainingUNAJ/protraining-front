import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MuscleMapFront } from '../MuscleMapFront';
import { MuscleMapBack } from '../MuscleMapBack';

describe('MuscleMap · accesibilidad del modo lectura (KAN-594)', () => {
  it('en readOnly el mapa frontal es una imagen con resumen y sin botones', () => {
    const { container } = render(
      <MuscleMapFront readOnly musclePains={{ cuadriceps_derecho: 3, rodilla_izquierda: 6 }} />,
    );

    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(
      screen.getByRole('img', {
        name: 'Mapa muscular, vista frontal: dolor en Cuádriceps derecho (nivel 3), Rodilla izquierda (lesión)',
      }),
    ).toBeDefined();

    const paths = container.querySelectorAll('path');
    expect(paths.length).toBeGreaterThan(0);
    paths.forEach((path) => {
      expect(path.getAttribute('aria-hidden')).toBe('true');
      expect(path.hasAttribute('tabindex')).toBe(false);
      expect(path.hasAttribute('aria-pressed')).toBe(false);
      expect(path.hasAttribute('role')).toBe(false);
    });
  });

  it('en readOnly sin zonas marcadas lo dice en el nombre accesible', () => {
    render(<MuscleMapBack readOnly />);

    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(
      screen.getByRole('img', { name: 'Mapa muscular, vista trasera: sin zonas marcadas' }),
    ).toBeDefined();
  });

  it('en readOnly resume las zonas resaltadas sin dolor (mapas de ejercicios)', () => {
    render(
      <MuscleMapBack readOnly muscleColors={{ triceps_derecho: 'var(--muscle-color-red)' }} />,
    );

    expect(
      screen.getByRole('img', {
        name: 'Mapa muscular, vista trasera: zonas marcadas: Tríceps derecho',
      }),
    ).toBeDefined();
  });

  it('en modo editable cada zona sigue siendo un botón que responde a clic y teclado', () => {
    const onMuscleClick = vi.fn();
    render(
      <MuscleMapFront
        selectedMuscles={['cuadriceps_derecho']}
        musclePains={{ cuadriceps_derecho: 3 }}
        onMuscleClick={onMuscleClick}
      />,
    );

    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getAllByRole('button').length).toBeGreaterThan(0);

    const quad = screen.getByRole('button', {
      name: 'Cuádriceps derecho. Nivel de dolor 3. Vista frontal.',
    });
    expect(quad.getAttribute('aria-pressed')).toBe('true');
    expect(quad.getAttribute('tabindex')).toBe('0');

    fireEvent.click(quad);
    fireEvent.keyDown(quad, { key: 'Enter' });
    expect(onMuscleClick).toHaveBeenCalledTimes(2);
    expect(onMuscleClick).toHaveBeenCalledWith('cuadriceps_derecho');

    const knee = screen.getByRole('button', {
      name: 'Articulación: Rodilla izquierda. Sin dolor registrado. Vista frontal.',
    });
    expect(knee.getAttribute('aria-pressed')).toBe('false');
  });

  it('en modo editable la vista trasera mantiene sus botones', () => {
    render(<MuscleMapBack onMuscleClick={vi.fn()} />);

    expect(
      screen.getByRole('button', { name: 'Glúteo derecho. Sin dolor registrado. Vista trasera.' }),
    ).toBeDefined();
  });
});
