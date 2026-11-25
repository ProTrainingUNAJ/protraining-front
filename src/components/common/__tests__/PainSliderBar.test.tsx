import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { PainSliderBar } from '../PainSliderBar';
import { getPainColor, getPainLabel } from '../painSliderUtils';

describe('PainSliderBar', () => {
  it('renders all numbers from 0 to 10 as accessible buttons', () => {
    const handleChange = vi.fn();
    render(<PainSliderBar value={5} onChange={handleChange} />);

    for (let i = 0; i <= 10; i++) {
      expect(screen.getByRole('button', { name: `Nivel ${i}` })).toBeDefined();
    }
  });

  it('calls onChange with the selected number when clicked', () => {
    const handleChange = vi.fn();
    render(<PainSliderBar value={0} onChange={handleChange} />);

    const btn7 = screen.getByRole('button', { name: 'Nivel 7' });
    fireEvent.click(btn7);

    expect(handleChange).toHaveBeenCalledWith(7);
  });

  it('updates via keyboard navigation (arrow keys)', () => {
    const handleChange = vi.fn();
    render(<PainSliderBar value={5} onChange={handleChange} />);

    const container = screen.getByRole('group', { name: /Nivel de dolor o molestia/i });

    fireEvent.keyDown(container, { key: 'ArrowRight' });
    expect(handleChange).toHaveBeenCalledWith(6);

    fireEvent.keyDown(container, { key: 'ArrowLeft' });
    expect(handleChange).toHaveBeenCalledWith(4);

    fireEvent.keyDown(container, { key: 'Home' });
    expect(handleChange).toHaveBeenCalledWith(0);

    fireEvent.keyDown(container, { key: 'End' });
    expect(handleChange).toHaveBeenCalledWith(10);
  });

  it('displays the correct label and color helper functions', () => {
    expect(getPainColor(0)).toBe('var(--pain-scale-0)');
    expect(getPainColor(10)).toBe('var(--pain-scale-9-10)');
    expect(getPainLabel(0)).toContain('Sin molestia');
    expect(getPainLabel(10)).toContain('Dolor máximo');
  });
});
