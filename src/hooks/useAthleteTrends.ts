import { useCallback, useEffect, useState } from 'react';
import { structureService } from '../api/structureService';
import { athleteTrendsService } from '../api/athleteTrends';
import type { AthleteWeeklyTrendsResponse } from '../types/seguimiento';

export interface AthleteTrendsState {
  athleteId: string | null;
  trends: AthleteWeeklyTrendsResponse | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/**
 * Hook para consultar las tendencias semanales de wellness y carga del atleta autenticado (KAN-490).
 * Extrae el athleteId propio de Estructura (/me) garantizando el aislamiento de datos.
 */
export function useAthleteTrends(weeks = 4, enabled = true): AthleteTrendsState {
  const [athleteId, setAthleteId] = useState<string | null>(null);
  const [trends, setTrends] = useState<AthleteWeeklyTrendsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  const requestKey = athleteId ? `${athleteId}|${weeks}|${reloadTrigger}` : null;
  const loading = enabled && (requestKey === null ? error === null : loadedKey !== requestKey);

  const reload = useCallback(() => {
    setReloadTrigger((prev) => prev + 1);
  }, []);

  // 1. Resolver el id del atleta autenticado
  useEffect(() => {
    if (!enabled) return;
    let isMounted = true;

    structureService
      .getMe()
      .then((me) => {
        if (!isMounted) return;
        if (me?.athleteId) {
          setAthleteId(me.athleteId);
        } else {
          setError('No encontramos tu ficha de atleta.');
        }
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'No encontramos tu ficha de atleta.');
      });

    return () => {
      isMounted = false;
    };
  }, [enabled, reloadTrigger]);

  // 2. Consultar las tendencias semanales una vez obtenido el athleteId
  useEffect(() => {
    if (!enabled || !athleteId) return;
    let isMounted = true;
    const currentKey = `${athleteId}|${weeks}|${reloadTrigger}`;

    athleteTrendsService
      .getAthleteTrends(athleteId, { weeks })
      .then((data) => {
        if (!isMounted) return;
        setTrends(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'No se pudieron cargar las tendencias.');
      })
      .finally(() => {
        if (isMounted) setLoadedKey(currentKey);
      });

    return () => {
      isMounted = false;
    };
  }, [enabled, athleteId, weeks, reloadTrigger]);

  return { athleteId, trends, loading, error, reload };
}
