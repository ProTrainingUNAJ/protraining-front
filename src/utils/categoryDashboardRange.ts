import { todayInArgentina } from './argentinaDate';

// Períodos disponibles en el dashboard de categoría (KAN-504).
export type CategoryDashboardPeriod = '1m' | '3m';

export interface DashboardPeriodOption {
  value: CategoryDashboardPeriod;
  label: string;
}

export const DASHBOARD_PERIOD_OPTIONS: DashboardPeriodOption[] = [
  { value: '1m', label: 'Último mes' },
  { value: '3m', label: 'Últimos 3 meses' },
];

export interface CategoryDashboardRange {
  from: string;
  to: string;
}

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Resta meses naturales a una fecha AAAA-MM-DD sin pasar por el reloj local:
// Date.UTC + toISOString mantiene el día aunque el navegador esté en otra zona.
function subtractMonths(isoDate: string, months: number): string {
  const [year, month, day] = isoDate.split('-').map(Number);

  // Date.UTC con día 0 del mes siguiente da la cantidad de días del mes destino,
  // así "31 de marzo menos 1 mes" se recorta al 28/29 de febrero.
  const targetMonthIndex = month - 1 - months;
  const lastDayOfTargetMonth = new Date(Date.UTC(year, targetMonthIndex + 1, 0)).getUTCDate();
  const targetDay = Math.min(day, lastDayOfTargetMonth);

  return new Date(Date.UTC(year, targetMonthIndex, targetDay)).toISOString().slice(0, 10);
}

// Rango inclusivo que consume el endpoint de resumen. El día de hoy siempre se
// toma en hora Argentina, igual que el resto de la app.
export function getCategoryDashboardRange(
  period: CategoryDashboardPeriod,
  today: string = todayInArgentina(),
): CategoryDashboardRange {
  if (!ISO_DATE_PATTERN.test(today)) {
    return { from: today, to: today };
  }

  return {
    from: subtractMonths(today, period === '3m' ? 3 : 1),
    to: today,
  };
}

// Parsea un valor del selector sin confiar en lo que venga de la URL.
export function parseCategoryDashboardPeriod(value: string | null): CategoryDashboardPeriod {
  return value === '3m' ? '3m' : '1m';
}
