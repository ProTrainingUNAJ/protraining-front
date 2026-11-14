import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { CheckInWelcomeSlide } from '../CheckInWelcomeSlide';

describe('CheckInWelcomeSlide (KAN-547)', () => {
  it('renderiza con la clase pixel-slide-card para altura y ancho homogéneos', () => {
    const { container } = render(<CheckInWelcomeSlide onStart={vi.fn()} />);

    const card = container.querySelector('.pixel-slide-card.pixel-welcome-card');
    expect(card).not.toBeNull();
  });

  it('renderiza el título y el pie de tarjeta', () => {
    render(<CheckInWelcomeSlide onStart={vi.fn()} />);

    expect(screen.getByText('Check-in')).toBeDefined();
    expect(screen.getByText('diario')).toBeDefined();
    expect(screen.getByText('¿Listo para entrenar? Completá tu registro')).toBeDefined();
  });

  it('ejecuta onStart al hacer clic en el botón Iniciar', () => {
    const onStart = vi.fn();
    render(<CheckInWelcomeSlide onStart={onStart} />);

    const startBtn = screen.getByRole('button', { name: /Iniciar/i });
    fireEvent.click(startBtn);

    expect(onStart).toHaveBeenCalledTimes(1);
  });
});
