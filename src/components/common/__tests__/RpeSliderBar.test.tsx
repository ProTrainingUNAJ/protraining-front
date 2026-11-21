import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RpeSliderBar } from '../RpeSliderBar';

describe('RpeSliderBar', () => {
  it('renderiza la barra continua y los 10 niveles RPE accesibles', () => {
    const handleChange = vi.fn();
    render(<RpeSliderBar value={7} onChange={handleChange} />);

    // Grupo accesible
    expect(screen.getByRole('group', { name: /Escala de esfuerzo/i })).toBeTruthy();

    // Input range nativo para accesibilidad
    const input = screen.getByLabelText(/Escala de esfuerzo RPE/i) as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.value).toBe('7');

    // 10 botones numéricos presentes
    for (let i = 1; i <= 10; i++) {
      expect(screen.getByRole('button', { name: `Nivel ${i}` })).toBeTruthy();
    }
  });

  it('llama a onChange al hacer click en cualquier nivel', () => {
    const handleChange = vi.fn();
    render(<RpeSliderBar value={5} onChange={handleChange} />);

    const level9Btn = screen.getByRole('button', { name: 'Nivel 9' });
    fireEvent.click(level9Btn);

    expect(handleChange).toHaveBeenCalledWith(9);
  });

  it('soporta navegación por teclado con flechas, Home y End', () => {
    const handleChange = vi.fn();
    const { container } = render(<RpeSliderBar value={5} onChange={handleChange} />);

    const sliderContainer = container.querySelector('.rpe-slider-container')!;

    // Flecha derecha: incrementa a 6
    fireEvent.keyDown(sliderContainer, { key: 'ArrowRight' });
    expect(handleChange).toHaveBeenCalledWith(6);

    // Flecha izquierda: decrementa a 4
    fireEvent.keyDown(sliderContainer, { key: 'ArrowLeft' });
    expect(handleChange).toHaveBeenCalledWith(4);

    // Home: salta a 1
    fireEvent.keyDown(sliderContainer, { key: 'Home' });
    expect(handleChange).toHaveBeenCalledWith(1);

    // End: salta a 10
    fireEvent.keyDown(sliderContainer, { key: 'End' });
    expect(handleChange).toHaveBeenCalledWith(10);
  });

  it('aplica las clases y tiers cromáticos correctos (easy, moderate, demanding, hard, max)', () => {
    const { rerender } = render(<RpeSliderBar value={2} onChange={vi.fn()} />);

    // RPE 2 -> tier easy
    const thumbEasy = document.querySelector('.rpe-slider-thumb--easy');
    expect(thumbEasy).toBeTruthy();

    // RPE 4 -> tier moderate
    rerender(<RpeSliderBar value={4} onChange={vi.fn()} />);
    expect(document.querySelector('.rpe-slider-thumb--moderate')).toBeTruthy();

    // RPE 6 -> tier demanding
    rerender(<RpeSliderBar value={6} onChange={vi.fn()} />);
    expect(document.querySelector('.rpe-slider-thumb--demanding')).toBeTruthy();

    // RPE 7 -> tier hard
    rerender(<RpeSliderBar value={7} onChange={vi.fn()} />);
    expect(document.querySelector('.rpe-slider-thumb--hard')).toBeTruthy();

    // RPE 10 -> tier max
    rerender(<RpeSliderBar value={10} onChange={vi.fn()} />);
    expect(document.querySelector('.rpe-slider-thumb--max')).toBeTruthy();
  });

  it('permite arrastrar y deslizar sobre la pista con pointer events', () => {
    const handleChange = vi.fn();
    const { container } = render(<RpeSliderBar value={3} onChange={handleChange} />);

    const track = container.querySelector('.rpe-slider-track')!;

    // Mockeamos getBoundingClientRect del track: ancho 1000px, left 0
    vi.spyOn(track, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      right: 1000,
      bottom: 40,
      width: 1000,
      height: 40,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    // PointerDown en clientX = 750 (75% -> nivel 8)
    fireEvent.pointerDown(track, { clientX: 750, pointerId: 1, button: 0 });
    expect(handleChange).toHaveBeenCalledWith(8);

    // PointerMove a clientX = 950 (95% -> nivel 10)
    fireEvent.pointerMove(track, { clientX: 950, pointerId: 1 });
    expect(handleChange).toHaveBeenCalledWith(10);

    // PointerUp libera el arrastre
    fireEvent.pointerUp(track, { pointerId: 1 });
  });

  it('respeta la prop disabled y no emite eventos', () => {
    const handleChange = vi.fn();
    render(<RpeSliderBar value={5} onChange={handleChange} disabled={true} />);

    const level8Btn = screen.getByRole('button', { name: 'Nivel 8' });
    fireEvent.click(level8Btn);
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('no renderiza rótulos descriptivos redundantes debajo de los segmentos numéricos', () => {
    render(<RpeSliderBar value={7} onChange={vi.fn()} />);

    expect(screen.queryByText('1-2 Suave')).toBeNull();
    expect(screen.queryByText('3-4 Moderado')).toBeNull();
    expect(screen.queryByText('5-6 Exigente')).toBeNull();
    expect(screen.queryByText('7-8 Duro')).toBeNull();
    expect(screen.queryByText('9-10 Máximo')).toBeNull();
  });
});
