import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AthleteMetricsStripWidget } from '../AthleteMetricsStripWidget';
import { useAthleteEvolution } from '../../../hooks/useAthleteEvolution';
import type { AthleteEvolutionResponse } from '../../../api/generated/seguimiento';

vi.mock('../../../hooks/useAthleteEvolution', () => ({ useAthleteEvolution: vi.fn() }));
const hookMock = vi.mocked(useAthleteEvolution);

const pts = (...values: number[]) => values.map((value, i) => ({ date: `2026-1${i}-01`, value }));

const evolution = {
  fitnessTests: [
    { testName: 'Salto CMJ', motorCapacity: 'Power', unit: 'cm', points: pts(36, 39) },
    // En sprint bajar el tiempo es mejorar
    { testName: 'Sprint 30 m', motorCapacity: 'Velocity', unit: 's', points: pts(4.48, 4.36) },
  ],
  strength: [{ exerciseName: 'Sentadilla con barra', unit: 'kg', points: pts(110, 100) }],
  wellness: { fatiguePoints: [] },
} as unknown as AthleteEvolutionResponse;

function renderWidget() {
  return render(
    <MemoryRouter>
      <AthleteMetricsStripWidget />
    </MemoryRouter>,
  );
}

describe('AthleteMetricsStripWidget (KAN-594)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('muestra las 4 marcas con su valor y la variación contra la medición anterior', () => {
    hookMock.mockReturnValue({ athleteId: 'a', evolution, loading: false, error: null });
    renderWidget();

    expect(screen.getByText('Salto CMJ')).toBeDefined();
    const cmj = screen.getByTestId('metric-change-cmj');
    expect(cmj.textContent).toBe('+8,3 %');
    expect(cmj.className).toContain('--better');

    // Sprint: el tiempo bajó (−2,7 %) y eso es una mejora
    const sprint = screen.getByTestId('metric-change-sprint');
    expect(sprint.textContent).toBe('−2,7 %');
    expect(sprint.className).toContain('--better');

    // Sentadilla: bajó el 1RM, es un retroceso
    expect(screen.getByTestId('metric-change-squat').className).toContain('--worse');

    // Resistencia sin datos: la celda lo dice
    expect(screen.getByText('Sin mediciones')).toBeDefined();
  });

  it('sin ninguna medición muestra el vacío', () => {
    hookMock.mockReturnValue({
      athleteId: 'a',
      evolution: { fitnessTests: [], strength: [] } as unknown as AthleteEvolutionResponse,
      loading: false,
      error: null,
    });
    renderWidget();
    expect(screen.getByText(/Todavía no tenés mediciones/)).toBeDefined();
  });

  it('si falla la carga muestra el error, no ceros', () => {
    hookMock.mockReturnValue({ athleteId: null, evolution: null, loading: false, error: 'x' });
    renderWidget();
    expect(screen.getByText('No pudimos cargar tus marcas.')).toBeDefined();
  });
});
