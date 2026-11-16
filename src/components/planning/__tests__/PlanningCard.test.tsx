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
});
