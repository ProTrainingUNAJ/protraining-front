import { useState, useEffect, useCallback, useRef } from 'react';
import { todayInArgentina } from '../utils/argentinaDate';

export interface RoutineTimerState {
  seconds: number;
  isRunning: boolean;
  minutes: number;
  formattedTime: string;
  start: () => void;
  pause: () => void;
  toggle: () => void;
  reset: () => void;
}

interface StoredTimer {
  accumulatedSeconds: number;
  isRunning: boolean;
  lastStartedAt: number | null;
  /** Día (AAAA-MM-DD, Argentina) al que pertenece el tiempo; la copia global lo necesita. */
  date?: string;
}

export function formatTimerSeconds(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const mm = minutes.toString().padStart(2, '0');
  const ss = seconds.toString().padStart(2, '0');

  if (hours > 0) {
    const hh = hours.toString().padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

const GLOBAL_TIMER_KEY = 'protraining_active_routine_timer';

function getInitialTimerState(storageKey: string | null): {
  seconds: number;
  isRunning: boolean;
  accumulatedSeconds: number;
  lastStartedAt: number | null;
} {
  try {
    // Con la rutina cargada se lee solo el tiempo de ese día y ese atleta. Antes, si hoy todavía
    // no había tiempo guardado, caía a la copia global y mostraba el acumulado de ayer (KAN-481).
    // La copia global solo se usa mientras carga la rutina y si es del día de hoy.
    const raw = storageKey
      ? localStorage.getItem(storageKey)
      : localStorage.getItem(GLOBAL_TIMER_KEY);
    if (raw) {
      const parsed: StoredTimer = JSON.parse(raw);
      if (!storageKey && parsed.date !== todayInArgentina()) {
        return { seconds: 0, isRunning: false, accumulatedSeconds: 0, lastStartedAt: null };
      }
      const base = parsed.accumulatedSeconds || 0;
      if (parsed.isRunning && parsed.lastStartedAt) {
        const delta = Math.floor((Date.now() - parsed.lastStartedAt) / 1000);
        return {
          seconds: base + Math.max(0, delta),
          isRunning: true,
          accumulatedSeconds: base,
          lastStartedAt: parsed.lastStartedAt,
        };
      }
      return {
        seconds: base,
        isRunning: false,
        accumulatedSeconds: base,
        lastStartedAt: null,
      };
    }
  } catch {
    // Ignorar error de acceso a storage
  }
  return { seconds: 0, isRunning: false, accumulatedSeconds: 0, lastStartedAt: null };
}

export function useRoutineTimer(athleteId?: string, date?: string): RoutineTimerState {
  const storageKey = athleteId && date ? `protraining_routine_timer_${date}_${athleteId}` : null;

  const [initialState] = useState(() => getInitialTimerState(storageKey));
  const [seconds, setSeconds] = useState<number>(initialState.seconds);
  const [isRunning, setIsRunning] = useState<boolean>(initialState.isRunning);

  const accumulatedRef = useRef<number>(initialState.accumulatedSeconds);
  const lastStartedAtRef = useRef<number | null>(initialState.lastStartedAt);

  // Sincronizar estado cuando se resuelve storageKey (ej. tras cargar la rutina del atleta)
  useEffect(() => {
    if (!storageKey) return;
    const timerId = setTimeout(() => {
      const restored = getInitialTimerState(storageKey);
      accumulatedRef.current = restored.accumulatedSeconds;
      lastStartedAtRef.current = restored.lastStartedAt;
      setIsRunning(restored.isRunning);
      setSeconds(restored.seconds);
    }, 0);
    return () => clearTimeout(timerId);
  }, [storageKey]);

  // Persistir en localStorage tanto en la clave específica como en la clave global
  const saveToStorage = useCallback(
    (accumulated: number, running: boolean, lastStarted: number | null) => {
      try {
        const state: StoredTimer = {
          accumulatedSeconds: accumulated,
          isRunning: running,
          lastStartedAt: lastStarted,
          date: date ?? todayInArgentina(),
        };
        const serialized = JSON.stringify(state);
        if (storageKey) {
          localStorage.setItem(storageKey, serialized);
        }
        localStorage.setItem(GLOBAL_TIMER_KEY, serialized);
      } catch {
        // Ignorar excepciones de cuota o modo incógnito
      }
    },
    [storageKey, date],
  );

  // Intervalo de conteo activo con cálculo de delta temporal exacto (no se pierde al cambiar de pestaña)
  useEffect(() => {
    if (!isRunning) return;

    const tick = () => {
      const startedAt = lastStartedAtRef.current;
      if (startedAt) {
        const delta = Math.floor((Date.now() - startedAt) / 1000);
        setSeconds(accumulatedRef.current + Math.max(0, delta));
      }
    };

    const interval = setInterval(tick, 1000);

    // Al volver a la pestaña tras navegar o cambiar de foco, sincronizar inmediatamente
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isRunning) {
        tick();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isRunning]);

  const start = useCallback(() => {
    const now = Date.now();
    lastStartedAtRef.current = now;
    setIsRunning(true);
    saveToStorage(accumulatedRef.current, true, now);
  }, [saveToStorage]);

  const pause = useCallback(() => {
    const now = Date.now();
    let currentTotal = accumulatedRef.current;
    if (lastStartedAtRef.current) {
      currentTotal += Math.floor((now - lastStartedAtRef.current) / 1000);
    }
    accumulatedRef.current = currentTotal;
    lastStartedAtRef.current = null;
    setIsRunning(false);
    setSeconds(currentTotal);
    saveToStorage(currentTotal, false, null);
  }, [saveToStorage]);

  const toggle = useCallback(() => {
    if (isRunning) {
      pause();
    } else {
      start();
    }
  }, [isRunning, pause, start]);

  const reset = useCallback(() => {
    accumulatedRef.current = 0;
    lastStartedAtRef.current = null;
    setIsRunning(false);
    setSeconds(0);
    saveToStorage(0, false, null);
  }, [saveToStorage]);

  const minutes = seconds > 0 ? Math.max(1, Math.round(seconds / 60)) : 0;
  const formattedTime = formatTimerSeconds(seconds);

  return {
    seconds,
    isRunning,
    minutes,
    formattedTime,
    start,
    pause,
    toggle,
    reset,
  };
}
