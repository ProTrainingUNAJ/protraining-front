import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PlanEditorPage } from '../PlanEditorPage';
import { trainingPlansService } from '../../../api/trainingPlans';
import { structureService } from '../../../api/structureService';
import type { TrainingPlanDetail } from '../../../api/generated/entrenamiento';

describe('PlanEditorPage (KAN-623)', () => {
  const samplePlanResponse = {
    id: 'plan-100',
    name: 'Plan de Fuerza Explosiva',
    objective: 'Potencia',
    weeksCount: 4,
    daysPerWeek: 3,
    status: 'Draft',
    weeks: [
      {
        id: 'w-1',
        weekNumber: 1,
        sessions: [
          {
            id: 's-1',
            dayOfWeek: 1,
            name: 'Lunes Potencia',
            sessionOrder: 1,
            blockKey: 'b-1',
            blockTitle: 'Entrada en calor',
            exercises: [
              {
                id: 'e-1',
                exerciseId: 'ex-1',
                exerciseName: 'Sentadilla con Salto',
                exerciseType: 'Weight',
                order: 1,
                sets: 4,
                reps: '5',
                weight: '60kg',
                intensity: 'RPE 8',
                progressionType: 'Linear',
              },
            ],
          },
        ],
      },
      {
        id: 'w-2',
        weekNumber: 2,
        sessions: [],
      },
    ],
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(trainingPlansService, 'get').mockResolvedValue(
      samplePlanResponse as unknown as TrainingPlanDetail,
    );
    vi.spyOn(trainingPlansService, 'listTemplates').mockResolvedValue([]);
    vi.spyOn(structureService, 'getCategories').mockResolvedValue([]);
    vi.spyOn(structureService, 'getAthletes').mockResolvedValue([]);
  });

  it('renderiza el header compacto del Builder de planificación con input de nombre (KAN-623)', async () => {
    render(
      <MemoryRouter initialEntries={['/pf/planning/plan-100/edit']}>
        <Routes>
          <Route path="/pf/planning/:planId/edit" element={<PlanEditorPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const nameInput = (await screen.findByLabelText(
      'Nombre de la planificación',
    )) as HTMLInputElement;
    expect(nameInput).toBeDefined();
    expect(nameInput.value).toBe('Plan de Fuerza Explosiva');

    // Header compacto
    expect(screen.getByLabelText('Controles de la planificación')).toBeDefined();
    // Selector de modo
    expect(screen.getByRole('button', { name: /por bloques/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /por semanas/i })).toBeDefined();
  });

  it('permite modificar el nombre de la planificación inline y muestra indicador de cambios sin guardar (KAN-623)', async () => {
    render(
      <MemoryRouter initialEntries={['/pf/planning/plan-100/edit']}>
        <Routes>
          <Route path="/pf/planning/:planId/edit" element={<PlanEditorPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const nameInput = await screen.findByLabelText('Nombre de la planificación');
    fireEvent.change(nameInput, { target: { value: 'Plan Modificado 2026' } });

    expect(screen.getByText('Cambios sin guardar')).toBeDefined();
  });

  it('permite alternar entre la vista Por Bloques y Por Semanas (KAN-623)', async () => {
    render(
      <MemoryRouter initialEntries={['/pf/planning/plan-100/edit']}>
        <Routes>
          <Route path="/pf/planning/:planId/edit" element={<PlanEditorPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const btnSemanas = await screen.findByRole('button', { name: /por semanas/i });
    fireEvent.click(btnSemanas);

    // Debe mostrar la vista de semanas con botón Agregar semana
    expect(screen.getByRole('button', { name: /agregar semana/i })).toBeDefined();

    const btnBloques = screen.getByRole('button', { name: /por bloques/i });
    fireEvent.click(btnBloques);

    // Vuelve a la vista por bloques con resumen de volumen
    expect(screen.getByLabelText('Días de entrenamiento')).toBeDefined();
  });
});
