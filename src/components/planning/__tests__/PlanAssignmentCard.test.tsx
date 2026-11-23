import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

  it('diferencia los músculos primarios en celeste y secundarios en gris en la tarjeta de asignación (KAN-623)', () => {
    render(
      <MemoryRouter>
        <PlanAssignmentCard
          assignment={mockAssignment}
          plan={{
            id: 'plan-101',
            name: 'Planificación fuerza',
            objective: 'Pecho y tríceps',
            primaryMuscles: ['chest'],
            secondaryMuscles: ['triceps'],
          }}
        />
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

  it('muestra el botón "Gestionar" con el contador y abre la gestión al hacer clic', () => {
    const onOpenManage = vi.fn();

    render(
      <MemoryRouter>
        <PlanAssignmentCard
          group={{
            trainingPlanId: 'plan-101',
            planName: 'Fuerza base',
            startDate: '2026-11-16',
            endDate: '2026-12-13',
            status: 'Active',
            assignees: [
              {
                assignmentId: 'assign-1',
                type: 'category',
                targetId: 'cat-1',
                name: 'Primera División',
                startDate: '2026-11-16',
                endDate: '2026-12-13',
                status: 'Active',
              },
              {
                assignmentId: 'assign-2',
                type: 'athlete',
                targetId: 'ath-1',
                name: 'Lucas Gómez',
                startDate: '2026-11-16',
                endDate: '2026-12-13',
                status: 'Active',
              },
            ],
          }}
          onOpenManage={onOpenManage}
        />
      </MemoryRouter>,
    );

    const manageBtn = screen.getByRole('button', {
      name: /ver y administrar 2 asignados a fuerza base/i,
    });
    expect(manageBtn.textContent).toContain('Gestionar');
    expect(manageBtn.textContent).toContain('2');

    fireEvent.click(manageBtn);
    expect(onOpenManage).toHaveBeenCalledTimes(1);
  });
});
