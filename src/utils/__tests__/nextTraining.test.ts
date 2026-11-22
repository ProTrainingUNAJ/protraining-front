import { describe, it, expect } from 'vitest';
import type { ScheduledSession } from '../../api/generated/entrenamiento';
import { addDaysToIsoDate, formatTrainingDayLabel, pickNextTrainingDay } from '../nextTraining';

function session(sessionName: string, startTime: string | null): ScheduledSession {
  return {
    assignmentId: `as-${sessionName}`,
    trainingPlanId: 'plan-1',
    planName: 'Pretemporada',
    sessionId: `s-${sessionName}`,
    sessionName,
    weekNumber: 2,
    categoryId: 'cat-1',
    exerciseCount: 6,
    startTime,
  };
}

describe('nextTraining (KAN-583)', () => {
  it('suma días cruzando de mes', () => {
    expect(addDaysToIsoDate('2026-11-29', 3)).toBe('2026-12-02');
  });

  it('hoy solo cuenta las sesiones que todavía no empezaron, ordenadas por hora', () => {
    const next = pickNextTrainingDay(
      [
        {
          date: '2026-11-22',
          sessions: [session('Tarde', '18:00:00'), session('Mañana', '08:00:00')],
        },
      ],
      '2026-11-22',
      '10:30',
    );
    expect(next?.sessions.map((s) => s.sessionName)).toEqual(['Tarde']);
  });

  it('las sesiones sin hora valen todo el día y van después de las que tienen hora', () => {
    const next = pickNextTrainingDay(
      [
        {
          date: '2026-11-22',
          sessions: [session('Sin hora', null), session('Tarde', '19:00:00')],
        },
      ],
      '2026-11-22',
      '23:00',
    );
    expect(next?.sessions.map((s) => s.sessionName)).toEqual(['Sin hora']);
  });

  it('si hoy ya no queda nada, toma el próximo día con sesiones', () => {
    const next = pickNextTrainingDay(
      [
        { date: '2026-11-24', sessions: [session('Martes', '17:30:00')] },
        { date: '2026-11-22', sessions: [session('Ya pasó', '08:00:00')] },
        { date: '2026-11-23', sessions: [] },
      ],
      '2026-11-22',
      '20:00',
    );
    expect(next?.date).toBe('2026-11-24');
    expect(next?.sessions[0].sessionName).toBe('Martes');
  });

  it('sin sesiones en los días cargados devuelve null', () => {
    expect(pickNextTrainingDay([{ date: '2026-11-22', sessions: [] }], '2026-11-22', '09:00')).toBe(
      null,
    );
  });

  it('nombra el día como Hoy, Mañana o el día de la semana con la fecha', () => {
    expect(formatTrainingDayLabel('2026-11-22', '2026-11-22')).toBe('Hoy');
    expect(formatTrainingDayLabel('2026-11-23', '2026-11-22')).toBe('Mañana');
    expect(formatTrainingDayLabel('2026-11-26', '2026-11-22')).toBe('jueves 26/11');
  });
});
