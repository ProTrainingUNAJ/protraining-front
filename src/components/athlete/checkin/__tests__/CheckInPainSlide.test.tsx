import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { CheckInPainSlide } from '../CheckInPainSlide';

describe('CheckInPainSlide (KAN-660)', () => {
  it('deshabilita el botón siguiente si tiene lesión activa pero no está marcada con negro en el mapa', () => {
    render(
      <CheckInPainSlide
        musclePains={{}}
        onPainChange={vi.fn()}
        onClearAll={vi.fn()}
        hasActiveInjury={true}
        healthQuestionsAnswered={true}
        onPrev={vi.fn()}
        onNext={vi.fn()}
      />,
    );

    const nextBtn = screen.getByRole('button', { name: /Ir al siguiente paso/i });
    expect(nextBtn).toBeDefined();
    expect(nextBtn.hasAttribute('disabled')).toBe(true);
    expect(nextBtn.getAttribute('aria-disabled')).toBe('true');
    expect(nextBtn.getAttribute('title')).toContain('Debés marcar la lesión');
  });

  it('habilita el botón siguiente cuando la lesión está marcada con color negro (nivel 6)', () => {
    render(
      <CheckInPainSlide
        musclePains={{ isquiotibial_derecho: 6 }}
        onPainChange={vi.fn()}
        onClearAll={vi.fn()}
        hasActiveInjury={true}
        healthQuestionsAnswered={true}
        onPrev={vi.fn()}
        onNext={vi.fn()}
      />,
    );

    const nextBtn = screen.getByRole('button', { name: /Ir al siguiente paso/i });
    expect(nextBtn.hasAttribute('disabled')).toBe(false);
  });

  it('permite avanzar si el atleta indica que no hay lesión (hasActiveInjury === false)', () => {
    render(
      <CheckInPainSlide
        musclePains={{}}
        onPainChange={vi.fn()}
        onClearAll={vi.fn()}
        hasActiveInjury={false}
        healthQuestionsAnswered={true}
        onPrev={vi.fn()}
        onNext={vi.fn()}
      />,
    );

    const nextBtn = screen.getByRole('button', { name: /Ir al siguiente paso/i });
    expect(nextBtn.hasAttribute('disabled')).toBe(false);
  });

  it('marca automáticamente con negro la lesión reportada en activeInjuries', () => {
    const onPainChange = vi.fn();
    render(
      <CheckInPainSlide
        musclePains={{}}
        onPainChange={onPainChange}
        onClearAll={vi.fn()}
        hasActiveInjury={true}
        healthQuestionsAnswered={true}
        activeInjuries={[
          { id: 'inj-1', zone: 'isquiotibiales', description: 'Molestia en isquios' },
        ]}
        injuryScores={{ 'inj-1': 5 }}
        onPrev={vi.fn()}
        onNext={vi.fn()}
      />,
    );

    expect(onPainChange).toHaveBeenCalledWith('isquiotibial_derecho', 6);
    expect(onPainChange).toHaveBeenCalledWith('isquiotibial_izquierdo', 6);
  });
});
