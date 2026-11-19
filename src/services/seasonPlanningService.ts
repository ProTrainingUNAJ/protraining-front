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
          sessionTime: rawTime ? rawTime.slice(0, 5) : null,
        };
      });
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
