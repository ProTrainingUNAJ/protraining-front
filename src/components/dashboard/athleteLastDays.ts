import type { CheckIn } from '../../api/seguimientoService';
import { addDaysToIsoDate } from '../../utils/nextTraining';

export const LAST_DAYS = 7;
const WEEKDAY_INITIAL = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
const WEEKDAY_NAME = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const TONE = { Green: 'green', Yellow: 'yellow', Red: 'red' } as const;

export type DayTone = (typeof TONE)[keyof typeof TONE] | 'none';

export interface LastDay {
  date: string;
  initial: string;
  label: string;
  tone: DayTone;
  isToday: boolean;
}

// Días de la semana calculados a mediodía UTC: el día no cambia por la zona del navegador
function weekday(isoDate: string): number {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay();
}

/** Los últimos 7 días hasta hoy (incluido), con el color del check-in de cada uno. */
export function buildLastDays(checkIns: CheckIn[], today: string): LastDay[] {
  const byDate = new Map(checkIns.map((checkIn) => [checkIn.date.slice(0, 10), checkIn]));
  return Array.from({ length: LAST_DAYS }, (_, index) => {
    const date = addDaysToIsoDate(today, index - (LAST_DAYS - 1));
    const checkIn = byDate.get(date);
    const dow = weekday(date);
    const [, month, day] = date.split('-');
    return {
      date,
      initial: WEEKDAY_INITIAL[dow],
      label: `${WEEKDAY_NAME[dow]} ${day}/${month}`,
      tone: checkIn ? TONE[checkIn.trafficLight] : 'none',
      isToday: date === today,
    };
  });
}
