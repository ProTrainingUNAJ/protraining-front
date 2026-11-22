import type { ScheduledSession } from '../api/generated/entrenamiento';

// Cuántos días hacia adelante se busca el próximo entrenamiento (hoy incluido).
export const NEXT_TRAINING_LOOKAHEAD_DAYS = 7;

export interface TrainingDay {
  date: string; // AAAA-MM-DD
  sessions: ScheduledSession[];
}

// Suma días a una fecha AAAA-MM-DD sin pasar por la zona horaria del navegador.
export function addDaysToIsoDate(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

// Hora de inicio como HH:mm (el back la manda como "HH:mm:ss"). Sin hora, la sesión vale todo el día.
export function sessionStartTime(session: ScheduledSession): string | null {
  return session.startTime ? session.startTime.slice(0, 5) : null;
}

// Las sesiones con hora van primero, en orden; las de todo el día, al final.
function byStartTime(a: ScheduledSession, b: ScheduledSession): number {
  const timeA = sessionStartTime(a);
  const timeB = sessionStartTime(b);
  if (timeA === timeB) return 0;
  if (timeA === null) return 1;
  if (timeB === null) return -1;
  return timeA.localeCompare(timeB);
}

// Primer día con sesiones pendientes a partir de hoy. Hoy solo cuentan las que todavía
// no empezaron (o las de todo el día). Devuelve las sesiones de ese día ordenadas por hora.
export function pickNextTrainingDay(
  days: TrainingDay[],
  today: string,
  nowTime: string,
): TrainingDay | null {
  const sortedDays = [...days].sort((a, b) => a.date.localeCompare(b.date));
  for (const day of sortedDays) {
    if (day.date < today) continue;
    const pending =
      day.date === today
        ? day.sessions.filter((session) => {
            const start = sessionStartTime(session);
            return start === null || start >= nowTime;
          })
        : day.sessions;
    if (pending.length > 0) {
      return { date: day.date, sessions: [...pending].sort(byStartTime) };
    }
  }
  return null;
}

// "Hoy", "Mañana" o el día de la semana con la fecha ("jueves 26/11").
export function formatTrainingDayLabel(isoDate: string, today: string): string {
  if (isoDate === today) return 'Hoy';
  if (isoDate === addDaysToIsoDate(today, 1)) return 'Mañana';
  const [year, month, day] = isoDate.split('-').map(Number);
  const weekday = new Intl.DateTimeFormat('es-AR', { weekday: 'long', timeZone: 'UTC' }).format(
    new Date(Date.UTC(year, month - 1, day)),
  );
  return `${weekday} ${day}/${month}`;
}
