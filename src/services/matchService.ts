import { Match, CreateMatchRequest } from '../types/structure';
import { matchesApi } from '../api/matches';

// Suscriptores en memoria para actualizaciones en tiempo real del calendario
type MatchChangeSubscriber = () => void;
const subscribers = new Set<MatchChangeSubscriber>();

function notifySubscribers() {
  subscribers.forEach((callback) => {
    try {
      callback();
    } catch {
      // Ignorar errores en callbacks de listeners
    }
  });
}

export const matchService = {
  /**
   * Permite a las vistas suscribirse a cambios de partidos (creación o eliminación).
   */
  subscribe(callback: MatchChangeSubscriber): () => void {
    subscribers.add(callback);
    return () => {
      subscribers.delete(callback);
    };
  },

  /**
   * Obtiene todos los partidos oficiales registrados en el backend para las categorías indicadas.
   * Consulta directamente la API de Estructura sin persistencia ficticia en localStorage.
   */
  async getMatches(categoryIds: string[]): Promise<Match[]> {
    if (categoryIds.length === 0) {
      return [];
    }

    // Consulta en paralelo los partidos oficiales de cada categoría en el backend
    const results = await Promise.all(
      categoryIds.map(async (catId) => {
        try {
          return await matchesApi.getCategoryMatches(catId);
        } catch {
          return [];
        }
      }),
    );

    const allMatches: Match[] = [];
    results.forEach((catMatches) => {
      if (Array.isArray(catMatches)) {
        allMatches.push(...catMatches);
      }
    });

    return allMatches;
  },

  /**
   * Programa un nuevo partido en el backend oficial de Estructura.
   * Si la llamada a la API falla, arroja el error correspondiente para que la UI lo informe al PF.
   */
  async createMatch(categoryId: string, data: CreateMatchRequest): Promise<Match> {
    if (!data.opponent?.trim()) {
      throw new Error('El nombre del rival u oponente es obligatorio.');
    }
    if (!data.date && !data.matchDate) {
      throw new Error('La fecha y hora del partido son obligatorias.');
    }

    // Llamada directa al backend a través de la API
    const remoteMatch = await matchesApi.createCategoryMatch(categoryId, data);

    notifySubscribers();
    return remoteMatch;
  },

  /**
   * Elimina un partido llamando al endpoint real de borrado lógico (DELETE /categories/{categoryId}/events/{id}).
   */
  async deleteMatch(categoryId: string, matchId: string): Promise<void> {
    await matchesApi.deleteCategoryMatch(categoryId, matchId);
    notifySubscribers();
  },
};
