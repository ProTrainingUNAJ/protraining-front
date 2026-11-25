import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { AthleteNutritionSummaryCard } from '../AthleteNutritionSummaryCard';

describe('AthleteNutritionSummaryCard', () => {
  it('renderiza estado vacío único cuando no se proporciona peso o altura', () => {
    render(<AthleteNutritionSummaryCard athleteName="Lucas Gómez" />);
    expect(screen.getByTestId('athlete-nutrition-empty')).toBeDefined();
    expect(screen.getByText(/Lucas Gómez no tiene/i)).toBeDefined();
    expect(screen.getByText(/Calorías, Macronutrientes e IMC Personalizados/i)).toBeDefined();
  });

  it('renderiza la tarjeta nutricional completa con calorías, macros y gráfico de IMC cuando se proveen datos', () => {
    render(
      <AthleteNutritionSummaryCard
        weightKg={80}
        heightCm={180}
        birthDate="2000-01-01"
        gender="Masculino"
        athleticGoal="Ganar masa muscular"
        athleteName="Lucas Gómez"
      />,
    );

    expect(screen.getByTestId('athlete-nutrition-card')).toBeDefined();
    expect(screen.getByText(/Plan Nutricional Recomendado/i)).toBeDefined();
    expect(screen.getByText(/Ganar masa muscular/i)).toBeDefined();

    // Verificamos presencia de los tres macronutrientes
    expect(screen.getByTestId('macro-pill-protein')).toBeDefined();
    expect(screen.getByTestId('macro-pill-carbs')).toBeDefined();
    expect(screen.getByTestId('macro-pill-fat')).toBeDefined();

    // Verificamos sección y gráfico visual de IMC
    expect(screen.getByTestId('athlete-nutrition-bmi-section')).toBeDefined();
    expect(screen.getByTestId('athlete-bmi-gauge')).toBeDefined();
    expect(screen.getByTestId('athlete-bmi-pin')).toBeDefined();
    expect(screen.getAllByText('Peso saludable').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('80 kg')).toBeDefined();
    expect(screen.getByText(/180 cm/)).toBeDefined();

    // Verificamos métricas en el footer
    expect(screen.getByText(/TMB Basal:/i)).toBeDefined();
    expect(screen.getByText(/Gasto Total \(TDEE\):/i)).toBeDefined();
    expect(screen.getByText(/Mifflin-St Jeor/i)).toBeDefined();
  });
});
