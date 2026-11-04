import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { ApplyPlanTemplateModal } from '../ApplyPlanTemplateModal';
import { structureService } from '../../../api/structureService';
import { trainingPlansService } from '../../../api/trainingPlans';
import { PlanTemplateItem } from '../../../types/trainingPlans';

const mockTemplate: PlanTemplateItem = {
  id: 'template-fuerza-2026',
  name: 'Pretemporada Fuerza 2026',
  objective: 'Fuerza base y potencia',
};

describe('ApplyPlanTemplateModal (KAN-440)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    vi.spyOn(structureService, 'getOrganizations').mockResolvedValue([
      { id: 'org-1', name: 'Club Atlético ProTraining', categoriesCount: 2 },
    ]);
    vi.spyOn(structureService, 'getCategories').mockResolvedValue([
      { id: 'cat-primera', organizationId: 'org-1', name: 'Primera División', athletesCount: 22 },
      { id: 'cat-sub20', organizationId: 'org-1', name: 'Sub-20', athletesCount: 18 },
    ]);
    vi.spyOn(structureService, 'getAthletes').mockResolvedValue([]);
  });

  it('aplica la plantilla con categoría y fecha enviando los datos correspondientes', async () => {
    const onAppliedMock = vi.fn();
    const onCloseMock = vi.fn();

    const applySpy = vi.spyOn(trainingPlansService, 'applyTemplate').mockResolvedValue({
      assignmentId: 'assignment-123',
      message: 'Plantilla aplicada exitosamente.',
    });

    render(
      <ApplyPlanTemplateModal
        template={mockTemplate}
        onClose={onCloseMock}
        onApplied={onAppliedMock}
      />,
    );

    expect(screen.getByText(/Pretemporada Fuerza 2026/i)).toBeDefined();

    const select = await screen.findByRole('combobox', { name: /categoría/i });
    fireEvent.change(select, { target: { value: 'cat-primera' } });

    const dateInput = screen.getByLabelText(/fecha de inicio/i);
    fireEvent.change(dateInput, { target: { value: '2026-11-10' } });

    fireEvent.click(screen.getByRole('button', { name: /aplicar y asignar/i }));

    await waitFor(() => {
      expect(applySpy).toHaveBeenCalledWith('template-fuerza-2026', {
        startDate: '2026-11-10',
        categoryId: 'cat-primera',
        athleteId: null,
      });
      expect(onAppliedMock).toHaveBeenCalled();
    });
  });

  it('muestra el mensaje de error del backend en el modal cuando la llamada falla', async () => {
    const onAppliedMock = vi.fn();
    const onCloseMock = vi.fn();

    vi.spyOn(trainingPlansService, 'applyTemplate').mockRejectedValue(
      new Error('La categoría ya tiene una planificación activa en esas fechas.'),
    );

    render(
      <ApplyPlanTemplateModal
        template={mockTemplate}
        onClose={onCloseMock}
        onApplied={onAppliedMock}
      />,
    );

    await screen.findByRole('combobox', { name: /categoría/i });

    fireEvent.click(screen.getByRole('button', { name: /aplicar y asignar/i }));

    await waitFor(() => {
      expect(
        screen.getByText('La categoría ya tiene una planificación activa en esas fechas.'),
      ).toBeDefined();
    });

    // El modal no se cierra si hay error
    expect(onAppliedMock).not.toHaveBeenCalled();
    expect(onCloseMock).not.toHaveBeenCalled();
  });

  it('cierra el modal al presionar el botón Cancelar', async () => {
    const onCloseMock = vi.fn();

    render(
      <ApplyPlanTemplateModal template={mockTemplate} onClose={onCloseMock} onApplied={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });
});
