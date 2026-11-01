import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { AthleteBenchmarkModal } from '../AthleteBenchmarkModal';
import { athleteBenchmarkService } from '../../../services/athleteBenchmarkService';
import { CategoryBenchmarkSummary } from '../../../types/benchmark';

describe('AthleteBenchmarkModal (KAN-448)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  const mockCategories = [
    { id: 'cat-sub20', name: 'Sub 20' },
    { id: 'cat-primera', name: 'Primera División' },
  ];

  it('CRITERIO DE ACEPTACIÓN: DADO un atleta con un resultado de salto por debajo del promedio de su categoría, CUANDO el PF abre su perfil, ENTONCES visualiza el salto marcado como un punto a mejorar', async () => {
    // Mock del servicio que devuelve el benchmark con el salto del atleta por debajo del promedio
    const mockSummary: CategoryBenchmarkSummary = {
      categoryId: 'cat-sub20',
      categoryName: 'Sub 20',
      athleteId: 'ath-1',
      athleteName: 'Lucas Romero',
      athleteCount: 15,
      items: [
        {
          testName: 'Salto Vertical CMJ',
          motorSkill: 'Power',
          unit: 'cm',
          athleteValue: 30.0,
          groupAverage: 35.0,
          direction: 'higher_is_better',
          absoluteDelta: -5.0,
          percentageDelta: -14.3,
          status: 'below_average',
          isWeakestPoint: true,
        },
      ],
      weakestPoint: {
        testName: 'Salto Vertical CMJ',
        motorSkill: 'Power',
        unit: 'cm',
        athleteValue: 30.0,
        groupAverage: 35.0,
        direction: 'higher_is_better',
        absoluteDelta: -5.0,
        percentageDelta: -14.3,
        status: 'below_average',
        isWeakestPoint: true,
      },
      areasToImproveCount: 1,
    };

    vi.spyOn(athleteBenchmarkService, 'getAthleteBenchmark').mockResolvedValue(mockSummary);

    render(
      <AthleteBenchmarkModal
        athleteId="ath-1"
        athleteName="Lucas Romero"
        categories={mockCategories}
        initialCategoryId="cat-sub20"
        onClose={vi.fn()}
      />,
    );

    // Verificamos que cargue la información del atleta y la categoría
    expect(await screen.findByText('Rendimiento frente al grupo')).toBeDefined();
    expect(screen.getByText('Lucas Romero')).toBeDefined();

    // Verificamos el banner de punto más débil / punto a mejorar
    expect(
      await screen.findByText(/Punto más débil identificado: Salto Vertical CMJ/i),
    ).toBeDefined();

    // Verificamos la tarjeta del test con los datos numéricos y el badge
    const card = screen.getByTestId('benchmark-card-salto-vertical-cmj');
    expect(card).toBeDefined();
    expect(card.textContent).toContain('30 cm'); // Resultado Atleta
    expect(card.textContent).toContain('35 cm'); // Promedio Categoría
    expect(card.textContent).toContain('-5 cm (-14.3%)'); // Diferencia
    expect(card.textContent).toContain('Punto más débil'); // Badge visible
  });

  it('permite cambiar de categoría cuando el atleta pertenece a más de una (N:N)', async () => {
    const mockSummarySub20: CategoryBenchmarkSummary = {
      categoryId: 'cat-sub20',
      categoryName: 'Sub 20',
      athleteId: 'ath-1',
      athleteName: 'Lucas Romero',
      athleteCount: 15,
      items: [],
      weakestPoint: null,
      areasToImproveCount: 0,
    };

    const mockSummaryPrimera: CategoryBenchmarkSummary = {
      categoryId: 'cat-primera',
      categoryName: 'Primera División',
      athleteId: 'ath-1',
      athleteName: 'Lucas Romero',
      athleteCount: 22,
      items: [
        {
          testName: 'Sentadilla 1RM',
          unit: 'kg',
          athleteValue: 120,
          groupAverage: 110,
          direction: 'higher_is_better',
          absoluteDelta: 10,
          percentageDelta: 9.1,
          status: 'above_average',
          isWeakestPoint: false,
        },
      ],
      weakestPoint: null,
      areasToImproveCount: 0,
    };

    const spy = vi
      .spyOn(athleteBenchmarkService, 'getAthleteBenchmark')
      .mockImplementation(async (_aId, catId) => {
        if (catId === 'cat-primera') return mockSummaryPrimera;
        return mockSummarySub20;
      });

    render(
      <AthleteBenchmarkModal
        athleteId="ath-1"
        athleteName="Lucas Romero"
        categories={mockCategories}
        initialCategoryId="cat-sub20"
        onClose={vi.fn()}
      />,
    );

    // Esperar carga inicial
    expect(await screen.findByText('Sub 20')).toBeDefined();

    // Cambiar al selector de categoría
    const select = screen.getByLabelText(/Categoría de comparación/i);
    fireEvent.change(select, { target: { value: 'cat-primera' } });

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith('ath-1', 'cat-primera', 'Lucas Romero', 'Primera División');
    });

    expect(screen.getAllByText('Primera División').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Sentadilla 1RM')).toBeDefined();
    expect(screen.getByText('Por encima del promedio')).toBeDefined();
  });

  it('permite cerrar el modal con el botón de cerrar y la tecla Escape', async () => {
    const onClose = vi.fn();
    vi.spyOn(athleteBenchmarkService, 'getAthleteBenchmark').mockResolvedValue({
      categoryId: 'cat-sub20',
      categoryName: 'Sub 20',
      athleteId: 'ath-1',
      athleteName: 'Lucas Romero',
      athleteCount: 15,
      items: [],
      weakestPoint: null,
      areasToImproveCount: 0,
    });

    render(
      <AthleteBenchmarkModal
        athleteId="ath-1"
        athleteName="Lucas Romero"
        categories={mockCategories}
        initialCategoryId="cat-sub20"
        onClose={onClose}
      />,
    );

    const closeBtn = await screen.findByRole('button', { name: 'Cerrar modal de comparativa' });
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);

    // Tecla Escape
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
