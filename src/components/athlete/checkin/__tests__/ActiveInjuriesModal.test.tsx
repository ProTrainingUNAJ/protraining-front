import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ActiveInjuriesModal } from '../ActiveInjuriesModal';

describe('ActiveInjuriesModal', () => {
  const injuries = [
    {
      id: 'inj-1',
      zone: 'isquiotibiales',
      description: 'Distensión grado 1 en un sprint del entrenamiento.',
    },
    {
      id: 'inj-2',
      zone: 'cuádriceps',
      description: 'Sobrecarga muscular.',
    },
  ];

  it('renders modal with injury zone, description and slider when isOpen is true', () => {
    const handleScoreChange = vi.fn();
    const handleClose = vi.fn();

    render(
      <ActiveInjuriesModal
        isOpen={true}
        onClose={handleClose}
        activeInjuries={injuries}
        injuryScores={{ 'inj-1': 3 }}
        onScoreChange={handleScoreChange}
      />,
    );

    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByText(/Lesiones activas/i)).toBeDefined();
    expect(screen.getByText(/isquiotibiales — Distensión grado 1/i)).toBeDefined();
    expect(screen.getByText(/Lesión 1 de 2/i)).toBeDefined();
  });

  it('does not render when isOpen is false', () => {
    const handleScoreChange = vi.fn();
    const handleClose = vi.fn();

    render(
      <ActiveInjuriesModal
        isOpen={false}
        onClose={handleClose}
        activeInjuries={injuries}
        injuryScores={{}}
        onScoreChange={handleScoreChange}
      />,
    );

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('allows advancing to next injury and closing when finished', () => {
    const handleScoreChange = vi.fn();
    const handleClose = vi.fn();

    render(
      <ActiveInjuriesModal
        isOpen={true}
        onClose={handleClose}
        activeInjuries={injuries}
        injuryScores={{ 'inj-1': 2, 'inj-2': 4 }}
        onScoreChange={handleScoreChange}
      />,
    );

    const nextBtn = screen.getByRole('button', { name: /Siguiente lesión/i });
    fireEvent.click(nextBtn);

    expect(screen.getByText(/cuádriceps — Sobrecarga muscular/i)).toBeDefined();
    expect(screen.getByText(/Lesión 2 de 2/i)).toBeDefined();

    const finishBtn = screen.getByRole('button', { name: /Confirmar lesión/i });
    fireEvent.click(finishBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  // el 0 es una respuesta explícita, no un valor por defecto disfrazado.
  it('does not auto-assign a score of 0 when confirming without touching the slider', () => {
    const handleScoreChange = vi.fn();
    const handleClose = vi.fn();

    render(
      <ActiveInjuriesModal
        isOpen={true}
        onClose={handleClose}
        activeInjuries={[injuries[0]]}
        injuryScores={{}}
        onScoreChange={handleScoreChange}
      />,
    );

    expect(screen.getByText(/Deslizá la barra para puntuar esta lesión/i)).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: /Confirmar lesión/i }));

    expect(handleScoreChange).not.toHaveBeenCalled();
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
