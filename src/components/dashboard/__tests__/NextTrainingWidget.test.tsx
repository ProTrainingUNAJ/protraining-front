import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NextTrainingWidget } from '../NextTrainingWidget';
import { trainingPlansService } from '../../../api/trainingPlans';
import { structureService } from '../../../api/structureService';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock('../../../api/trainingPlans', () => ({
  trainingPlansService: { schedule: vi.fn() },
}));

vi.mock('../../../api/structureService', () => ({
  structureService: {
    getOrganizations: vi.fn(),
    getCategories: vi.fn(),
  },
}));

vi.mock('../../../utils/argentinaDate', () => ({
  todayInArgentina: () => '2026-11-22',
  nowTimeInArgentina: () => '10:00',
}));

const scheduleMock = vi.mocked(trainingPlansService.schedule);

function renderWidget() {
  return render(
    <MemoryRouter>
      <NextTrainingWidget />
    </MemoryRouter>,
  );
}

describe('NextTrainingWidget (KAN-583)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(structureService.getOrganizations).mockResolvedValue([
      { id: 'org-1', name: 'Club Quilmes' } as never,
    ]);
    vi.mocked(structureService.getCategories).mockResolvedValue([
      { id: 'cat-1', organizationId: 'org-1', name: 'Primera', athletesCount: 20 },
    ]);
  });

  it('muestra el próximo entrenamiento con club, categoría, plan y hora, y abre la planificación', async () => {
    scheduleMock.mockImplementation(async (date: string) =>
      date === '2026-11-24'
        ? [
            {
              assignmentId: 'as-1',
              trainingPlanId: 'plan-42',
              planName: 'Pretemporada',
              sessionId: 's-1',
              sessionName: 'Fuerza tren inferior',
              weekNumber: 2,
              categoryId: 'cat-1',
              exerciseCount: 6,
              startTime: '17:30:00',
            },
          ]
        : [],
    );

    renderWidget();

    await waitFor(() => expect(screen.getByText('Fuerza tren inferior')).toBeDefined());
    expect(screen.getByText('17:30')).toBeDefined();
    expect(screen.getByText('Club Quilmes · Primera')).toBeDefined();
    expect(screen.getByText(/Pretemporada · Semana 2 · 6 ejercicios/)).toBeDefined();
    expect(screen.getByText('martes 24/11')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: /Ver planificación/ }));
    expect(navigateMock).toHaveBeenCalledWith('/pf/planning/plan-42');
  });

  it('sin entrenamientos en la semana lo dice y ofrece ir a planificación', async () => {
    scheduleMock.mockResolvedValue([]);

    renderWidget();

    await waitFor(() =>
      expect(screen.getByText('No hay entrenamientos en los próximos 7 días.')).toBeDefined(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Ir a planificación' }));
    expect(navigateMock).toHaveBeenCalledWith('/pf/planning');
  });

  it('si la agenda no responde muestra un error, sin datos de ejemplo', async () => {
    scheduleMock.mockRejectedValue(new Error('caído'));

    renderWidget();

    await waitFor(() => expect(screen.getByText('No pudimos cargar la agenda.')).toBeDefined());
    expect(screen.queryByText(/Predio/)).toBeNull();
  });
});
