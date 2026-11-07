import { todayInArgentina } from './argentinaDate';
import { GetEvolutionOptions } from '../api/athleteEvolution';

export type EvolutionRange = '4w' | '3m' | '6m' | 'all';

export interface EvolutionRangeOption {
  key: EvolutionRange;
  label: string;
}

export const EVOLUTION_RANGE_OPTIONS: EvolutionRangeOption[] = [
  { key: '4w', label: '4 semanas' },
  { key: '3m', label: '3 meses' },
  { key: '6m', label: '6 meses' },
  { key: 'all', label: 'Todo' },
];

export function getEvolutionRangeOptions(range: EvolutionRange): GetEvolutionOptions {
  const today = todayInArgentina();
  if (range === '4w') {
    const [year, month, day] = today.split('-').map(Number);
    const d = new Date(Date.UTC(year, month - 1, day));
    d.setUTCDate(d.getUTCDate() - 28);
    return {
      from: d.toISOString().slice(0, 10),
      to: today,
    };
  }
  if (range === '3m') {
    return { months: 3 };
  }
  if (range === '6m') {
    return { months: 6 };
  }
  return {
    from: '2000-01-01',
    to: today,
  };
}
