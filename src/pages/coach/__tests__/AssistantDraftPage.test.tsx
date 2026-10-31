import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AssistantDraftPage } from '../AssistantDraftPage';
import { planDraftsService } from '../../../api/planDrafts';
import { exercisesService } from '../../../api/exercises';
import { structureService } from '../../../api/structureService';
import { PlanDraftResponse } from '../../../api/generated/asistente';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../../api/planDrafts', () => ({
  planDraftsService: {
    get: vi.fn(),
    update: vi.fn(),
    approve: vi.fn(),
    discard: vi.fn(),
  },
}));

vi.mock('../../../api/exercises', () => ({
  exercisesService: {
    search: vi.fn(),
  },
}));

vi.mock('../../../api/structureService', () => ({
  structureService: {
    getOrganizations: vi.fn(),
    getCategories: vi.fn(),
    getAthletes: vi.fn(),
  },
}));

describe('AssistantDraftPage (KAN-413)', () => {
  const sampleDraft: PlanDraftResponse = {
    id: 'draft-abc',
    goal: 'Aumento de masa muscular y fuerza',
    name: 'Plan de Fuerza Pretemporada',
    objective: 'Fuerza máxima y potencia',
    justificationSummary: 'Generado con 3 sesiones semanales enfocadas en tren inferior.',
    provider: 'Gemini',
    status: 'Draft',
    startDate: '2026-11-02',
    categoryId: 'cat-1',
    warnings: ['Ajustado por el partido del sábado 7/11: Sentadilla 85 % → 60 %'],
    weeks: [
      {
        weekNumber: 1,
        sessions: [
          {
            name: 'Sesión Lunes',
            dayOfWeek: 'Monday',
            order: 1,
            coachNotes: 'Controlar bajada',
            exercises: [
              {
                exerciseId: 'ex-1',
                order: 1,
                sets: 3,
                reps: 10,
                targetPercentage: 60,
              },
            ],
          },
        ],
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(planDraftsService.get).mockResolvedValue(sampleDraft);
    vi.mocked(exercisesService.search).mockResolvedValue({
      items: [
        {
          id: 'ex-1',
          name: 'Sentadilla con barra',
          muscleGroup: 'Piernas',
          equipment: 'Barra',
          images: [],
        },
      ],
      page: 1,
      totalPages: 1,
      totalCount: 1,
    });
    vi.mocked(structureService.getOrganizations).mockResolvedValue([
      { id: 'org-1', name: 'Club Atlético', description: null, categoriesCount: 1 },
    ]);
    vi.mocked(structureService.getCategories).mockResolvedValue([
      {
        id: 'cat-1',
        organizationId: 'org-1',
        name: 'Primera División',
        description: null,
        athletesCount: 15,
      },
    ]);
  });

  const renderPage = (initialDraft?: PlanDraftResponse) =>
    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/pf/assistant/drafts/draft-abc',
            state: initialDraft ? { draft: initialDraft } : undefined,
          },
        ]}
      >
        <Routes>
          <Route path="/pf/assistant/drafts/:draftId" element={<AssistantDraftPage />} />
        </Routes>
      </MemoryRouter>,
    );

  it('renderiza el borrador, el resumen de IA, los ajustes de partido y las semanas', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Plan de Fuerza Pretemporada')).toBeDefined();
    });

    expect(screen.getByText(/Proveedor: Gemini/i)).toBeDefined();
    expect(screen.getAllByText(/Categoría · Primera División/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Generado con 3 sesiones semanales/i)).toBeDefined();
    expect(
      screen.getByText(/Ajustado por el partido del sábado 7\/11: Sentadilla 85 % → 60 %/i),
    ).toBeDefined();
    expect(screen.getByText('Sentadilla con barra')).toBeDefined();
  });

  it('permite modificar repeticiones y guardar el borrador (PUT)', async () => {
    vi.mocked(planDraftsService.update).mockResolvedValue({
      ...sampleDraft,
      weeks: [
        {
          weekNumber: 1,
          sessions: [
            {
              ...sampleDraft.weeks[0].sessions[0],
              exercises: [
                {
                  ...sampleDraft.weeks[0].sessions[0].exercises[0],
                  reps: 12,
                },
              ],
            },
          ],
        },
      ],
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByLabelText(/Repeticiones de Sentadilla con barra/i)).toBeDefined();
    });

    const repsInput = screen.getByLabelText(/Repeticiones de Sentadilla con barra/i);
    fireEvent.change(repsInput, { target: { value: '12' } });

    expect(screen.getByText('Cambios sin guardar')).toBeDefined();

    const saveBtn = screen.getByRole('button', { name: /Guardar/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(planDraftsService.update).toHaveBeenCalled();
    });

    expect(await screen.findByText('Borrador guardado exitosamente.')).toBeDefined();
  });

  it('al presionar Aprobar y asignar llama a approve y redirige a la planificación creada', async () => {
    vi.mocked(planDraftsService.approve).mockResolvedValue({
      id: 'draft-abc',
      planId: 'plan-xyz',
      approvedPlanId: 'plan-xyz',
      status: 'Approved',
      assigned: true,
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Plan de Fuerza Pretemporada')).toBeDefined();
    });

    const approveButtons = screen.getAllByRole('button', { name: /Aprobar y asignar/i });
    fireEvent.click(approveButtons[0]);

    await waitFor(() => {
      expect(planDraftsService.approve).toHaveBeenCalledWith('draft-abc');
      expect(mockNavigate).toHaveBeenCalledWith('/pf/planning/plan-xyz', {
        state: { message: 'Planificación aprobada y asignada exitosamente.' },
      });
    });
  });

  it('si la planificación se creó pero falló la asignación, redirige con aviso de advertencia', async () => {
    vi.mocked(planDraftsService.approve).mockResolvedValue({
      id: 'draft-abc',
      planId: 'plan-xyz',
      approvedPlanId: 'plan-xyz',
      status: 'Approved',
      assigned: false,
      warning: 'No se pudo asignar a la categoría de forma automática.',
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Plan de Fuerza Pretemporada')).toBeDefined();
    });

    const approveButtons = screen.getAllByRole('button', { name: /Aprobar y asignar/i });
    fireEvent.click(approveButtons[0]);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/pf/planning/plan-xyz', {
        state: { warning: 'No se pudo asignar a la categoría de forma automática.' },
      });
    });
  });

  it('permite abrir el modal de descarte y confirmar el descarte (POST .../discard)', async () => {
    vi.mocked(planDraftsService.discard).mockResolvedValue({
      ...sampleDraft,
      status: 'Discarded',
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Plan de Fuerza Pretemporada')).toBeDefined();
    });

    const discardBtn = screen.getByRole('button', { name: 'Descartar' });
    fireEvent.click(discardBtn);

    expect(await screen.findByText('¿Descartar este borrador?')).toBeDefined();

    const confirmDiscardBtn = screen.getByRole('button', { name: 'Confirmar descarte' });
    fireEvent.click(confirmDiscardBtn);

    await waitFor(() => {
      expect(planDraftsService.discard).toHaveBeenCalledWith('draft-abc');
      expect(mockNavigate).toHaveBeenCalledWith('/pf/planning', {
        state: { message: 'El borrador de planificación fue descartado.' },
      });
    });
  });
});
