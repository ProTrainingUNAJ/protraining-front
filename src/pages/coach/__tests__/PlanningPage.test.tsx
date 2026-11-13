import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PlanningPage } from '../PlanningPage';
import { trainingPlansService } from '../../../api/trainingPlans';
import { structureService } from '../../../api/structureService';

describe('PlanningPage - Catálogo de Plantillas (KAN-440)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    vi.spyOn(trainingPlansService, 'list').mockResolvedValue([]);
    vi.spyOn(trainingPlansService, 'listTemplates').mockResolvedValue([
      { id: 'tpl-1', name: 'Pretemporada Fuerza 2026', objective: 'Fuerza precompetitiva' },
      { id: 'tpl-2', name: 'Hipertrofia Base', objective: 'Aumento de masa muscular' },
    ]);
    vi.spyOn(structureService, 'getOrganizations').mockResolvedValue([]);
    vi.spyOn(structureService, 'getCategories').mockResolvedValue([]);
    vi.spyOn(structureService, 'getAthletes').mockResolvedValue([]);
  });

  it('cambia a la pestaña de plantillas, lista el catálogo y filtra por buscador', async () => {
    render(
      <MemoryRouter initialEntries={['/pf/planning?tab=templates']}>
        <PlanningPage />
      </MemoryRouter>,
    );

    // Espera a que se carguen las plantillas
    expect(await screen.findByText('Pretemporada Fuerza 2026')).toBeDefined();
    expect(screen.getByText('Hipertrofia Base')).toBeDefined();

    // Filtra con el buscador
    const searchInput = screen.getByRole('searchbox', { name: /buscar plantilla/i });
    fireEvent.change(searchInput, { target: { value: 'Pretemporada' } });

    expect(screen.getByText('Pretemporada Fuerza 2026')).toBeDefined();
    expect(screen.queryByText('Hipertrofia Base')).toBeNull();
  });

  it('abre el modal de aplicación al tocar "Aplicar a categoría"', async () => {
    render(
      <MemoryRouter initialEntries={['/pf/planning?tab=templates']}>
        <PlanningPage />
      </MemoryRouter>,
    );

    const applyButton = await screen.findByRole('button', {
      name: /aplicar plantilla pretemporada fuerza 2026/i,
    });
    fireEvent.click(applyButton);

    // Debe abrir el modal
    expect(screen.getByRole('dialog', { name: /aplicar plantilla/i })).toBeDefined();
  });
});
