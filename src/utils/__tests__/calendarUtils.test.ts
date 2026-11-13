import { describe, it, expect } from 'vitest';
import {
  getMonthDays,
  getWeekDays,
  formatMonthYear,
  formatTime,
  toIsoDate,
  sortActivitiesByTime,
} from '../calendarUtils';

describe('calendarUtils', () => {
  it('converts Date to YYYY-MM-DD correctly', () => {
    const d = new Date(2026, 9, 31); // October 31, 2026
    expect(toIsoDate(d)).toBe('2026-10-31');
  });

  it('formats month and year in Spanish', () => {
    const d = new Date(2026, 9, 15);
    expect(formatMonthYear(d)).toBe('Octubre 2026');
  });

  it('formats time in HH:mm correctly', () => {
    const isoString = '2026-10-31T15:30:00.000Z';
    const formatted = formatTime(isoString);
    expect(formatted).toMatch(/\d{2}:\d{2}/);
  });

  it('generates month grid with complete weeks starting on Monday', () => {
    const ref = new Date(2026, 9, 1); // Oct 2026
    const days = getMonthDays(ref);

    // Must be a multiple of 7
    expect(days.length % 7).toBe(0);
    expect(days.length).toBeGreaterThanOrEqual(28);

    // Check first day is Monday
    expect(days[0].date.getDay()).toBe(1); // 1 = Monday
  });

  it('returns exactly 7 days for weekly view starting on Monday', () => {
    const ref = new Date(2026, 9, 26);
    const week = getWeekDays(ref);

    expect(week).toHaveLength(7);
    expect(week[0].dayName).toBe('Lunes');
    expect(week[5].dayName).toBe('Sábado');
    expect(week[6].dayName).toBe('Domingo');
  });

  it('sorts activities chronologically by time ascending', () => {
    const items = [
      { id: '1', title: 'Tarde', time: '16:00' },
      { id: '2', title: 'Mañana', time: '09:30' },
      { id: '3', title: 'Mediodía', time: '12:15' },
      { id: '4', title: 'Sin hora', time: '' },
    ];

    const sorted = sortActivitiesByTime(items);
    expect(sorted.map((s) => s.id)).toEqual(['2', '3', '1', '4']);
  });
});
