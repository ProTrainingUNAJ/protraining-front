import { describe, it, expect } from 'vitest';
import {
  calculateBenchmarkItem,
  detectImprovementDirection,
  evaluateCategoryBenchmark,
  formatBenchmarkDelta,
  getStatusBadgeInfo,
} from '../benchmarkCalculator';

describe('benchmarkCalculator (KAN-448)', () => {
  describe('detectImprovementDirection', () => {
    it('detects lower_is_better for time units (s, seg, min)', () => {
      expect(detectImprovementDirection('s')).toBe('lower_is_better');
      expect(detectImprovementDirection('seg')).toBe('lower_is_better');
      expect(detectImprovementDirection('min')).toBe('lower_is_better');
    });

    it('detects higher_is_better for distance, weight, and repetition units', () => {
      expect(detectImprovementDirection('cm')).toBe('higher_is_better');
      expect(detectImprovementDirection('m')).toBe('higher_is_better');
      expect(detectImprovementDirection('kg')).toBe('higher_is_better');
      expect(detectImprovementDirection('repeticiones')).toBe('higher_is_better');
    });
  });

  describe('calculateBenchmarkItem', () => {
    // PERF-01: Atleta con salto inferior al promedio aparece como punto a mejorar
    it('PERF-01: classifies athlete with jump lower than group average as below_average (punto a mejorar)', () => {
      // Salto vertical: atleta 30 cm, promedio 35 cm -> -5 cm (-14.3%)
      const item = calculateBenchmarkItem('Salto Vertical CMJ', 'cm', 30, 35);
      expect(item.status).toBe('below_average');
      expect(item.absoluteDelta).toBe(-5);
      expect(item.percentageDelta).toBeCloseTo(-14.3, 1);
      expect(item.direction).toBe('higher_is_better');

      const badge = getStatusBadgeInfo(item.status);
      expect(badge.label).toBe('Punto a mejorar');
      expect(badge.variant).toBe('warning');
    });

    // PERF-02: Atleta con salto superior al promedio no aparece como punto débil
    it('PERF-02: classifies athlete with jump higher than group average as above_average', () => {
      const item = calculateBenchmarkItem('Salto Vertical CMJ', 'cm', 40, 35);
      expect(item.status).toBe('above_average');
      expect(item.absoluteDelta).toBe(5);
      expect(item.percentageDelta).toBeCloseTo(14.3, 1);

      const badge = getStatusBadgeInfo(item.status);
      expect(badge.label).toBe('Por encima del promedio');
      expect(badge.variant).toBe('success');
    });

    // PERF-03: Resultado igual al promedio se clasifica correctamente
    it('PERF-03: classifies athlete with performance within +-2% as on_average', () => {
      const itemExact = calculateBenchmarkItem('Salto Vertical CMJ', 'cm', 35, 35);
      expect(itemExact.status).toBe('on_average');
      expect(itemExact.absoluteDelta).toBe(0);
      expect(itemExact.percentageDelta).toBe(0);

      // Leve variación del 1% (dentro del umbral neutro)
      const itemClose = calculateBenchmarkItem('Salto Vertical CMJ', 'cm', 35.3, 35);
      expect(itemClose.status).toBe('on_average');
    });

    // PERF-04: Prueba cronometrada donde menos tiempo es mejor se interpreta correctamente
    it('PERF-04: in timed sprint tests, taking more time is classified as below_average', () => {
      // Carrera 30m: atleta 4.5s vs promedio 4.0s (tardó más -> peor rendimiento)
      const worseItem = calculateBenchmarkItem('Carrera 30 m', 's', 4.5, 4.0);
      expect(worseItem.direction).toBe('lower_is_better');
      expect(worseItem.status).toBe('below_average');
      expect(worseItem.percentageDelta).toBeLessThan(0);

      // Carrera 30m: atleta 3.8s vs promedio 4.0s (tardó menos -> mejor rendimiento)
      const betterItem = calculateBenchmarkItem('Carrera 30 m', 's', 3.8, 4.0);
      expect(betterItem.direction).toBe('lower_is_better');
      expect(betterItem.status).toBe('above_average');
      expect(betterItem.percentageDelta).toBeGreaterThan(0);
    });

    // PERF-07: Atleta sin mediciones muestra estado sin datos
    it('PERF-07: returns insufficient_data when athlete has no measurement', () => {
      const itemNull = calculateBenchmarkItem('Sentadilla 1RM', 'kg', null, 100);
      expect(itemNull.status).toBe('insufficient_data');
      expect(itemNull.absoluteDelta).toBeNull();
      expect(itemNull.percentageDelta).toBeNull();

      const badge = getStatusBadgeInfo(itemNull.status);
      expect(badge.label).toBe('Sin datos suficientes');
      expect(badge.variant).toBe('secondary');
    });

    // PERF-08: Categoría sin promedio muestra estado apropiado
    it('PERF-08: returns insufficient_data when group average is missing or zero', () => {
      const itemNoAvg = calculateBenchmarkItem('Salto Vertical CMJ', 'cm', 35, null);
      expect(itemNoAvg.status).toBe('insufficient_data');

      const itemZeroAvg = calculateBenchmarkItem('Salto Vertical CMJ', 'cm', 35, 0);
      expect(itemZeroAvg.status).toBe('insufficient_data');
    });
  });

  describe('evaluateCategoryBenchmark & Weakest Point', () => {
    // PERF-05 y PERF-06: Identifica correctamente el punto más débil comparando desventajas relativas normalizadas
    it('PERF-05 & PERF-06: identifies the weakest point based on largest relative percentage disadvantage, not absolute units', () => {
      // Test 1: Salto CMJ: Atleta 30 cm vs Promedio 35 cm -> -14.3% (dif absoluta: -5 cm)
      const cmj = calculateBenchmarkItem('Salto Vertical CMJ', 'cm', 30, 35);
      // Test 2: Carrera 30 m: Atleta 4.2 s vs Promedio 4.0 s -> -5.0% (dif absoluta: +0.2 s)
      const sprint = calculateBenchmarkItem('Carrera 30 m', 's', 4.2, 4.0);
      // Test 3: Sentadilla 1RM: Atleta 120 kg vs Promedio 100 kg -> +20.0%
      const squat = calculateBenchmarkItem('Sentadilla 1RM', 'kg', 120, 100);

      const evaluated = evaluateCategoryBenchmark([cmj, sprint, squat]);

      const evaluatedCmj = evaluated.find((i) => i.testName === 'Salto Vertical CMJ');
      const evaluatedSprint = evaluated.find((i) => i.testName === 'Carrera 30 m');
      const evaluatedSquat = evaluated.find((i) => i.testName === 'Sentadilla 1RM');

      expect(evaluatedCmj?.isWeakestPoint).toBe(true);
      expect(evaluatedSprint?.isWeakestPoint).toBe(false);
      expect(evaluatedSquat?.isWeakestPoint).toBe(false);

      const cmjBadge = getStatusBadgeInfo(evaluatedCmj!.status, evaluatedCmj!.isWeakestPoint);
      expect(cmjBadge.label).toBe('Punto más débil');
      expect(cmjBadge.variant).toBe('danger');

      const sprintBadge = getStatusBadgeInfo(
        evaluatedSprint!.status,
        evaluatedSprint!.isWeakestPoint,
      );
      expect(sprintBadge.label).toBe('Punto a mejorar');
      expect(sprintBadge.variant).toBe('warning');
    });

    it('does not mark any weakest point if all tests are above or on average', () => {
      const test1 = calculateBenchmarkItem('Test A', 'cm', 50, 40); // above
      const test2 = calculateBenchmarkItem('Test B', 'kg', 100, 100); // on average

      const evaluated = evaluateCategoryBenchmark([test1, test2]);
      expect(evaluated.every((i) => !i.isWeakestPoint)).toBe(true);
    });
  });

  describe('formatBenchmarkDelta', () => {
    it('formats positive and negative deltas with units and percentages', () => {
      const itemNeg = calculateBenchmarkItem('Salto', 'cm', 30, 35);
      expect(formatBenchmarkDelta(itemNeg)).toBe('-5 cm (-14.3%)');

      const itemPos = calculateBenchmarkItem('Fuerza', 'kg', 110, 100);
      expect(formatBenchmarkDelta(itemPos)).toBe('+10 kg (+10%)');

      const itemNoData = calculateBenchmarkItem('Sin datos', 'cm', null, 30);
      expect(formatBenchmarkDelta(itemNoData)).toBe('Sin datos para comparar');
    });
  });
});
