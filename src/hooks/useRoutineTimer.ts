import { useState, useEffect, useCallback, useRef } from 'react';

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
}

function formatTimerSeconds(totalSeconds: number): string {
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

function getInitialTimerState(storageKey: string | null): {
  seconds: number;
  isRunning: boolean;
  lastStartedAt: number | null;
} {
  if (!storageKey) {
    return { seconds: 0, isRunning: false, lastStartedAt: null };
  }
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed: StoredTimer = JSON.parse(raw);
      let currentSeconds = parsed.accumulatedSeconds || 0;
      if (parsed.isRunning && parsed.lastStartedAt) {
        const delta = Math.floor((Date.now() - parsed.lastStartedAt) / 1000);
        if (delta > 0) {
          currentSeconds += delta;
        }
        return {
          seconds: currentSeconds,
          isRunning: true,
          lastStartedAt: Date.now(),
        };
      }
      return {
        seconds: currentSeconds,
        isRunning: false,
        lastStartedAt: null,
      };
    }
  } catch {
    // Ignorar error de acceso a storage
  }
  return { seconds: 0, isRunning: false, lastStartedAt: null };
}

export function useRoutineTimer(athleteId?: string, date?: string): RoutineTimerState {
  const storageKey = athleteId && date ? `protraining_routine_timer_${date}_${athleteId}` : null;

  const [initial] = useState(() => getInitialTimerState(storageKey));
  const [seconds, setSeconds] = useState<number>(initial.seconds);
  const [isRunning, setIsRunning] = useState<boolean>(initial.isRunning);
  const lastStartedAtRef = useRef<number | null>(initial.lastStartedAt);

  // Persistir en localStorage
  const saveToStorage = useCallback(
    (accumulated: number, running: boolean, lastStarted: number | null) => {
      if (!storageKey) return;
      try {
        const state: StoredTimer = {
          accumulatedSeconds: accumulated,
          isRunning: running,
          lastStartedAt: lastStarted,
        };
        localStorage.setItem(storageKey, JSON.stringify(state));
      } catch {
        // Ignorar
      }
    },
    [storageKey],
  );

  // Intervalo de conteo activo
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setSeconds((prev) => {
        const next = prev + 1;
        saveToStorage(next, true, Date.now());
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, saveToStorage]);

  const start = useCallback(() => {
    const now = Date.now();
    lastStartedAtRef.current = now;
    setIsRunning(true);
    setSeconds((prev) => {
      saveToStorage(prev, true, now);
      return prev;
    });
  }, [saveToStorage]);

  const pause = useCallback(() => {
    lastStartedAtRef.current = null;
    setIsRunning(false);
    setSeconds((prev) => {
      saveToStorage(prev, false, null);
      return prev;
    });
  }, [saveToStorage]);

  const toggle = useCallback(() => {
    if (isRunning) {
      pause();
    } else {
      start();
    }
  }, [isRunning, pause, start]);

  const reset = useCallback(() => {
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
