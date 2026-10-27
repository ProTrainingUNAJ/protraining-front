/**
 * Utility functions for Season Calendar (monthly and weekly views)
 */

export interface CalendarDay {
  date: Date;
  isoDate: string; // YYYY-MM-DD
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
}

export interface CalendarWeekDay {
  date: Date;
  isoDate: string; // YYYY-MM-DD
  dayName: string; // Lunes, Martes...
  dayNumber: number;
  isToday: boolean;
}

const pad = (n: number) => String(n).padStart(2, '0');

export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  return `${y}-${m}-${d}`;
}

export function formatMonthYear(date: Date): string {
  const monthNames = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];
  return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatFullDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('es-AR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatTime(isoDateTime: string): string {
  try {
    const date = new Date(isoDateTime);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return '';
  }
}

/**
 * Builds the grid for a month (Monday-start).
 * Includes padding days from previous and next months for a complete 6-row or 5-row grid.
 */
export function getMonthDays(currentDate: Date): CalendarDay[] {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const today = new Date();
  const todayIso = toIsoDate(today);

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  // Day of week for 1st of month: 0 is Sun, 1 is Mon ... 6 is Sat.
  // Convert so Monday = 0, Sunday = 6
  const startingDayIndex = (firstDayOfMonth.getDay() + 6) % 7;
  const daysInMonth = lastDayOfMonth.getDate();

  const days: CalendarDay[] = [];

  // Previous month padding days
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startingDayIndex - 1; i >= 0; i--) {
    const dayNum = prevMonthLastDay - i;
    const date = new Date(year, month - 1, dayNum);
    const isoDate = toIsoDate(date);
    days.push({
      date,
      isoDate,
      dayNumber: dayNum,
      isCurrentMonth: false,
      isToday: false,
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const isoDate = toIsoDate(date);
    days.push({
      date,
      isoDate,
      dayNumber: d,
      isCurrentMonth: true,
      isToday: isoDate === todayIso,
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
    });
  }

  // Next month padding days to complete grid (multiples of 7)
  const remaining = (7 - (days.length % 7)) % 7;
  for (let d = 1; d <= remaining; d++) {
    const date = new Date(year, month + 1, d);
    const isoDate = toIsoDate(date);
    days.push({
      date,
      isoDate,
      dayNumber: d,
      isCurrentMonth: false,
      isToday: false,
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
    });
  }

  return days;
}

/**
 * Returns the 7 days of the week containing the specified date (starting Monday).
 */
export function getWeekDays(referenceDate: Date): CalendarWeekDay[] {
  const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const todayIso = toIsoDate(new Date());

  const currentDayOfWeek = (referenceDate.getDay() + 6) % 7; // Monday = 0
  const monday = new Date(referenceDate);
  monday.setDate(referenceDate.getDate() - currentDayOfWeek);

  const week: CalendarWeekDay[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    const isoDate = toIsoDate(date);
    week.push({
      date,
      isoDate,
      dayName: dayNames[i],
      dayNumber: date.getDate(),
      isToday: isoDate === todayIso,
    });
  }

  return week;
}

export interface UnifiedCalendarActivity {
  id: string;
  kind: 'match' | 'training';
  title: string;
  subtitle?: string;
  time: string; // "09:30", "15:30", o ""
  meta?: string;
}

/**
 * Ordena actividades por horario ascendente (ej. 09:30 antes de 15:30).
 * Si un elemento no tiene horario establecido, se ubica después de los que sí tienen horario.
 */
export function sortActivitiesByTime<T extends { time?: string | null }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const timeA = a.time || '';
    const timeB = b.time || '';
    if (timeA && timeB) {
      return timeA.localeCompare(timeB);
    }
    if (timeA && !timeB) return -1;
    if (!timeA && timeB) return 1;
    return 0;
  });
}
