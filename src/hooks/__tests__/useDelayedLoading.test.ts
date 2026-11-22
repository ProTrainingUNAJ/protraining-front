import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDelayedLoading } from '../useDelayedLoading';

describe('useDelayedLoading (KAN-597)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('no muestra el indicador si la carga termina antes del delay de 300 ms', () => {
    const { result, rerender } = renderHook(({ loading }) => useDelayedLoading(loading), {
      initialProps: { loading: true },
    });

    expect(result.current).toBe(false);

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe(false);

    rerender({ loading: false });

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current).toBe(false);
  });

  it('muestra el indicador al cumplirse los 300 ms de espera', () => {
    const { result } = renderHook(({ loading }) => useDelayedLoading(loading), {
      initialProps: { loading: true },
    });

    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(result.current).toBe(false);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe(true);
  });

  it('mantiene el indicador visible al menos 400 ms una vez mostrado para evitar parpadeo', () => {
    const { result, rerender } = renderHook(({ loading }) => useDelayedLoading(loading), {
      initialProps: { loading: true },
    });

    // Aparece a los 300 ms
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe(true);

    // La respuesta llega 50 ms después de mostrarse (t = 350 ms)
    act(() => {
      vi.advanceTimersByTime(50);
    });
    rerender({ loading: false });
    expect(result.current).toBe(true);

    // Faltan 350 ms para completar los 400 ms mínimos
    act(() => {
      vi.advanceTimersByTime(349);
    });
    expect(result.current).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe(false);
  });

  it('oculta inmediatamente el indicador si ya estuvo visible más de 400 ms', () => {
    const { result, rerender } = renderHook(({ loading }) => useDelayedLoading(loading), {
      initialProps: { loading: true },
    });

    act(() => {
      vi.advanceTimersByTime(800);
    });
    expect(result.current).toBe(true);

    rerender({ loading: false });
    act(() => {
      vi.advanceTimersByTime(0);
    });
    expect(result.current).toBe(false);
  });

  it('mantiene el indicador sin parpadear si vuelve a cargar durante la retención mínima', () => {
    const { result, rerender } = renderHook(({ loading }) => useDelayedLoading(loading), {
      initialProps: { loading: true },
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe(true);

    rerender({ loading: false });
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(result.current).toBe(true);

    // Arranca una nueva carga antes de que se cumplan los 400 ms
    rerender({ loading: true });
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(result.current).toBe(true);
  });

  it('respeta opciones personalizadas de delayMs y minDurationMs', () => {
    const { result, rerender } = renderHook(
      ({ loading }) => useDelayedLoading(loading, { delayMs: 100, minDurationMs: 250 }),
      { initialProps: { loading: true } },
    );

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe(true);

    rerender({ loading: false });
    act(() => {
      vi.advanceTimersByTime(249);
    });
    expect(result.current).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe(false);
  });
});
