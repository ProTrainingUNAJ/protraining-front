import {
  listCategoryEvents,
  createCategoryEvent,
  deleteCategoryEvent,
  listCategorySeasonPhases,
  createCategorySeasonPhase,
  deleteCategorySeasonPhase,
} from './generated/estructura';
import { extractErrorMessage } from './axiosClient';
import {
  Match,
  CreateMatchRequest,
  CompetitiveEvent,
  CreateCompetitiveEventRequest,
  SeasonPhase,
} from '../types/structure';

/**
 * Mapea un evento competitivo devuelto por el backend a la estructura Match del frontend.
 */
function mapEventToMatch(ev: CompetitiveEvent, categoryId: string): Match {
  const timePart = ev.startTime
    ? ev.startTime.length === 5
      ? `${ev.startTime}:00`
      : ev.startTime
    : '12:00:00';

  return {
    id: ev.id,
    categoryId,
    opponent: ev.opponent,
    matchDate: `${ev.date}T${timePart}`,
    homeOrAway: ev.venue,
    type: ev.type,
    notes: ev.notes ?? null,
  };
}

export const matchesApi = {
  /**
   * Obtiene los eventos competitivos oficiales de una categoría utilizando el SDK generado (KAN-403).
   */
  async getCategoryEvents(
    categoryId: string,
    params?: { from?: string; to?: string },
  ): Promise<CompetitiveEvent[]> {
    try {
      const { data } = await listCategoryEvents({
        path: { categoryId },
        query: params,
        throwOnError: true,
      });
      return (data || []) as CompetitiveEvent[];
    } catch (err: unknown) {
      throw new Error(extractErrorMessage(err), { cause: err });
    }
  },

  /**
   * Crea un evento competitivo en el backend de Estructura usando el SDK generado (KAN-403).
   */
  async createCategoryEvent(
    categoryId: string,
    payload: CreateCompetitiveEventRequest,
  ): Promise<CompetitiveEvent> {
    try {
      const { data } = await createCategoryEvent({
        path: { categoryId },
        body: payload,
        throwOnError: true,
      });
      return data as CompetitiveEvent;
    } catch (err: unknown) {
      throw new Error(extractErrorMessage(err), { cause: err });
    }
  },

  /**
   * Elimina lógicamente un evento competitivo en el backend usando el SDK generado (KAN-403).
   */
  async deleteCategoryEvent(categoryId: string, eventId: string): Promise<void> {
    try {
      await deleteCategoryEvent({
        path: { categoryId, id: eventId },
        throwOnError: true,
      });
    } catch (err: unknown) {
      throw new Error(extractErrorMessage(err), { cause: err });
    }
  },

  /**
   * Obtiene las fases de temporada registradas para la categoría (KAN-403).
   */
  async getCategorySeasonPhases(categoryId: string): Promise<SeasonPhase[]> {
    try {
      const { data } = await listCategorySeasonPhases({
        path: { categoryId },
        throwOnError: true,
      });
      return (data || []) as SeasonPhase[];
    } catch (err: unknown) {
      throw new Error(extractErrorMessage(err), { cause: err });
    }
  },

  /**
   * Registra una nueva fase de temporada en la categoría (KAN-403).
   */
  async createCategorySeasonPhase(
    categoryId: string,
    payload: {
      name: string;
      type: 'Preseason' | 'Competitive' | 'Transition';
      startDate: string;
      endDate: string;
    },
  ): Promise<SeasonPhase> {
    try {
      const { data } = await createCategorySeasonPhase({
        path: { categoryId },
        body: payload,
        throwOnError: true,
      });
      return data as SeasonPhase;
    } catch (err: unknown) {
      throw new Error(extractErrorMessage(err), { cause: err });
    }
  },

  /**
   * Elimina lógicamente una fase de temporada en la categoría (KAN-403).
   */
  async deleteCategorySeasonPhase(categoryId: string, phaseId: string): Promise<void> {
    try {
      await deleteCategorySeasonPhase({
        path: { categoryId, id: phaseId },
        throwOnError: true,
      });
    } catch (err: unknown) {
      throw new Error(extractErrorMessage(err), { cause: err });
    }
  },

  /**
   * Obtiene la lista de partidos de una categoría y los mapea al modelo Match del calendario.
   */
  async getCategoryMatches(categoryId: string): Promise<Match[]> {
    const events = await this.getCategoryEvents(categoryId);
    return events.map((ev) => mapEventToMatch(ev, categoryId));
  },

  /**
   * Crea un partido asegurando que la fecha (YYYY-MM-DD) y la hora (HH:mm:ss) se envíen
   * tal cual las seleccionó el PF, sin desfasajes de zona horaria ni conversión a UTC.
   */
  async createCategoryMatch(categoryId: string, req: CreateMatchRequest): Promise<Match> {
    let date = req.date || '';
    let startTime: string | null = req.startTime ?? null;

    // Soporte para formato combinado cuando no se especifiquen date o startTime directamente
    if (!date && req.matchDate) {
      if (req.matchDate.includes('T')) {
        const [d, t] = req.matchDate.split('T');
        date = d;
        startTime = t.replace('Z', '').split('.')[0];
      } else {
        date = req.matchDate;
      }
    }

    if (startTime && startTime.length === 5) {
      startTime += ':00';
    }

    const createdEvent = await this.createCategoryEvent(categoryId, {
      date,
      startTime,
      opponent: req.opponent.trim(),
      venue: req.homeOrAway,
      type: req.type || 'Official',
      notes: req.notes?.trim() || null,
    });

    return mapEventToMatch(createdEvent, categoryId);
  },

  /**
   * Elimina un partido de la categoría mediante el endpoint real de eventos competitivos.
   */
  async deleteCategoryMatch(categoryId: string, matchId: string): Promise<void> {
    await this.deleteCategoryEvent(categoryId, matchId);
  },
};
