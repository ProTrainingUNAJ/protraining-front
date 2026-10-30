import { trainingPlansService } from '../api/trainingPlans';
import { ScheduledSession } from '../api/generated/entrenamiento';

export interface PlannedSessionWithTime extends ScheduledSession {
  /**
   * Hora programada de la sesión (ej. '09:30', '16:00').
   * Queda listo para cuando la planificación incluya soporte de horario.
   */
  sessionTime?: string | null;
}

export const seasonPlanningService = {
  /**
   * Loads planned training sessions for a given date and optional category filter.
   * Pulls real sessions from backend training plans schedule, and falls back to demo plan schedule
   * (e.g. Primera División: Wednesdays, Thursdays, Fridays) if backend is empty.
   */
  async getSessionsForDate(
    isoDate: string,
    selectedCategoryId?: string,
    categories?: Array<{ id: string; name: string }>,
  ): Promise<PlannedSessionWithTime[]> {
    let remoteSessions: ScheduledSession[] = [];
    try {
      remoteSessions = await trainingPlansService.schedule(isoDate);
    } catch {
      // Ignore network errors or unassigned dates
    }

    if (remoteSessions.length > 0) {
      const filtered = selectedCategoryId
        ? remoteSessions.filter((s) => !s.categoryId || s.categoryId === selectedCategoryId)
        : remoteSessions;

      return filtered.map((s) => {
        // Extraer hora si estuviese disponible en propiedades extendidas o notas
        const rawTime =
          (s as unknown as { sessionTime?: string; startTime?: string; time?: string })
            .sessionTime ??
          (s as unknown as { startTime?: string }).startTime ??
          (s as unknown as { time?: string }).time ??
          null;

        return {
          ...s,
          sessionTime: rawTime,
        };
      });
    }

    // Default scheduled training plan reflection:
    // Primera División has strength training on Wednesdays (day 3), Thursdays (day 4), Fridays (day 5)
    const [year, month, day] = isoDate.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const dayOfWeek = dateObj.getDay(); // 0 is Sun, 1 is Mon, 2 is Tue, 3 is Wed, 4 is Thu, 5 is Fri, 6 is Sat

    const primeraCat =
      categories?.find((c) => c.name.toLowerCase().includes('primera')) || categories?.[0];

    const primeraId = primeraCat?.id || 'cat-primera';

    // If user filtered by a specific category that is NOT Primera, don't show Primera's plan
    if (selectedCategoryId && selectedCategoryId !== primeraId) {
      return [];
    }

    if (dayOfWeek === 3) {
      // Wednesday: entrenamiento matutino
      return [
        {
          assignmentId: `plan-wed-${isoDate}`,
          trainingPlanId: 'plan-fuerza-base',
          planName: 'Fuerza base',
          sessionId: 'session-wed',
          sessionName: 'Día 1: Fuerza y Potencia',
          weekNumber: 1,
          exerciseCount: 5,
          categoryId: primeraId,
          sessionTime: '09:30',
        },
      ];
    }

    if (dayOfWeek === 4) {
      // Thursday: entrenamiento táctico / tren superior
      return [
        {
          assignmentId: `plan-thu-${isoDate}`,
          trainingPlanId: 'plan-fuerza-base',
          planName: 'Fuerza base',
          sessionId: 'session-thu',
          sessionName: 'Día 2: Tren Superior',
          weekNumber: 1,
          exerciseCount: 4,
          categoryId: primeraId,
          sessionTime: '10:00',
        },
      ];
    }

    if (dayOfWeek === 5) {
      // Friday: activación previa a competencia
      return [
        {
          assignmentId: `plan-fri-${isoDate}`,
          trainingPlanId: 'plan-fuerza-base',
          planName: 'Fuerza base',
          sessionId: 'session-fri',
          sessionName: 'Día 3: Activación y Zona Media',
          weekNumber: 1,
          exerciseCount: 4,
          categoryId: primeraId,
          sessionTime: '09:00',
        },
      ];
    }

    return [];
  },

  /**
   * Loads planned sessions for an array of ISO dates.
   */
  async getSessionsForDates(
    isoDates: string[],
    selectedCategoryId?: string,
    categories?: Array<{ id: string; name: string }>,
  ): Promise<Map<string, PlannedSessionWithTime[]>> {
    const results = await Promise.all(
      isoDates.map(async (iso) => {
        const sessions = await this.getSessionsForDate(iso, selectedCategoryId, categories);
        return { iso, sessions };
      }),
    );

    const map = new Map<string, PlannedSessionWithTime[]>();
    results.forEach(({ iso, sessions }) => {
      if (sessions.length > 0) {
        map.set(iso, sessions);
      }
    });

    return map;
  },
};
