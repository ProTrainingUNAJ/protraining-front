import { useEffect, useRef, useState } from 'react';

export interface UseDelayedLoadingOptions {
  /** Tiempo de espera (ms) antes de mostrar el indicador de carga. */
  delayMs?: number;
  /** Duración mínima visible (ms) una vez mostrado, para evitar parpadeos. */
  minDurationMs?: number;
}

const DEFAULT_DELAY_MS = 300;
const DEFAULT_MIN_DURATION_MS = 400;

/**
 * Retrasa la aparición de un indicador de carga para evitar parpadeos en respuestas rápidas
 * y garantiza una duración mínima visible si finalmente llega a mostrarse (KAN-597).
 */
export function useDelayedLoading(
  isLoading: boolean,
  options: UseDelayedLoadingOptions = {},
): boolean {
  const { delayMs = DEFAULT_DELAY_MS, minDurationMs = DEFAULT_MIN_DURATION_MS } = options;

  const [showLoading, setShowLoading] = useState(false);
  const latestLoadingRef = useRef(isLoading);
  const visibleRef = useRef(false);
  const shownAtRef = useRef<number | null>(null);
  const delayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const minDurationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    latestLoadingRef.current = isLoading;

    const clearDelayTimer = () => {
      if (delayTimerRef.current !== null) {
        clearTimeout(delayTimerRef.current);
        delayTimerRef.current = null;
      }
    };

    const clearMinDurationTimer = () => {
      if (minDurationTimerRef.current !== null) {
        clearTimeout(minDurationTimerRef.current);
        minDurationTimerRef.current = null;
      }
    };

    if (isLoading) {
      clearMinDurationTimer();

      if (visibleRef.current) {
        return;
      }

      clearDelayTimer();
      delayTimerRef.current = setTimeout(
        () => {
          delayTimerRef.current = null;
          if (!latestLoadingRef.current) {
            return;
          }
          visibleRef.current = true;
          shownAtRef.current = Date.now();
          setShowLoading(true);
        },
        Math.max(0, delayMs),
      );
      return clearDelayTimer;
    }

    // Dejó de cargar: cancelar espera si todavía no se mostró
    clearDelayTimer();

    if (!visibleRef.current) {
      return;
    }

    const elapsed = shownAtRef.current !== null ? Date.now() - shownAtRef.current : minDurationMs;
    const remaining = Math.max(0, minDurationMs - elapsed);

    clearMinDurationTimer();
    minDurationTimerRef.current = setTimeout(() => {
      minDurationTimerRef.current = null;
      visibleRef.current = false;
      shownAtRef.current = null;
      setShowLoading(false);
    }, remaining);
  }, [isLoading, delayMs, minDurationMs]);

  useEffect(() => {
    return () => {
      if (delayTimerRef.current !== null) {
        clearTimeout(delayTimerRef.current);
      }
      if (minDurationTimerRef.current !== null) {
        clearTimeout(minDurationTimerRef.current);
      }
    };
  }, []);

  return showLoading;
}
