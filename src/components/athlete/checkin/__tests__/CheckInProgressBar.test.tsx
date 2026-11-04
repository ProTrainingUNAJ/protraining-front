import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { CheckInProgressBar } from '../CheckInProgressBar';

describe('CheckInProgressBar (KAN-547)', () => {
  it('renderiza siempre los números 1, 2, 3 visibles en cada paso', () => {
    render(<CheckInProgressBar currentStep={1} totalSteps={3} onSelectStep={vi.fn()} />);

    expect(screen.getByText('1')).toBeDefined();
    expect(screen.getByText('2')).toBeDefined();
    expect(screen.getByText('3')).toBeDefined();
  });

  it('mantiene los números 1, 2 y 3 visibles incluso cuando los pasos están completados o en el resumen', () => {
    // currentStep 4 representa el resumen
    render(<CheckInProgressBar currentStep={4} totalSteps={3} onSelectStep={vi.fn()} />);

    expect(screen.getByText('1')).toBeDefined();
    expect(screen.getByText('2')).toBeDefined();
    expect(screen.getByText('3')).toBeDefined();
  });

  it('permite seleccionar pasos permitidos al hacer clic', () => {
    const onSelectStep = vi.fn();
    render(
      <CheckInProgressBar
        currentStep={2}
        totalSteps={3}
        maxReachedStep={3}
        onSelectStep={onSelectStep}
      />,
    );

    const step1Btn = screen.getByRole('button', { name: /Paso 1/i });
    fireEvent.click(step1Btn);
    expect(onSelectStep).toHaveBeenCalledWith(1);
  });
});
