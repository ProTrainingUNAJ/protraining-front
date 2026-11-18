import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PlanningCard } from '../PlanningCard';

describe('PlanningCard (KAN-622)', () => {
  it('renderiza título, objetivo deportivo y badge manual', () => {
    const plan = {
      id: 'plan-1',
      name: 'Fuerza Máxima 2026',
      objective: 'Ganancia de fuerza',
    };

    render(
      <MemoryRouter>
        <PlanningCard plan={plan} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Fuerza Máxima 2026')).toBeDefined();
    expect(screen.getAllByText('Ganancia de fuerza').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Manual')).toBeDefined();
    expect(
      screen.getByRole('link', { name: /abrir editor para fuerza máxima 2026/i }),
    ).toBeDefined();
  });

  it('detecta y muestra badge de origen "Generado con IA" cuando corresponde', () => {
    const planAi = {
      id: 'plan-2',
      name: 'Rutina Asistente IA',
      objective: 'Potencia generada con IA',
    };

    render(
      <MemoryRouter>
        <PlanningCard plan={planAi} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Generado con IA')).toBeDefined();
  });

  it('llama al callback onAssign cuando se hace clic en el botón Asignar', () => {
    const onAssign = vi.fn();
    const plan = {
      id: 'plan-3',
      name: 'Resistencia Aeróbica',
      objective: null,
    };

    render(
      <MemoryRouter>
        <PlanningCard plan={plan} onAssign={onAssign} />
      </MemoryRouter>,
    );

    const assignBtn = screen.getByRole('button', { name: /asignar resistencia aeróbica/i });
    fireEvent.click(assignBtn);

    expect(onAssign).toHaveBeenCalledWith(plan);
  });

  it('renderiza el mapa muscular anatómico con los músculos involucrados de la rutina (KAN-623)', () => {
    const planBiceps = {
      id: 'plan-biceps',
      name: 'Planificación quiero solo biceps',
      objective: 'quiero solo biceps grandes',
      targetMuscles: ['biceps'],
    };

    render(
      <MemoryRouter>
        <PlanningCard plan={planBiceps} />
      </MemoryRouter>,
    );

    const muscleMap = screen.getByRole('img', {
      name: /mapa muscular anatómico de la planificación/i,
    });
    expect(muscleMap).toBeDefined();
  });

  it('diferencia los músculos primarios en celeste y los secundarios en gris (KAN-623)', () => {
    const plan = {
      id: 'plan-fuerza',
      name: 'Fuerza base',
      objective: 'Pecho y tríceps',
      primaryMuscles: ['chest'],
      secondaryMuscles: ['triceps'],
    };

    render(
      <MemoryRouter>
        <PlanningCard plan={plan} />
      </MemoryRouter>,
    );

    const muscleMap = screen.getByRole('img', {
      name: /mapa muscular anatómico de la planificación/i,
    });
    const chestPath = muscleMap.querySelector('#front-muscle-pecho_derecho');
    const tricepsPath = muscleMap.querySelector('#back-muscle-triceps_derecho');

    expect(chestPath?.getAttribute('fill')).toBe('#0284c7');
    expect(tricepsPath?.getAttribute('fill')).toBe('#94a3b8');
  });

  it('renderiza el botón de cesto de basura y llama al callback onDelete cuando se hace clic (KAN-622)', () => {
    const onDelete = vi.fn();
    const plan = {
      id: 'plan-delete',
      name: 'Plan a eliminar',
      objective: null,
    };

    render(
      <MemoryRouter>
        <PlanningCard plan={plan} onDelete={onDelete} />
      </MemoryRouter>,
    );

    const deleteBtn = screen.getByRole('button', {
      name: /eliminar planificación plan a eliminar/i,
    });
    expect(deleteBtn).toBeDefined();

    fireEvent.click(deleteBtn);
    expect(onDelete).toHaveBeenCalledWith(plan);
  });
});
