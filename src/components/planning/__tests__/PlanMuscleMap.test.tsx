import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlanMuscleMap } from '../PlanMuscleMap';

describe('PlanMuscleMap (KAN-623)', () => {
  it('renderiza la silueta anatómica tanto frontal como dorsal', () => {
    render(<PlanMuscleMap primaryMuscles={['biceps']} secondaryMuscles={['triceps']} />);

    const map = screen.getByRole('img', {
      name: /mapa muscular anatómico de la planificación/i,
    });
    expect(map).toBeDefined();

    // Verificamos que contenga los elementos SVG de los músculos
    const bicepsPath = map.querySelector('#front-muscle-biceps_derecho');
    const tricepsPath = map.querySelector('#back-muscle-triceps_derecho');

    expect(bicepsPath).not.toBeNull();
    expect(tricepsPath).not.toBeNull();

    // Músculo primario coloreado en celeste (#0284c7)
    expect(bicepsPath?.getAttribute('fill')).toBe('#0284c7');
    // Músculo secundario coloreado en gris (#94a3b8)
    expect(tricepsPath?.getAttribute('fill')).toBe('#94a3b8');
  });

  it('da prioridad al color primario si un músculo aparece tanto en primario como secundario', () => {
    render(<PlanMuscleMap primaryMuscles={['biceps']} secondaryMuscles={['biceps', 'hombros']} />);

    const map = screen.getByRole('img', {
      name: /mapa muscular anatómico de la planificación/i,
    });
    const bicepsPath = map.querySelector('#front-muscle-biceps_derecho');
    expect(bicepsPath?.getAttribute('fill')).toBe('#0284c7');
  });

  it('infiere músculos a partir del nombre y objetivo si no se envían listas explícitas', () => {
    render(<PlanMuscleMap name="Rutina de Bíceps Salvaje" objective="Enfoque en brazos y torso" />);

    const map = screen.getByRole('img', {
      name: /mapa muscular anatómico de la planificación/i,
    });
    const bicepsPath = map.querySelector('#front-muscle-biceps_derecho');
    expect(bicepsPath?.getAttribute('fill')).toBe('#0284c7');
  });
});
