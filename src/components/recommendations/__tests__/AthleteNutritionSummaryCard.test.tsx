import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { AthleteNutritionSummaryCard } from '../AthleteNutritionSummaryCard';

describe('AthleteNutritionSummaryCard', () => {
  it('renderiza estado vacío cuando no se proporciona peso o altura', () => {
    render(<AthleteNutritionSummaryCard athleteName="Lucas Gómez" />);
    expect(screen.getByTestId('athlete-nutrition-empty')).toBeDefined();
    expect(screen.getByText(/Lucas Gómez no tiene/i)).toBeDefined();
  });

  it('renderiza la tarjeta nutricional completa con calorías y macros cuando se proveen datos', () => {
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

    // Verificamos IMC en el footer
    expect(screen.getByText(/IMC:/i)).toBeDefined();
    expect(screen.getByText(/TMB Basal:/i)).toBeDefined();
    expect(screen.getByText(/Gasto Total \(TDEE\):/i)).toBeDefined();
  });
});
