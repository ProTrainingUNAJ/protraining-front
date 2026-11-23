import { todayInArgentina } from '../../utils/argentinaDate';

const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

function toUtcDay(isoDate: string): number {
  const [year, month, day] = isoDate.slice(0, 10).split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

/** Días enteros desde hoy (en Argentina) hasta una fecha AAAA-MM-DD; negativo si ya pasó. */
export function daysFromToday(isoDate: string, today: string = todayInArgentina()): number {
  return Math.round((toUtcDay(isoDate) - toUtcDay(today)) / 86_400_000);
}

/** "sábado 28/11", sin pasar por la zona horaria del navegador. */
export function formatWeekdayDayMonth(isoDate: string): string {
  const [, month, day] = isoDate.slice(0, 10).split('-').map(Number);
  const weekday = WEEKDAYS[new Date(toUtcDay(isoDate)).getUTCDay()];
  return `${weekday} ${day}/${month}`;
}
