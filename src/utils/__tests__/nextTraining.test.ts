import { describe, it, expect } from 'vitest';
import type { ScheduledSession } from '../../api/generated/entrenamiento';
import {
  addDaysToIsoDate,
  formatTrainingDayLabel,
  pickNextTrainingDay,
  summarizeSessionReadiness,
} from '../nextTraining';

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

describe('summarizeSessionReadiness (KAN-594)', () => {
  const team = [
    { id: 'A-1', status: 'green' as const },
    { id: 'a-2', status: 'yellow' as const },
    { id: 'a-3', status: 'red' as const },
    { id: 'a-4', status: 'gray' as const },
    { id: 'b-1', status: 'red' as const },
  ];
  const byCategory = { 'cat-1': ['a-1', 'a-2', 'a-3', 'a-4'], 'cat-2': ['b-1'] };

  it('cuenta solo a los atletas de la categoría de la sesión, sin importar mayúsculas del id', () => {
    expect(summarizeSessionReadiness(session('Fuerza', null), team, byCategory)).toEqual({
      ready: 1,
      watch: 1,
      adjust: 1,
      noCheckIn: 1,
    });
  });

  it('en una sesión individual cuenta solo al atleta asignado', () => {
    const individual = { ...session('Extra', null), categoryId: null, athleteId: 'b-1' };
    expect(summarizeSessionReadiness(individual, team, byCategory)).toEqual({
      ready: 0,
      watch: 0,
      adjust: 1,
      noCheckIn: 0,
    });
  });

  it('sin datos del semáforo de esa categoría devuelve null en vez de ceros', () => {
    const otherCategory = { ...session('Fuerza', null), categoryId: 'cat-9' };
    expect(summarizeSessionReadiness(otherCategory, team, byCategory)).toBeNull();
    expect(summarizeSessionReadiness(session('Fuerza', null), [], byCategory)).toBeNull();
  });
});
