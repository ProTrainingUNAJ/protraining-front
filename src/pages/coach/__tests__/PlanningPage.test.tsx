import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PlanningPage } from '../PlanningPage';
import { trainingPlansService } from '../../../api/trainingPlans';
import { structureService } from '../../../api/structureService';

describe('PlanningPage (KAN-440 / KAN-622)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    vi.spyOn(trainingPlansService, 'list').mockResolvedValue([
      { id: 'plan-1', name: 'Potencia Tren Superior', objective: 'Fuerza explosiva' },
      { id: 'plan-2', name: 'Hipertrofia Piernas', objective: 'Volumen muscular' },
      { id: 'plan-3', name: 'Plan IA Resistencia', objective: 'Generado con IA' },
    ]);
    vi.spyOn(trainingPlansService, 'listTemplates').mockResolvedValue([
      { id: 'tpl-1', name: 'Pretemporada Fuerza 2026', objective: 'Fuerza precompetitiva' },
      { id: 'tpl-2', name: 'Hipertrofia Base', objective: 'Aumento de masa muscular' },
    ]);
    vi.spyOn(trainingPlansService, 'listAssignments').mockResolvedValue([]);
    vi.spyOn(structureService, 'getOrganizations').mockResolvedValue([]);
    vi.spyOn(structureService, 'getCategories').mockResolvedValue([]);
    vi.spyOn(structureService, 'getAthletes').mockResolvedValue([]);
  });

  it('lista las planificaciones en Grid y muestra contadores en las pestañas (KAN-622)', async () => {
    render(
      <MemoryRouter initialEntries={['/pf/planning']}>
        <PlanningPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Potencia Tren Superior')).toBeDefined();
    expect(screen.getByText('Hipertrofia Piernas')).toBeDefined();
    expect(screen.getByText('Plan IA Resistencia')).toBeDefined();

    // Contador en pestaña
    expect(screen.getByText('3')).toBeDefined();
  });

  it('filtra las tarjetas con el buscador reactivo por nombre y objetivo deportivo (KAN-622)', async () => {
    render(
      <MemoryRouter initialEntries={['/pf/planning']}>
        <PlanningPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Potencia Tren Superior')).toBeDefined();

    const searchInput = screen.getByRole('searchbox', { name: /buscar planificación/i });
    fireEvent.change(searchInput, { target: { value: 'Piernas' } });

    expect(screen.getByText('Hipertrofia Piernas')).toBeDefined();
    expect(screen.queryByText('Potencia Tren Superior')).toBeNull();

    // Limpia la búsqueda
    const clearBtn = screen.getByRole('button', { name: /borrar texto de búsqueda/i });
    fireEvent.click(clearBtn);

    expect(screen.getByText('Potencia Tren Superior')).toBeDefined();
    expect(screen.getByText('Hipertrofia Piernas')).toBeDefined();
  });

  it('muestra estado amigable y botón de limpieza si no hay resultados en la búsqueda (KAN-622)', async () => {
    render(
      <MemoryRouter initialEntries={['/pf/planning']}>
        <PlanningPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Potencia Tren Superior')).toBeDefined();

    const searchInput = screen.getByRole('searchbox', { name: /buscar planificación/i });
    fireEvent.change(searchInput, { target: { value: 'Inexistente 123' } });

    expect(screen.getByText(/no se encontraron planificaciones que coincidan con/i)).toBeDefined();

    const resetBtn = screen.getByRole('button', { name: /limpiar búsqueda/i });
    fireEvent.click(resetBtn);

    expect(screen.getByText('Potencia Tren Superior')).toBeDefined();
  });

  it('abre el modal de asignación rápida al hacer clic en Asignar en una tarjeta (KAN-622)', async () => {
    render(
      <MemoryRouter initialEntries={['/pf/planning']}>
        <PlanningPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Potencia Tren Superior')).toBeDefined();

    const assignBtn = screen.getByRole('button', { name: /asignar potencia tren superior/i });
    fireEvent.click(assignBtn);

    // Debe abrir el modal de asignación
    expect(screen.getByRole('dialog', { name: /asignar planificación/i })).toBeDefined();
  });

  it('cambia a la pestaña de plantillas, lista el catálogo y filtra por buscador (KAN-440)', async () => {
    render(
      <MemoryRouter initialEntries={['/pf/planning?tab=templates']}>
        <PlanningPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Pretemporada Fuerza 2026')).toBeDefined();
    expect(screen.getByText('Hipertrofia Base')).toBeDefined();

    const searchInput = screen.getByRole('searchbox', { name: /buscar plantilla/i });
    fireEvent.change(searchInput, { target: { value: 'Pretemporada' } });

    expect(screen.getByText('Pretemporada Fuerza 2026')).toBeDefined();
    expect(screen.queryByText('Hipertrofia Base')).toBeNull();
  });

  it('abre el modal de aplicación al tocar "Aplicar a categoría" (KAN-440)', async () => {
    render(
      <MemoryRouter initialEntries={['/pf/planning?tab=templates']}>
        <PlanningPage />
      </MemoryRouter>,
    );

    const applyButton = await screen.findByRole('button', {
      name: /aplicar plantilla pretemporada fuerza 2026/i,
    });
    fireEvent.click(applyButton);

    expect(screen.getByRole('dialog', { name: /aplicar plantilla/i })).toBeDefined();
  });

  it('cambia a la pestaña de asignaciones y renderiza las tarjetas en grid similar a Mis Planificaciones (KAN-623)', async () => {
    vi.spyOn(trainingPlansService, 'listAssignments').mockResolvedValue([
      {
        assignmentId: 'assign-1',
        trainingPlanId: 'plan-1',
        planName: 'Potencia Tren Superior',
        startDate: '2026-11-16',
        endDate: '2026-12-13',
        status: 'Active',
      },
      {
        assignmentId: 'assign-2',
        trainingPlanId: 'plan-2',
        planName: 'Hipertrofia Piernas',
        startDate: '2026-10-01',
        endDate: '2026-10-31',
        status: 'Finished',
      },
    ]);

    render(
      <MemoryRouter initialEntries={['/pf/planning?tab=assignments']}>
        <PlanningPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Potencia Tren Superior')).toBeDefined();
    expect(screen.getByText('Activa')).toBeDefined();
    expect(screen.getByText('Hipertrofia Piernas')).toBeDefined();
    expect(screen.getByText('Terminada')).toBeDefined();

    // Verificamos que tenga el buscador de asignaciones
    const searchInput = screen.getByRole('searchbox', { name: /buscar asignación/i });
    fireEvent.change(searchInput, { target: { value: 'Piernas' } });

    expect(screen.getByText('Hipertrofia Piernas')).toBeDefined();
    expect(screen.queryByText('Potencia Tren Superior')).toBeNull();
  });
});
