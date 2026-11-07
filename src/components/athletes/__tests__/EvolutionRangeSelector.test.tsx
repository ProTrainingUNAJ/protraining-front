import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EvolutionRangeSelector } from '../EvolutionRangeSelector';
import { getEvolutionRangeOptions } from '../../../utils/evolutionRange';

describe('EvolutionRangeSelector (KAN-437 / #142)', () => {
  it('renderiza las 4 opciones de rango de fechas requeridas', () => {
    render(<EvolutionRangeSelector value="3m" onChange={vi.fn()} />);

    expect(screen.getByTestId('range-selector-4w')).toBeDefined();
    expect(screen.getByTestId('range-selector-3m')).toBeDefined();
    expect(screen.getByTestId('range-selector-6m')).toBeDefined();
    expect(screen.getByTestId('range-selector-all')).toBeDefined();

    expect(screen.getByText('4 semanas')).toBeDefined();
    expect(screen.getByText('3 meses')).toBeDefined();
    expect(screen.getByText('6 meses')).toBeDefined();
    expect(screen.getByText('Todo')).toBeDefined();
  });

  it('llama a onChange cuando el usuario hace clic en una opción diferente', () => {
    const handleChange = vi.fn();
    render(<EvolutionRangeSelector value="3m" onChange={handleChange} />);

    fireEvent.click(screen.getByTestId('range-selector-4w'));
    expect(handleChange).toHaveBeenCalledWith('4w');

    fireEvent.click(screen.getByTestId('range-selector-6m'));
    expect(handleChange).toHaveBeenCalledWith('6m');

    fireEvent.click(screen.getByTestId('range-selector-all'));
    expect(handleChange).toHaveBeenCalledWith('all');
  });

  it('getEvolutionRangeOptions genera los parámetros adecuados para la API', () => {
    const opts3m = getEvolutionRangeOptions('3m');
    expect(opts3m).toEqual({ months: 3 });

    const opts6m = getEvolutionRangeOptions('6m');
    expect(opts6m).toEqual({ months: 6 });

    const opts4w = getEvolutionRangeOptions('4w');
    expect(opts4w.from).toBeDefined();
    expect(opts4w.to).toBeDefined();

    const optsAll = getEvolutionRangeOptions('all');
    expect(optsAll.from).toBe('2000-01-01');
    expect(optsAll.to).toBeDefined();
  });
});
