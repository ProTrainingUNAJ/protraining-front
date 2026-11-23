import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { GeneratePlanDraftPage } from '../GeneratePlanDraftPage';
import { structureService } from '../../../api/structureService';
import { planDraftsService } from '../../../api/planDrafts';
import { PlanDraftResponse } from '../../../api/generated/asistente';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../../api/structureService', () => ({
  structureService: {
    getOrganizations: vi.fn(),
    getCategories: vi.fn(),
    getAthletes: vi.fn(),
  },
}));

vi.mock('../../../api/planDrafts', () => ({
  planDraftsService: {
    create: vi.fn(),
  },
  isPlanDraftCanceled: vi.fn(() => false),
}));

describe('GeneratePlanDraftPage (KAN-629)', () => {
  const createdDraft: PlanDraftResponse = {
    id: 'draft-1-day',
    goal: 'Fuerza de piernas',
    name: 'Plan 1 día',
    objective: 'Fuerza',
    justificationSummary: 'Sesión única semanal.',
    provider: 'RuleBased',
    status: 'Draft',
    startDate: '2026-11-23',
    categoryId: 'cat-1',
    warnings: [],
    weeks: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(structureService.getOrganizations).mockResolvedValue([
      { id: 'org-1', name: 'Club Quilmes', description: null, categoriesCount: 1 },
    ]);
    vi.mocked(structureService.getCategories).mockResolvedValue([
      {
        id: 'cat-1',
        organizationId: 'org-1',
        name: 'Primera División',
        description: null,
        athletesCount: 10,
      },
    ]);
    vi.mocked(structureService.getAthletes).mockResolvedValue([]);
    vi.mocked(planDraftsService.create).mockResolvedValue(createdDraft);
  });

  const renderPage = () =>
    render(
      <MemoryRouter>
        <GeneratePlanDraftPage />
      </MemoryRouter>,
    );

  it('sincroniza Días por semana al deseleccionar días hasta dejar 1 solo día y permite generar el borrador', async () => {
    renderPage();

    await waitFor(() => {
      expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('cat-1');
    });

    const daysInput = screen.getByLabelText(/Días por semana/i) as HTMLInputElement;
    expect(daysInput.value).toBe('3');

    fireEvent.click(screen.getByRole('button', { name: 'Miércoles' }));
    expect(daysInput.value).toBe('2');

    fireEvent.click(screen.getByRole('button', { name: 'Viernes' }));
    expect(daysInput.value).toBe('1');
    expect(screen.getByRole('button', { name: 'Lunes' }).getAttribute('aria-pressed')).toBe('true');

    fireEvent.change(screen.getByLabelText(/Objetivo/i), {
      target: { value: 'Fuerza de piernas 1 día semanal' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Generar borrador/i }));

    await waitFor(() => {
      expect(planDraftsService.create).toHaveBeenCalledTimes(1);
    });

    expect(planDraftsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        categoryId: 'cat-1',
        athleteId: null,
        goal: 'Fuerza de piernas 1 día semanal',
        daysPerWeek: 1,
        trainingDays: ['Monday'],
      }),
      expect.any(AbortSignal),
    );
    expect(screen.queryByText(/Elegí 3 días de la semana/i)).toBeNull();
    expect(mockNavigate).toHaveBeenCalledWith('/pf/assistant/drafts/draft-1-day', {
      state: { draft: createdDraft },
    });
  });

  it('sincroniza la botonera a Lunes al ingresar manualmente 1 en Días por semana y permite enviar', async () => {
    renderPage();

    await waitFor(() => {
      expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('cat-1');
    });

    const daysInput = screen.getByLabelText(/Días por semana/i) as HTMLInputElement;
    fireEvent.change(daysInput, { target: { value: '1' } });

    expect(daysInput.value).toBe('1');
    expect(screen.getByRole('button', { name: 'Lunes' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Miércoles' }).getAttribute('aria-pressed')).toBe(
      'false',
    );
    expect(screen.getByRole('button', { name: 'Viernes' }).getAttribute('aria-pressed')).toBe(
      'false',
    );

    fireEvent.change(screen.getByLabelText(/Objetivo/i), {
      target: { value: 'Mantenimiento semanal' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Generar borrador/i }));

    await waitFor(() => {
      expect(planDraftsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          daysPerWeek: 1,
          trainingDays: ['Monday'],
        }),
        expect.any(AbortSignal),
      );
    });
  });

  it('actualiza Días por semana al sumar días hasta 6 y bloquea marcar un séptimo día', async () => {
    renderPage();

    await waitFor(() => {
      expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('cat-1');
    });

    const daysInput = screen.getByLabelText(/Días por semana/i) as HTMLInputElement;

    fireEvent.click(screen.getByRole('button', { name: 'Martes' }));
    fireEvent.click(screen.getByRole('button', { name: 'Jueves' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sábado' }));

    expect(daysInput.value).toBe('6');

    fireEvent.click(screen.getByRole('button', { name: 'Domingo' }));

    expect(daysInput.value).toBe('6');
    expect(screen.getByRole('button', { name: 'Domingo' }).getAttribute('aria-pressed')).toBe(
      'false',
    );
    expect(screen.getByText('Podés elegir como máximo 6 días por semana.')).toBeTruthy();
  });

  it('muestra error de validación si se desmarcan todos los días', async () => {
    renderPage();

    await waitFor(() => {
      expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('cat-1');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Lunes' }));
    fireEvent.click(screen.getByRole('button', { name: 'Miércoles' }));
    fireEvent.click(screen.getByRole('button', { name: 'Viernes' }));

    fireEvent.change(screen.getByLabelText(/Objetivo/i), {
      target: { value: 'Resistencia aeróbica' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Generar borrador/i }));

    expect(screen.getByText('Elegí al menos un día de entrenamiento.')).toBeTruthy();
    expect(planDraftsService.create).not.toHaveBeenCalled();
  });
});
