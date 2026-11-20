import { describe, expect, it } from 'vitest';
import { todayInArgentina } from '../argentinaDate';
import {
  DASHBOARD_PERIOD_OPTIONS,
  getCategoryDashboardRange,
  parseCategoryDashboardPeriod,
} from '../categoryDashboardRange';

describe('categoryDashboardRange (KAN-504)', () => {
  it('ofrece "Último mes" como período por defecto', () => {
    expect(DASHBOARD_PERIOD_OPTIONS[0]).toEqual({ value: '1m', label: 'Último mes' });
    expect(parseCategoryDashboardPeriod(null)).toBe('1m');
    expect(parseCategoryDashboardPeriod('otro')).toBe('1m');
    expect(parseCategoryDashboardPeriod('3m')).toBe('3m');
  });

  it('calcula el último mes natural inclusive', () => {
    expect(getCategoryDashboardRange('1m', '2026-11-20')).toEqual({
      from: '2026-10-20',
      to: '2026-11-20',
    });
  });

  it('calcula los últimos 3 meses naturales inclusive', () => {
    expect(getCategoryDashboardRange('3m', '2026-11-20')).toEqual({
      from: '2026-08-20',
      to: '2026-11-20',
    });
  });

  it('cruza el límite del año', () => {
    expect(getCategoryDashboardRange('1m', '2026-01-15')).toEqual({
      from: '2025-12-15',
      to: '2026-01-15',
    });
  });

  it('recorta al último día del mes cuando el destino es más corto', () => {
    expect(getCategoryDashboardRange('1m', '2026-03-31').from).toBe('2026-02-28');
    expect(getCategoryDashboardRange('1m', '2024-03-31').from).toBe('2024-02-29');
  });

  it('usa la fecha de hoy en Argentina si no se pasa una fecha', () => {
    expect(getCategoryDashboardRange('1m').to).toBe(todayInArgentina());
  });
});
