import { useEffect, useState } from 'react';
import { structureService } from '../api/structureService';
import { athleteEvolutionService } from '../api/athleteEvolution';
import type { AthleteEvolutionResponse } from '../api/generated/seguimiento';
import { EvolutionRange, getEvolutionRangeOptions } from '../utils/evolutionRange';

interface AthleteEvolutionState {
  athleteId: string | null;
  evolution: AthleteEvolutionResponse | null;
  loading: boolean;
  error: string | null;
}

// Evolución del atleta logueado. El id del atleta sale de Estructura (/me): el id del usuario no sirve
export function useAthleteEvolution(range: EvolutionRange, enabled = true): AthleteEvolutionState {
  const [athleteId, setAthleteId] = useState<string | null>(null);
  const [evolution, setEvolution] = useState<AthleteEvolutionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Qué combinación atleta + período ya terminó de cargar; si no coincide con la pedida, está cargando
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const requestKey = athleteId ? `${athleteId}|${range}` : null;
  const loading = enabled && (requestKey === null ? error === null : loadedKey !== requestKey);

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
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !athleteId) return;
    let isMounted = true;
    const key = `${athleteId}|${range}`;
    athleteEvolutionService
      .getEvolution(athleteId, getEvolutionRangeOptions(range))
      .then((data) => {
        if (!isMounted) return;
        setEvolution(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'No se pudo cargar la evolución.');
      })
      .finally(() => {
        if (isMounted) setLoadedKey(key);
      });
    return () => {
      isMounted = false;
    };
  }, [enabled, athleteId, range]);

  return { athleteId, evolution, loading, error };
}
