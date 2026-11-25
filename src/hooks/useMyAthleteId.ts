import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { structureService } from '../api/structureService';

// Misma clave que usa el Semáforo Diario: el id de atleta del usuario no cambia, se cachea.
const cacheKey = (userId: string) => `protraining_athlete_me_${userId}`;

function readCached(userId?: string): string | null {
  if (!userId) return null;
  try {
    return localStorage.getItem(cacheKey(userId));
  } catch {
    return null;
  }
}

function writeCached(userId: string, athleteId: string): void {
  try {
    localStorage.setItem(cacheKey(userId), athleteId);
  } catch {
    // Almacenamiento bloqueado: se vuelve a pedir la próxima vez
  }
}

export type MyAthleteIdState =
  | { status: 'loading'; athleteId: null }
  | { status: 'ready'; athleteId: string }
  | { status: 'error'; athleteId: null };

/**
 * Id de atleta (Estructura) del usuario logueado, para las tarjetas del Inicio del atleta (KAN-594).
 * Primero el cache del navegador; si no está, GET /estructura/api/v1/me. Cambiar `reloadKey`
 * vuelve a pedirlo (botón Reintentar).
 */
export function useMyAthleteId(reloadKey = 0): MyAthleteIdState {
  const { user } = useAuth();
  const cached = readCached(user?.id);
  const [fetched, setFetched] = useState<{ attempt: number; athleteId: string | null } | null>(
    null,
  );

  useEffect(() => {
    if (!user?.id || cached) return;
    let active = true;
    structureService
      .getMe()
      .then((me) => {
        if (!active) return;
        if (me?.athleteId) writeCached(user.id, me.athleteId);
        setFetched({ attempt: reloadKey, athleteId: me?.athleteId ?? null });
      })
      .catch(() => {
        if (active) setFetched({ attempt: reloadKey, athleteId: null });
      });
    return () => {
      active = false;
    };
  }, [user?.id, cached, reloadKey]);

  if (cached) return { status: 'ready', athleteId: cached };
  if (!fetched || fetched.attempt !== reloadKey) return { status: 'loading', athleteId: null };
  return fetched.athleteId
    ? { status: 'ready', athleteId: fetched.athleteId }
    : { status: 'error', athleteId: null };
}
