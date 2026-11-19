import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRoutineTimer, formatTimerSeconds } from '../useRoutineTimer';

describe('useRoutineTimer (KAN-623)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it('formatea correctamente los segundos a HH:MM:SS o MM:SS', () => {
    expect(formatTimerSeconds(0)).toBe('00:00');
    expect(formatTimerSeconds(45)).toBe('00:45');
    expect(formatTimerSeconds(65)).toBe('01:05');
    expect(formatTimerSeconds(3600)).toBe('01:00:00');
  });

  it('inicia el cronómetro y acumula segundos en cada intervalo', () => {
    const { result } = renderHook(() => useRoutineTimer('ath-1', '2026-11-19'));

    expect(result.current.seconds).toBe(0);
    expect(result.current.isRunning).toBe(false);

    act(() => {
      result.current.start();
    });

    expect(result.current.isRunning).toBe(true);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.seconds).toBe(3);
    expect(result.current.formattedTime).toBe('00:03');
  });

  it('mantiene el cronómetro corriendo al desmontar y volver a montar (navegación a Home y regreso)', () => {
    const now = 1700000000000;
    vi.setSystemTime(now);

    const { result: firstHook, unmount } = renderHook(() => useRoutineTimer('ath-1', '2026-11-19'));

    act(() => {
      firstHook.current.start();
    });

    // Pasan 5 segundos mientras el atleta entrena
    act(() => {
      vi.advanceTimersByTime(5000);
      vi.setSystemTime(now + 5000);
    });

    expect(firstHook.current.seconds).toBe(5);

    // El atleta navega a "Home" (desmonta la vista de rutina)
    unmount();

    // Pasan 10 segundos adicionales mientras está en Home
    vi.setSystemTime(now + 15000);

    // El atleta regresa a "Mi Rutina" (se vuelve a montar el hook)
    const { result: secondHook } = renderHook(() => useRoutineTimer('ath-1', '2026-11-19'));

    // El cronómetro sigue corriendo y sumó los 10 segundos transcurridos en segundo plano
    expect(secondHook.current.isRunning).toBe(true);
    expect(secondHook.current.seconds).toBe(15);
  });

  it('pausa el cronómetro y detiene la suma de tiempo', () => {
    const { result } = renderHook(() => useRoutineTimer('ath-1', '2026-11-19'));

    act(() => {
      result.current.start();
    });

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    act(() => {
      result.current.pause();
    });

    expect(result.current.isRunning).toBe(false);
    expect(result.current.seconds).toBe(4);

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Se mantiene en 4 segundos porque estaba pausado
    expect(result.current.seconds).toBe(4);
  });

  it('resetea el cronómetro a 0 y borra el storage', () => {
    const { result } = renderHook(() => useRoutineTimer('ath-1', '2026-11-19'));

    act(() => {
      result.current.start();
    });

    act(() => {
      vi.advanceTimersByTime(10000);
      result.current.reset();
    });

    expect(result.current.seconds).toBe(0);
    expect(result.current.isRunning).toBe(false);
  });
});
