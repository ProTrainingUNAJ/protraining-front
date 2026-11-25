import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { AthleteBmiGauge } from '../AthleteBmiGauge';

describe('AthleteBmiGauge Component (KAN-664)', () => {
  it('renderiza el estado vacío si faltan datos antropométricos', () => {
    render(<AthleteBmiGauge weightKg={null} heightCm={null} athleteName="Lucas Gómez" />);

    expect(screen.getByTestId('athlete-bmi-empty')).toBeDefined();
    expect(screen.getByText(/Lucas Gómez no tiene/i)).toBeDefined();
  });

  it('calcula y renderiza el gráfico de IMC con métricas y pin para un atleta con peso saludable', () => {
    render(<AthleteBmiGauge weightKg={78} heightCm={178} athleteName="Lucas Gómez" />);

    expect(screen.getByTestId('athlete-bmi-gauge')).toBeDefined();
    expect(screen.getAllByText('Peso saludable').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('78 kg')).toBeDefined();
    expect(screen.getByText(/178 cm/)).toBeDefined();
    expect(screen.getByText('24.6 kg/m²')).toBeDefined();

    const pin = screen.getByTestId('athlete-bmi-pin');
    expect(pin).toBeDefined();
    expect(pin.style.left).not.toBe('');
  });

  it('renderiza la categoría Sobrepeso cuando corresponde', () => {
    render(<AthleteBmiGauge weightKg={85} heightCm={175} />);

    expect(screen.getAllByText('Sobrepeso').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('27.8 kg/m²')).toBeDefined();
  });

  it('renderiza la categoría Obesidad cuando el IMC es superior a 30', () => {
    render(<AthleteBmiGauge weightKg={105} heightCm={175} />);

    expect(screen.getAllByText('Obesidad').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('34.3 kg/m²')).toBeDefined();
  });

  it('renderiza la categoría Bajo peso cuando el IMC es inferior a 18.5', () => {
    render(<AthleteBmiGauge weightKg={48} heightCm={170} />);

    expect(screen.getAllByText('Bajo peso').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('16.6 kg/m²')).toBeDefined();
  });
});
