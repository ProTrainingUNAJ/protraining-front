import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RecommendationsPage } from '../RecommendationsPage';
import type { AthleteRecommendation } from '../../../api/recommendations';

const {
  listRecommendationsMock,
  generateForCategoryMock,
  updateRecommendationMock,
  approveRecommendationMock,
  discardRecommendationMock,
  getCategoriesMock,
  getAthletesMock,
} = vi.hoisted(() => ({
  listRecommendationsMock: vi.fn(),
  generateForCategoryMock: vi.fn(),
  updateRecommendationMock: vi.fn(),
  approveRecommendationMock: vi.fn(),
  discardRecommendationMock: vi.fn(),
  getCategoriesMock: vi.fn(),
  getAthletesMock: vi.fn(),
}));

vi.mock('../../../api/recommendations', () => ({
  recommendationsService: {
    listRecommendations: listRecommendationsMock,
    generateForCategory: generateForCategoryMock,
    updateRecommendation: updateRecommendationMock,
    approveRecommendation: approveRecommendationMock,
    discardRecommendation: discardRecommendationMock,
  },
}));

vi.mock('../../../api/structureService', () => ({
  structureService: {
    getCategories: getCategoriesMock,
    getAthletes: getAthletesMock,
  },
}));

const pendingRec: AthleteRecommendation = {
  id: 'rec-1',
  athleteId: 'ath-1',
  categoryId: 'cat-1',
  categoryName: 'Primera División',
  type: 'Training',
  status: 'Pending',
  title: 'Ajuste de potencia de salto',
  reason: 'salto por debajo del promedio',
  recommendationText: 'Sumar dos bloques de saltos pliométricos controlados por semana.',
  provider: 'Reglas',
  metrics: [
    {
      dimension: 'Salto Vertical CMJ (cm)',
      athleteValue: 34,
      groupAverage: 42,
      unit: 'cm',
      percentageDifference: -19,
      trend: 'Por debajo del promedio (-19.0%)',
    },
  ],
  trends: {
    weeksEvaluated: 4,
    trendLabel: 'Tendencia estable',
  },
  createdAt: '2026-11-19T15:00:00Z',
  updatedAt: '2026-11-19T15:00:00Z',
  reviewedAtUtc: null,
};

function renderPage() {
  return render(
    <MemoryRouter>
      <RecommendationsPage />
    </MemoryRouter>,
  );
}

describe('RecommendationsPage (KAN-492)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCategoriesMock.mockResolvedValue([
      { id: 'cat-1', organizationId: 'org-1', name: 'Primera División', athletesCount: 10 },
      { id: 'cat-2', organizationId: 'org-1', name: 'Reserva', athletesCount: 8 },
    ]);
    getAthletesMock.mockResolvedValue([
      {
        id: 'ath-1',
        firstName: 'Lucas',
        lastName: 'Gómez',
        fullName: 'Lucas Gómez',
        active: true,
        categories: [],
      },
    ]);
    listRecommendationsMock.mockResolvedValue([pendingRec]);
  });

  it('muestra recomendaciones pendientes con el nombre del atleta, motivo y datos de respaldo', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Lucas Gómez')).toBeDefined();
    });

    // Incluso con 1 recomendación arranca comprimida con contador y chip capitalizado
    expect(screen.getByText('Salto por debajo del promedio')).toBeDefined();
    expect(screen.getByText('1 pendiente')).toBeDefined();
    expect(screen.queryByText('Ajuste de potencia de salto')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Ver recomendación/i }));

    expect(screen.getByText('Ajuste de potencia de salto')).toBeDefined();
    expect(
      screen.getByText('Sumar dos bloques de saltos pliométricos controlados por semana.'),
    ).toBeDefined();

    const discardBtn = screen.getByRole('button', { name: /Descartar/i });
    expect(discardBtn.className).toContain('recommendation-btn-discard');

    expect(screen.getByRole('tab', { name: /Pendientes/i }).className).toContain('status-pending');
    expect(screen.getByRole('tab', { name: /Aprobadas/i }).className).toContain('status-approved');
    expect(screen.getByRole('tab', { name: /Descartadas/i }).className).toContain(
      'status-discarded',
    );

    fireEvent.click(screen.getByRole('button', { name: /Ver datos de respaldo/i }));
    expect(screen.getByText('Salto Vertical CMJ (cm)')).toBeDefined();
    expect(screen.getByText('Tendencia estable')).toBeDefined();
  });

  it('permite editar título y texto manteniendo el motivo inmutable', async () => {
    updateRecommendationMock.mockResolvedValue({
      ...pendingRec,
      title: 'Foco en saltos cortos',
      recommendationText: '3x5 saltos al cajón martes y jueves.',
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Lucas Gómez')).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /Ver recomendación/i }));
    fireEvent.click(screen.getByRole('button', { name: /Editar/i }));

    // El motivo sigue visible capitalizado pero no tiene input editable
    expect(screen.getAllByText('Salto por debajo del promedio').length).toBeGreaterThanOrEqual(1);

    const titleInput = screen.getByLabelText('Título');
    const textInput = screen.getByLabelText('Texto para el atleta');

    fireEvent.change(titleInput, { target: { value: 'Foco en saltos cortos' } });
    fireEvent.change(textInput, { target: { value: '3x5 saltos al cajón martes y jueves.' } });

    fireEvent.click(screen.getByRole('button', { name: /Guardar cambios/i }));

    await waitFor(() => {
      expect(updateRecommendationMock).toHaveBeenCalledWith('rec-1', {
        title: 'Foco en saltos cortos',
        recommendationText: '3x5 saltos al cajón martes y jueves.',
      });
    });

    expect(screen.getByText('Foco en saltos cortos')).toBeDefined();
  });

  it('aprueba una recomendación pendiente y la mueve a la pestaña Aprobadas', async () => {
    approveRecommendationMock.mockResolvedValue({
      ...pendingRec,
      status: 'Approved',
      reviewedAtUtc: '2026-11-19T17:10:00Z',
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Lucas Gómez')).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /Ver recomendación/i }));
    fireEvent.click(
      screen.getByRole('button', { name: /Aprobar y enviar recomendación a Lucas Gómez/i }),
    );

    await waitFor(() => {
      expect(approveRecommendationMock).toHaveBeenCalledWith('rec-1', undefined);
    });

    await waitFor(() => {
      expect(screen.getByText('No hay recomendaciones pendientes')).toBeDefined();
    });

    fireEvent.click(screen.getByRole('tab', { name: /Aprobadas/i }));
    expect(screen.getByText('Lucas Gómez')).toBeDefined();
    expect(screen.getByText('1 aprobada')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /Ver recomendación/i }));
    expect(screen.getByText('Ajuste de potencia de salto')).toBeDefined();
  });

  it('permite guardar y aprobar en un solo paso desde el modo edición', async () => {
    approveRecommendationMock.mockResolvedValue({
      ...pendingRec,
      title: 'Título ajustado',
      recommendationText: 'Texto ajustado para el atleta.',
      status: 'Approved',
      reviewedAtUtc: '2026-11-19T17:15:00Z',
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Lucas Gómez')).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /Ver recomendación/i }));
    fireEvent.click(screen.getByRole('button', { name: /Editar/i }));
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Título ajustado' } });
    fireEvent.change(screen.getByLabelText('Texto para el atleta'), {
      target: { value: 'Texto ajustado para el atleta.' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Guardar y aprobar/i }));

    await waitFor(() => {
      expect(approveRecommendationMock).toHaveBeenCalledWith('rec-1', {
        title: 'Título ajustado',
        recommendationText: 'Texto ajustado para el atleta.',
      });
    });
  });

  it('descarta una recomendación tras confirmar y la mueve a Descartadas', async () => {
    discardRecommendationMock.mockResolvedValue({
      ...pendingRec,
      status: 'Discarded',
      reviewedAtUtc: '2026-11-19T17:12:00Z',
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Lucas Gómez')).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /Ver recomendación/i }));
    fireEvent.click(screen.getByRole('button', { name: /Descartar/i }));
    fireEvent.click(screen.getByRole('button', { name: /Confirmar descarte/i }));

    await waitFor(() => {
      expect(discardRecommendationMock).toHaveBeenCalledWith('rec-1');
    });

    fireEvent.click(screen.getByRole('tab', { name: /Descartadas/i }));
    expect(screen.getByText('Lucas Gómez')).toBeDefined();
  });

  it('deshabilita el botón sin categoría seleccionada y ejecuta el motor al elegir una (KAN-512)', async () => {
    generateForCategoryMock.mockResolvedValue({
      categoryId: 'cat-1',
      categoryName: 'Primera División',
      evaluatedAthletes: 10,
      generatedCount: 2,
      existingPendingCount: 0,
      recommendations: [pendingRec],
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Lucas Gómez')).toBeDefined();
    });

    // Sin categoría seleccionada ("Todas las categorías"), el botón está deshabilitado
    const defaultBtn = screen.getByRole('button', { name: /Analizar plantel/i });
    expect((defaultBtn as HTMLButtonElement).disabled).toBe(true);

    // Seleccionamos Primera División
    fireEvent.change(screen.getByLabelText(/Filtrar por categoría/i), {
      target: { value: 'cat-1' },
    });

    const analyzeBtn = screen.getByRole('button', { name: /Analizar: Primera División/i });
    expect((analyzeBtn as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(analyzeBtn);

    await waitFor(() => {
      expect(generateForCategoryMock).toHaveBeenCalledWith('cat-1', 4);
    });

    await waitFor(() => {
      expect(screen.getByText(/Se generaron 2 nuevas recomendaciones pendientes/i)).toBeDefined();
    });
  });

  it('agrupa múltiples recomendaciones del mismo atleta en una sola tarjeta colapsable con contador', async () => {
    const secondRec: AthleteRecommendation = {
      ...pendingRec,
      id: 'rec-2',
      title: 'Ajuste de velocidad',
      reason: 'velocidad por debajo del promedio',
      recommendationText: 'Incluir sprints cortos con recuperación completa.',
      metrics: [],
      trends: null,
    };
    listRecommendationsMock.mockResolvedValue([pendingRec, secondRec]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Lucas Gómez')).toBeDefined();
    });

    // El nombre del atleta aparece una sola vez aunque tenga 2 recomendaciones
    expect(screen.getAllByText('Lucas Gómez')).toHaveLength(1);
    expect(screen.getByText('2 pendientes')).toBeDefined();
    expect(screen.getByText('Salto por debajo del promedio')).toBeDefined();
    expect(screen.getByText('Velocidad por debajo del promedio')).toBeDefined();

    // Arranca colapsada cuando tiene 2 o más
    expect(screen.queryByText('Ajuste de potencia de salto')).toBeNull();
    expect(screen.queryByText('Ajuste de velocidad')).toBeNull();

    // Al expandir muestra ambas recomendaciones individuales
    fireEvent.click(screen.getByRole('button', { name: /Ver recomendaciones \(2\)/i }));
    expect(screen.getByText('Ajuste de potencia de salto')).toBeDefined();
    expect(screen.getByText('Ajuste de velocidad')).toBeDefined();
  });
});
