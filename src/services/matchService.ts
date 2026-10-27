import { Match, CreateMatchRequest } from '../types/structure';
import { structureService } from '../api/structureService';

const STORAGE_KEY = 'protraining_season_matches_v1';

// In-memory subscribers for real-time calendar updates
type MatchChangeSubscriber = () => void;
const subscribers = new Set<MatchChangeSubscriber>();

function notifySubscribers() {
  subscribers.forEach((callback) => {
    try {
      callback();
    } catch {
      // Ignore listener error
    }
  });
}

function loadLocalMatches(): Match[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Match[];
  } catch {
    return [];
  }
}

function saveLocalMatches(matches: Match[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(matches));
  } catch {
    // LocalStorage write error (quota, etc.)
  }
}

export const matchService = {
  subscribe(callback: MatchChangeSubscriber): () => void {
    subscribers.add(callback);
    return () => {
      subscribers.delete(callback);
    };
  },

  /**
   * Retrieves all matches for the given categories.
   * Tries backend first; falls back to or merges with local storage for offline resiliency.
   */
  async getMatches(categoryIds: string[]): Promise<Match[]> {
    const localMatches = loadLocalMatches();
    if (categoryIds.length === 0) {
      return localMatches;
    }

    try {
      // Fetch from API for each category in parallel
      const remoteResults = await Promise.all(
        categoryIds.map(async (catId) => {
          try {
            return await structureService.getCategoryMatches(catId);
          } catch {
            return null;
          }
        }),
      );

      // Check if at least one category succeeded via API
      const fetchedMatches: Match[] = [];
      let anyApiSuccess = false;

      remoteResults.forEach((catMatches) => {
        if (catMatches && Array.isArray(catMatches)) {
          anyApiSuccess = true;
          fetchedMatches.push(...catMatches);
        }
      });

      if (anyApiSuccess) {
        // Merge with local matches that might not be on the server yet
        const remoteIds = new Set(fetchedMatches.map((m) => m.id));
        const merged = [...fetchedMatches, ...localMatches.filter((m) => !remoteIds.has(m.id))];
        saveLocalMatches(merged);
        return merged.filter((m) => categoryIds.includes(m.categoryId));
      }
    } catch {
      // Fallback silently to local cache
    }

    // Return filtered local matches
    return localMatches.filter((m) => categoryIds.includes(m.categoryId));
  },

  /**
   * Creates and schedules a new match.
   * Persists both locally and in backend (if available).
   */
  async createMatch(categoryId: string, data: CreateMatchRequest): Promise<Match> {
    if (!data.opponent?.trim()) {
      throw new Error('El nombre del rival u oponente es obligatorio.');
    }
    if (!data.matchDate) {
      throw new Error('La fecha y hora del partido son obligatorias.');
    }

    const newMatchId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `match-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const fallbackMatch: Match = {
      id: newMatchId,
      categoryId,
      opponent: data.opponent.trim(),
      matchDate: data.matchDate,
      homeOrAway: data.homeOrAway || 'Home',
      notes: data.notes?.trim() || null,
    };

    let resultMatch: Match = fallbackMatch;

    try {
      // Try backend first
      const remoteMatch = await structureService.createCategoryMatch(categoryId, data);
      if (remoteMatch && remoteMatch.id) {
        resultMatch = remoteMatch;
      }
    } catch {
      // Offline or endpoint not yet deployed: fallbackMatch will be used
    }

    // Persist in local cache
    const current = loadLocalMatches();
    const updated = [...current.filter((m) => m.id !== resultMatch.id), resultMatch];
    saveLocalMatches(updated);

    notifySubscribers();
    return resultMatch;
  },

  /**
   * Deletes a match from local storage (for testing or fixture modifications)
   */
  deleteMatch(matchId: string): void {
    const current = loadLocalMatches();
    const updated = current.filter((m) => m.id !== matchId);
    saveLocalMatches(updated);
    notifySubscribers();
  },

  /**
   * Seeds demo matches if cache is empty, ensuring the PF sees realistic calendar fixtures.
   */
  seedDemoMatchesIfEmpty(categories: Array<{ id: string; name: string }>): void {
    const current = loadLocalMatches();
    if (current.length > 0 || categories.length === 0) return;

    const mainCategory = categories[0];
    const today = new Date();
    // Calculate upcoming Saturday
    const dayOfWeek = today.getDay(); // 0 is Sunday, 6 is Saturday
    const daysUntilSaturday = (6 - dayOfWeek + 7) % 7 || 7;
    const nextSaturday = new Date(today);
    nextSaturday.setDate(today.getDate() + daysUntilSaturday);
    nextSaturday.setHours(15, 30, 0, 0);

    // Another match 2 weeks later
    const futureSaturday = new Date(nextSaturday);
    futureSaturday.setDate(nextSaturday.getDate() + 14);

    const demoMatches: Match[] = [
      {
        id: 'demo-match-1',
        categoryId: mainCategory.id,
        categoryName: mainCategory.name,
        opponent: 'Club San Martín',
        matchDate: nextSaturday.toISOString(),
        homeOrAway: 'Home',
        notes: 'Fecha oficial del Torneo Clausura. Presentación obligatoria 13:30 hs.',
      },
      {
        id: 'demo-match-2',
        categoryId: mainCategory.id,
        categoryName: mainCategory.name,
        opponent: 'Deportivo Berazategui',
        matchDate: futureSaturday.toISOString(),
        homeOrAway: 'Away',
        notes: 'Clásico regional. Estadio visitante.',
      },
    ];

    saveLocalMatches(demoMatches);
    notifySubscribers();
  },
};
