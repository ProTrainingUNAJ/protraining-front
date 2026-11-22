import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AthleteRecommendationsSection } from '../AthleteRecommendationsSection';

const { listMyRecommendationsMock } = vi.hoisted(() => ({
  listMyRecommendationsMock: vi.fn(),
}));

vi.mock('../../../api/recommendations', () => ({
  recommendationsService: {
    listMyRecommendations: listMyRecommendationsMock,
  },
}));

describe('AthleteRecommendationsSection (KAN-492)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra en el inicio del atleta las recomendaciones aprobadas por el PF', async () => {
    listMyRecommendationsMock.mockResolvedValue([
      {
        id: 'rec-approved-1',
        categoryId: 'cat-1',
        categoryName: 'Primera División',
        type: 'Training',
        title: 'Mejora de salto vertical',
        reason: 'salto por debajo del promedio',
        recommendationText: 'Sumá dos bloques de saltos pliométricos controlados esta semana.',
        reviewedAtUtc: '2026-11-19T17:15:00Z',
        createdAt: '2026-11-19T16:00:00Z',
      },
    ]);

    render(<AthleteRecommendationsSection />);

    await waitFor(() => {
      expect(screen.getByText('Recomendaciones de tu preparador físico (1)')).toBeDefined();
    });

    expect(screen.getByText('Mejora de salto vertical')).toBeDefined();
    expect(screen.getByText('Motivo: Salto por debajo del promedio')).toBeDefined();
    expect(
      screen.getByText('Sumá dos bloques de saltos pliométricos controlados esta semana.'),
    ).toBeDefined();
    expect(screen.getByText('Primera División')).toBeDefined();
  });

  it('destaca el aviso del nutricionista en las de hábitos, y no en las de entrenamiento (KAN-634)', async () => {
    listMyRecommendationsMock.mockResolvedValue([
      {
        id: 'rec-habits-1',
        type: 'Habits',
        title: 'Recomendación de hábitos y proteína',
        reason: 'Objetivo: Ganar masa muscular.',
        recommendationText:
          'Proteína diaria orientativa: entre 111 y 156 g, según tu peso y tu objetivo.',
        createdAt: '2026-11-22T16:00:00Z',
        legalDisclaimer:
          'Esto es una recomendación general; para un plan a tu medida, consultá a un nutricionista.',
      },
      {
        id: 'rec-training-1',
        type: 'Training',
        title: 'Mejora de salto vertical',
        reason: 'salto por debajo del promedio',
        recommendationText: 'Sumá dos bloques de saltos.',
        createdAt: '2026-11-22T16:00:00Z',
        legalDisclaimer: null,
      },
    ]);

    render(<AthleteRecommendationsSection />);

    const disclaimers = await screen.findAllByRole('note');
    expect(disclaimers).toHaveLength(1);
    expect(disclaimers[0].textContent).toContain('consultá a un nutricionista');
  });

  it('no renderiza la sección cuando el atleta no tiene recomendaciones aprobadas', async () => {
    listMyRecommendationsMock.mockResolvedValue([]);

    const { container } = render(<AthleteRecommendationsSection />);

    await waitFor(() => {
      expect(listMyRecommendationsMock).toHaveBeenCalledTimes(1);
    });

    expect(container.firstChild).toBeNull();
  });

  it('degrada en silencio sin romper el inicio si falla el servicio de Asistente', async () => {
    listMyRecommendationsMock.mockRejectedValue(new Error('Servicio no disponible'));

    const { container } = render(<AthleteRecommendationsSection />);

    await waitFor(() => {
      expect(listMyRecommendationsMock).toHaveBeenCalledTimes(1);
    });

    expect(container.firstChild).toBeNull();
  });
});
