import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { IntervalTimerModal } from '../IntervalTimerModal';

describe('IntervalTimerModal (Tabata / Intervalos)', () => {
  it('renderiza la configuración inicial con tiempo de trabajo y opciones de descanso', () => {
    render(
      <IntervalTimerModal
        isOpen={true}
        onClose={vi.fn()}
        exerciseName="Plancha isométrica"
        defaultWorkSeconds={30}
        totalSets={4}
      />,
    );

    expect(screen.getByText('Plancha isométrica')).toBeTruthy();
    expect(screen.getByDisplayValue('30')).toBeTruthy();
    expect(screen.getByText('Iniciar Temporizador')).toBeTruthy();
  });

  it('inicia la cuenta regresiva de preparación al hacer clic en Iniciar', () => {
    vi.useFakeTimers();

    render(
      <IntervalTimerModal
        isOpen={true}
        onClose={vi.fn()}
        exerciseName="Plancha isométrica"
        defaultWorkSeconds={20}
        totalSets={3}
      />,
    );

    fireEvent.click(screen.getByText('Iniciar Temporizador'));

    expect(screen.getByText('¡PREPARATE!')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();

    // Avanza los 3 segundos de preparación
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(screen.getByText('¡A TRABAJAR!')).toBeTruthy();

    vi.useRealTimers();
  });

  it('llama a onSetCompleted cuando termina el tiempo de trabajo naturalmente', () => {
    vi.useFakeTimers();
    const handleSetCompleted = vi.fn();

    render(
      <IntervalTimerModal
        isOpen={true}
        onClose={vi.fn()}
        exerciseName="Plancha isométrica"
        defaultWorkSeconds={5}
        totalSets={2}
        onSetCompleted={handleSetCompleted}
      />,
    );

    fireEvent.click(screen.getByText('Iniciar Temporizador'));

    // Pasa los 3 segundos de preparación
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(screen.getByText('¡A TRABAJAR!')).toBeTruthy();
    expect(handleSetCompleted).not.toHaveBeenCalled();

    // Pasa los 5 segundos de trabajo
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Debe haberse llamado a onSetCompleted con la serie 1
    expect(handleSetCompleted).toHaveBeenCalledWith(1);
    expect(screen.getByText('DESCANSO')).toBeTruthy();

    vi.useRealTimers();
  });
});
