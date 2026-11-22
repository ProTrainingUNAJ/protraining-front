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

export interface SessionReadiness {
  ready: number; // verde
  watch: number; // amarillo
  adjust: number; // rojo
  noCheckIn: number; // gris
}

/**
 * Cómo llega al entrenamiento de hoy el grupo de la sesión (KAN-594, prototipo F): cuenta los
 * atletas del semáforo de hoy por color. Si la sesión es de una categoría, solo cuenta a los de
 * esa categoría; si es individual, al atleta asignado. Devuelve null si no hay a quién contar,
 * para no mostrar ceros que parecen datos.
 */
export function summarizeSessionReadiness(
  session: ScheduledSession,
  athletes: { id: string; status: 'red' | 'yellow' | 'green' | 'gray' }[],
  athleteIdsByCategory: Record<string, string[]>,
): SessionReadiness | null {
  let ids: Set<string> | null = null;
  if (session.categoryId) {
    const categoryIds = athleteIdsByCategory[session.categoryId];
    if (!categoryIds) return null;
    ids = new Set(categoryIds.map((id) => id.toLowerCase()));
  } else if (session.athleteId) {
    ids = new Set([session.athleteId.toLowerCase()]);
  }
  if (!ids) return null;
  const groupIds = ids;

  const group = athletes.filter((athlete) => groupIds.has(athlete.id.toLowerCase()));
  if (group.length === 0) return null;

  return {
    ready: group.filter((a) => a.status === 'green').length,
    watch: group.filter((a) => a.status === 'yellow').length,
    adjust: group.filter((a) => a.status === 'red').length,
    noCheckIn: group.filter((a) => a.status === 'gray').length,
  };
}
