import { describe, it, expect } from 'vitest';
import { dateInArgentina, todayInArgentina } from '../argentinaDate';

describe('argentinaDate', () => {
  it('todayInArgentina devuelve AAAA-MM-DD', () => {
    expect(todayInArgentina()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('dateInArgentina conserva el día argentino de un timestamp UTC nocturno (23:30 AR)', () => {
    // 23:30 del 27/10 en Argentina = 02:30 del 28/10 en UTC.
    const utc = '2026-10-28T02:30:00.000Z';
    expect(dateInArgentina(utc)).toBe('2026-10-27');
  });

  it('dateInArgentina usa el día siguiente cuando el instante ya es el otro día en Argentina', () => {
    const utc = '2026-10-28T05:00:00.000Z'; // 02:00 del 28/10 en Argentina
    expect(dateInArgentina(utc)).toBe('2026-10-28');
  });
});