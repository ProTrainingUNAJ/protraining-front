import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { AthleteRecommendationsSection } from '../AthleteRecommendationsSection';
import { splitRecommendationText } from '../../../utils/recommendationFormat';

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
    expect(screen.getByText('Salto por debajo del promedio')).toBeDefined();
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

  it('sin recomendaciones aprobadas muestra un estado vacío discreto (KAN-481)', async () => {
    listMyRecommendationsMock.mockResolvedValue([]);

    render(<AthleteRecommendationsSection />);

    expect(
      await screen.findByText('Cuando tu preparador apruebe una recomendación, la vas a ver acá.'),
    ).toBeDefined();
    expect(screen.getByText('Recomendaciones de tu preparador físico')).toBeDefined();
  });

  it('si falla el Asistente muestra el error con Reintentar y vuelve a cargar (KAN-481)', async () => {
    listMyRecommendationsMock.mockRejectedValueOnce(new Error('Servicio no disponible'));
    listMyRecommendationsMock.mockResolvedValueOnce([
      {
        id: 'rec-1',
        type: 'Training',
        title: 'Fuerza en piernas',
        reason: 'fuerza baja',
        recommendationText: 'Agregá sentadillas controladas.',
        createdAt: '2026-11-19T16:00:00Z',
      },
    ]);

    render(<AthleteRecommendationsSection />);

    expect((await screen.findByRole('alert')).textContent).toContain(
      'No pudimos cargar tus recomendaciones.',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('Fuerza en piernas')).toBeDefined();
    expect(listMyRecommendationsMock).toHaveBeenCalledTimes(2);
  });

  it('muestra las 3 más recientes y el resto con "Ver todas" (KAN-481)', async () => {
    listMyRecommendationsMock.mockResolvedValue(
      [1, 2, 3, 4, 5].map((n) => ({
        id: `rec-${n}`,
        type: 'Training',
        title: `Recomendación ${n}`,
        reason: 'motivo',
        recommendationText: 'Texto.',
        reviewedAtUtc: `2026-11-1${n}T12:00:00Z`,
        createdAt: `2026-11-1${n}T10:00:00Z`,
      })),
    );

    render(<AthleteRecommendationsSection />);

    expect(await screen.findByText('Recomendación 5')).toBeDefined();
    expect(screen.getByText('Recomendación 3')).toBeDefined();
    expect(screen.queryByText('Recomendación 2')).toBeNull();

    const toggle = screen.getByRole('button', { name: 'Ver todas (5)' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(toggle);

    expect(screen.getByText('Recomendación 1')).toBeDefined();
    const less = screen.getByRole('button', { name: 'Ver menos' });
    expect(less.getAttribute('aria-expanded')).toBe('true');
  });

  it('parte los textos largos y los abre con "Leer completa" (KAN-481)', async () => {
    listMyRecommendationsMock.mockResolvedValue([
      {
        id: 'rec-habits-long',
        type: 'Habits',
        title: 'Hábitos y proteína',
        reason: 'Objetivo: Ganar masa muscular.',
        recommendationText: 'Primer párrafo.\nSegundo párrafo.\n- pollo\n- huevo',
        createdAt: '2026-11-22T16:00:00Z',
        legalDisclaimer: null,
      },
    ]);

    render(<AthleteRecommendationsSection />);

    expect(await screen.findByText('Primer párrafo.')).toBeDefined();
    expect(screen.queryByText('Segundo párrafo.')).toBeNull();
    // Sin el aviso del back, las de hábitos igual muestran uno
    expect(screen.getByRole('note').textContent).toContain('consultá a un nutricionista');

    fireEvent.click(screen.getByRole('button', { name: 'Leer completa' }));
    expect(screen.getByText('Segundo párrafo.')).toBeDefined();
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Pollo', 'Huevo']);
  });

  it('splitRecommendationText agrupa viñetas consecutivas en una lista', () => {
    expect(splitRecommendationText('Intro\n• uno\n• dos\n\nCierre')).toEqual([
      { kind: 'paragraph', text: 'Intro' },
      { kind: 'list', items: ['Uno', 'Dos'] },
      { kind: 'paragraph', text: 'Cierre' },
    ]);
  });

  it('muestra juntas las recomendaciones de entrenamiento y de hábitos con su etiqueta', async () => {
    listMyRecommendationsMock.mockResolvedValue([
      {
        id: 'rec-training',
        categoryId: 'cat-1',
        categoryName: 'Primera División',
        type: 'Training',
        title: 'Mejora de salto vertical',
        reason: 'salto por debajo del promedio',
        recommendationText: 'Sumá dos bloques de saltos pliométricos.',
        reviewedAtUtc: '2026-11-19T17:15:00Z',
        createdAt: '2026-11-19T16:00:00Z',
      },
      {
        id: 'rec-habits',
        categoryId: 'cat-1',
        categoryName: 'Primera División',
        type: 'Habits',
        title: 'Hábitos de hidratación',
        reason: 'baja ingesta de agua',
        recommendationText: 'Tomá agua antes y después de entrenar.',
        reviewedAtUtc: '2026-11-20T17:15:00Z',
        createdAt: '2026-11-20T16:00:00Z',
      },
    ]);

    render(<AthleteRecommendationsSection />);

    expect(await screen.findByText('Recomendaciones de tu preparador físico (2)')).toBeDefined();
    expect(screen.getByText('Mejora de salto vertical')).toBeDefined();
    expect(screen.getByText('Hábitos de hidratación')).toBeDefined();
    expect(screen.getAllByText('Entrenamiento')).toHaveLength(1);
    expect(screen.getAllByText('Hábitos')).toHaveLength(1);
  });

  it('muestra solo entrenamiento cuando el backend no envía recomendaciones de hábitos', async () => {
    listMyRecommendationsMock.mockResolvedValue([
      {
        id: 'rec-training',
        categoryId: 'cat-1',
        categoryName: 'Primera División',
        type: 'Training',
        title: 'Fuerza en piernas',
        reason: 'fuerza baja',
        recommendationText: 'Agregá sentadillas controladas.',
        reviewedAtUtc: '2026-11-19T17:15:00Z',
        createdAt: '2026-11-19T16:00:00Z',
      },
    ]);

    render(<AthleteRecommendationsSection />);

    expect(await screen.findByText('Fuerza en piernas')).toBeDefined();
    expect(screen.getAllByText('Entrenamiento')).toHaveLength(1);
    expect(screen.queryByText('Hábitos')).toBeNull();
  });
});
