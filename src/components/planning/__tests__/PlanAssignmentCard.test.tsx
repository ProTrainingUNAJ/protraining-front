import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PlanAssignmentCard } from '../PlanAssignmentCard';
import type { PlanAssignmentSummary } from '../../../api/trainingPlans';

describe('PlanAssignmentCard (KAN-623)', () => {
  const mockAssignment: PlanAssignmentSummary = {
    assignmentId: 'assign-1',
    trainingPlanId: 'plan-101',
    planName: 'Planificación quiero solo biceps grandes',
    startDate: '2026-11-16',
    endDate: '2026-12-13',
    status: 'Active',
  };

  it('renderiza la tarjeta con título, badge de estado Activa y fechas en formato amigable', () => {
    render(
      <MemoryRouter>
        <PlanAssignmentCard assignment={mockAssignment} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Planificación quiero solo biceps grandes')).toBeDefined();
    expect(screen.getByText('Activa')).toBeDefined();
    expect(screen.getByText(/Del 16\/11 al 13\/12 · Termina el 13\/12/i)).toBeDefined();

    const link = screen.getByRole('link', {
      name: /ver planificación planificación quiero solo biceps grandes/i,
    });
    expect(link.getAttribute('href')).toBe('/pf/planning/plan-101');
  });

  it('muestra badge Terminada cuando el estado es Finished', () => {
    const finishedAssignment: PlanAssignmentSummary = {
      ...mockAssignment,
      assignmentId: 'assign-2',
      status: 'Finished',
    };

    render(
      <MemoryRouter>
        <PlanAssignmentCard assignment={finishedAssignment} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Terminada')).toBeDefined();
  });

  it('renderiza el mapa muscular anatómico incorporado a la derecha de la tarjeta', () => {
    render(
      <MemoryRouter>
        <PlanAssignmentCard
          assignment={mockAssignment}
          plan={{
            id: 'plan-101',
            name: 'Planificación quiero solo biceps grandes',
            objective: 'Bíceps enormes',
            targetMuscles: ['biceps'],
          }}
        />
      </MemoryRouter>,
    );

    const muscleMap = screen.getByRole('img', {
      name: /mapa muscular anatómico de la planificación/i,
    });
    expect(muscleMap).toBeDefined();
  });
});
