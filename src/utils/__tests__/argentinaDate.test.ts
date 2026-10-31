import { describe, it, expect } from 'vitest';
import { dateInArgentina, todayInArgentina, formatInvitationExpiration } from '../argentinaDate';

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

  it('formatInvitationExpiration formatea correctamente la fecha y hora en zona horaria de Argentina', () => {
    // 15:00 UTC = 12:00 en Argentina (UTC-3)
    const utc = '2026-11-05T15:00:00.000Z';
    expect(formatInvitationExpiration(utc)).toBe('05/11/2026 a las 12:00 hs');
  });

  it('formatInvitationExpiration devuelve string vacío para fechas inválidas', () => {
    expect(formatInvitationExpiration('invalid-date')).toBe('');
  });
});
