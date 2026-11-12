import { describe, expect, it } from 'vitest';
import type { AthleteEvolutionResponse } from '../../api/generated/seguimiento';
import { buildEvolutionMetrics } from '../evolutionMetrics';

const baseEvolution = (
  overrides: Partial<AthleteEvolutionResponse> = {},
): AthleteEvolutionResponse => ({
  athleteId: 'a-1',
  from: '2026-08-01',
  to: '2026-11-01',
  strength: [],
  fitnessTests: [],
  wellness: { fatiguePoints: [], dailyPoints: [] },
  weeklyLoads: [],
  strengthUnavailable: false,
  ...overrides,
});

describe('buildEvolutionMetrics', () => {
  it('sin evolución no arma ninguna métrica', () => {
    expect(buildEvolutionMetrics(null)).toEqual({});
    expect(buildEvolutionMetrics(baseEvolution())).toEqual({});
  });

  it('arma el salto con la última medición y la diferencia contra la primera', () => {
    const metrics = buildEvolutionMetrics(
      baseEvolution({
        fitnessTests: [
          {
            catalogTestId: 't-1',
            testName: 'Salto CMJ',
            motorCapacity: 'Potencia',
            unit: 'cm',
            points: [
              { date: '2026-10-08', value: 42 },
              { date: '2026-09-01', value: 40 },
            ],
          },
        ],
      }),
    );

    expect(metrics.cmj).toMatchObject({
      currentValue: 42,
      initialValue: 40,
      deltaAbsolute: '+2 cm',
      deltaPercent: '+5%',
      isPositiveImprovement: true,
    });
    expect(metrics.cmj?.data.map((p) => p.date)).toEqual(['01/09', '08/10']);
  });

  it('en el sprint bajar el tiempo cuenta como mejora', () => {
    const metrics = buildEvolutionMetrics(
      baseEvolution({
        fitnessTests: [
          {
            catalogTestId: 't-2',
            testName: 'Sprint 30 m',
            motorCapacity: 'Velocidad',
            unit: 's',
            points: [
              { date: '2026-09-01', value: 4.5 },
              { date: '2026-10-01', value: 4.3 },
            ],
          },
        ],
      }),
    );

    expect(metrics.sprint?.isPositiveImprovement).toBe(true);
    expect(metrics.sprint?.deltaAbsolute).toBe('−0,2 s');
  });

  it('el Yo-Yo no se confunde con el sprint', () => {
    const metrics = buildEvolutionMetrics(
      baseEvolution({
        fitnessTests: [
          {
            catalogTestId: 't-3',
            testName: 'Test Yo-Yo intermitente',
            motorCapacity: 'Resistencia',
            unit: 'm',
            points: [{ date: '2026-10-01', value: 1200 }],
          },
        ],
      }),
    );

    expect(metrics.yoyo?.currentValue).toBe(1200);
    expect(metrics.sprint).toBeUndefined();
  });

  it('toma la sentadilla de las series de fuerza y la fatiga del wellness', () => {
    const metrics = buildEvolutionMetrics(
      baseEvolution({
        strength: [
          {
            exerciseId: 'e-1',
            exerciseName: 'Sentadilla trasera',
            unit: 'kg',
            points: [{ date: '2026-10-01', value: 120 }],
          },
        ],
        wellness: {
          fatiguePoints: [
            { date: '2026-10-01', value: 4 },
            { date: '2026-10-02', value: 2 },
          ],
          dailyPoints: [],
        },
      }),
    );

    expect(metrics.squat?.name).toBe('1RM Sentadilla trasera');
    expect(metrics.fatigue?.isPositiveImprovement).toBe(true);
  });
});
