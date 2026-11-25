import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { AssignPlanModal } from '../AssignPlanModal';
import { structureService } from '../../../api/structureService';
import { trainingPlansService } from '../../../api/trainingPlans';
import { Athlete, Category, Organization } from '../../../types/structure';
import type { AssignPlanResponse } from '../../../api/generated/entrenamiento';

describe('AssignPlanModal (KAN-622)', () => {
  const sampleOrgs: Organization[] = [
    {
      id: 'org-1',
      name: 'Club Demo',
      description: 'Club deportivo',
      categoriesCount: 2,
      athletesCount: 10,
      hasPhoto: true,
      photoUpdatedAt: '2026-01-01T00:00:00Z',
    },
  ];

  const sampleCats: Category[] = [
    {
      id: 'cat-1',
      organizationId: 'org-1',
      name: 'Plantel Primera',
      description: 'Primera división',
      athletesCount: 5,
    },
    {
      id: 'cat-2',
      organizationId: 'org-1',
      name: 'Reserva',
      description: null,
      athletesCount: 3,
    },
  ];

  const sampleAthletes: Athlete[] = [
    {
      id: 'ath-1',
      accountId: 'acc-1',
      firstName: 'Agustina',
      lastName: 'Morales',
      fullName: 'Agustina Morales',
      email: 'agustina@test.com',
      phone: '123456789',
      isMinor: false,
      active: true,
      categories: [{ id: 'cat-1', name: 'Plantel Primera' }],
      categoryNames: ['Plantel Primera'],
      emergencyContact: null,
      activeInjuriesCount: 0,
      hasPhoto: true,
      photoUpdatedAt: '2026-02-01T00:00:00Z',
    },
    {
      id: 'ath-2',
      accountId: 'acc-2',
      firstName: 'Lucas',
      lastName: 'Gómez',
      fullName: 'Lucas Gómez',
      email: 'lucas@test.com',
      phone: '987654321',
      isMinor: true,
      active: true,
      categories: [{ id: 'cat-2', name: 'Reserva' }],
      categoryNames: ['Reserva'],
      emergencyContact: null,
      activeInjuriesCount: 0,
      hasPhoto: false,
      photoUpdatedAt: null,
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(structureService, 'getOrganizations').mockResolvedValue(sampleOrgs);
    vi.spyOn(structureService, 'getCategories').mockResolvedValue(sampleCats);
    vi.spyOn(structureService, 'getAthletes').mockResolvedValue(sampleAthletes);
    vi.spyOn(trainingPlansService, 'assign').mockResolvedValue({
      id: 'assign-1',
      startDate: '2026-11-20',
      endDate: '2026-12-18',
    } as unknown as AssignPlanResponse);
  });

  it('muestra la foto y nombre del atleta en la tarjeta de previsualización al abrir el modal (KAN-622)', async () => {
    render(
      <AssignPlanModal
        planId="plan-1"
        planName="Fuerza Máxima"
        onClose={vi.fn()}
        onAssigned={vi.fn()}
      />,
    );

    // Debe cargar los atletas
    await screen.findAllByText('Agustina Morales');

    // La tarjeta de previsualización muestra su foto, nombre y categoría
    const previewCard = screen.getByLabelText('Atleta seleccionado con foto');
    expect(previewCard).toBeDefined();
    expect(within(previewCard).getByText('Agustina Morales')).toBeDefined();
    expect(within(previewCard).getByText('Plantel Primera')).toBeDefined();
    expect(within(previewCard).getByText('Activo')).toBeDefined();

    // Verificamos que se renderice el avatar con el alt de la foto
    const avatarImg = screen.getAllByRole('img', { name: /foto de perfil de agustina morales/i });
    expect(avatarImg.length).toBeGreaterThan(0);
  });

  it('permite cambiar a "Una categoría" y muestra la foto/escudo y nombre de la categoría (KAN-622)', async () => {
    render(
      <AssignPlanModal
        planId="plan-1"
        planName="Fuerza Máxima"
        onClose={vi.fn()}
        onAssigned={vi.fn()}
      />,
    );

    await screen.findAllByText('Agustina Morales');

    const catPillBtn = screen.getByRole('button', { name: /una categoría/i });
    fireEvent.click(catPillBtn);

    // Debe mostrar la tarjeta de previsualización de categoría
    const previewCard = await screen.findByLabelText('Categoría seleccionada con foto');
    expect(previewCard).toBeDefined();
    expect(within(previewCard).getByText('Plantel Primera')).toBeDefined();
    expect(within(previewCard).getByText('Club Demo')).toBeDefined();
    expect(within(previewCard).getByText(/5 atletas/i)).toBeDefined();

    // Verificamos avatar de la organización
    const orgAvatar = screen.getAllByRole('img', { name: /foto de perfil de club demo/i });
    expect(orgAvatar.length).toBeGreaterThan(0);
  });

  it('abre el dropdown interactivo con fotos y permite elegir otro atleta (KAN-622)', async () => {
    render(
      <AssignPlanModal
        planId="plan-1"
        planName="Fuerza Máxima"
        onClose={vi.fn()}
        onAssigned={vi.fn()}
      />,
    );

    await screen.findAllByText('Agustina Morales');

    // Clic en el trigger del dropdown
    const triggerBtn = screen.getByLabelText('Desplegar lista de atletas');
    fireEvent.click(triggerBtn);

    // Debe aparecer la lista en el dropdown panel con Lucas Gómez
    const dropdown = screen.getByRole('listbox');
    const lucasOption = within(dropdown).getByRole('option', { name: /lucas gómez/i });
    expect(lucasOption).toBeDefined();

    // Al hacer click en Lucas Gómez, la tarjeta de previsualización se actualiza
    fireEvent.click(lucasOption);

    const previewCard = screen.getByLabelText('Atleta seleccionado con foto');
    expect(within(previewCard).getByText('Lucas Gómez')).toBeDefined();
    expect(within(previewCard).getByText('Menor')).toBeDefined();
    expect(within(previewCard).getByText('Reserva')).toBeDefined();
  });

  it('asigna la planificación correctamente llamando al servicio y a onAssigned', async () => {
    const onAssigned = vi.fn();
    const onClose = vi.fn();

    render(
      <AssignPlanModal
        planId="plan-1"
        planName="Fuerza Máxima"
        onClose={onClose}
        onAssigned={onAssigned}
      />,
    );

    await screen.findAllByText('Agustina Morales');

    const submitBtn = screen.getByRole('button', { name: /asignar planificación/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(trainingPlansService.assign).toHaveBeenCalledWith(
        'plan-1',
        expect.any(String),
        expect.objectContaining({ type: 'athlete', id: 'ath-1' }),
      );
      expect(onAssigned).toHaveBeenCalledWith(expect.stringContaining('Fuerza Máxima'));
    });
  });
});
