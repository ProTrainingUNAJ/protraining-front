import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HabitsPendingWidget } from '../HabitsPendingWidget';
import { recommendationsService } from '../../../api/recommendations';
import { structureService } from '../../../api/structureService';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});
vi.mock('../../../api/recommendations', () => ({
  recommendationsService: { listRecommendations: vi.fn() },
}));
vi.mock('../../../api/structureService', () => ({
  structureService: { getAthletes: vi.fn() },
}));

const listMock = vi.mocked(recommendationsService.listRecommendations);

function rec(id: string, athleteId: string, title: string, type: 'Habits' | 'Training' = 'Habits') {
  return {
    id,
    athleteId,
    type,
    status: 'Pending' as const,
    title,
    reason: '',
    recommendationText: '',
    provider: 'rules',
    metrics: [],
    createdAt: '2026-11-22T10:00:00Z',
    updatedAt: '2026-11-22T10:00:00Z',
  };
}

function renderWidget() {
  return render(
    <MemoryRouter>
      <HabitsPendingWidget />
    </MemoryRouter>,
  );
}

describe('HabitsPendingWidget (KAN-594)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(structureService.getAthletes).mockResolvedValue([
      { id: 'a-1', firstName: 'Martín', lastName: 'Pérez', fullName: 'Martín Pérez' } as never,
    ]);
  });

  it('muestra las primeras 3 pendientes con el atleta y lleva a Recomendaciones', async () => {
    listMock.mockResolvedValue([
      rec('r-1', 'a-1', 'Más proteína en la cena'),
      rec('r-2', 'a-1', 'Dormir 8 horas', 'Habits'),
      rec('r-3', 'a-9', 'Bajar volumen', 'Training'),
      rec('r-4', 'a-1', 'Hidratarse'),
    ]);

    renderWidget();

    expect(await screen.findByText('Más proteína en la cena')).toBeDefined();
    expect(screen.getAllByText('Martín Pérez')).toHaveLength(2);
    expect(screen.getByText('Atleta')).toBeDefined();
    expect(screen.getByText('Entrenamiento')).toBeDefined();
    expect(screen.queryByText('Hidratarse')).toBeNull();
    expect(screen.getByText('y 1 más')).toBeDefined();
    expect(screen.getByText('4')).toBeDefined();
    expect(listMock).toHaveBeenCalledWith({ status: 'Pending' });

    fireEvent.click(screen.getByRole('button', { name: /Revisar/ }));
    expect(navigateMock).toHaveBeenCalledWith('/pf/recommendations');
  });

  it('sin pendientes muestra el mensaje vacío', async () => {
    listMock.mockResolvedValue([]);
    renderWidget();
    expect(await screen.findByText('No hay recomendaciones esperando tu OK.')).toBeDefined();
  });

  it('si falla muestra el error con Reintentar, no un cero', async () => {
    listMock.mockRejectedValueOnce(new Error('El Asistente no responde.'));
    listMock.mockResolvedValueOnce([]);
    renderWidget();

    expect(await screen.findByText('El Asistente no responde.')).toBeDefined();
    expect(screen.queryByText('0')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Reintentar/ }));
    expect(await screen.findByText('No hay recomendaciones esperando tu OK.')).toBeDefined();
  });
});
