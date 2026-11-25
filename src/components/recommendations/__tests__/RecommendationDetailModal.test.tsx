import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { RecommendationDetailModal } from '../RecommendationDetailModal';
import { structureService } from '../../../api/structureService';
import type { AthleteRecommendation } from '../../../api/recommendations';
import type { Athlete } from '../../../types/structure';

vi.mock('../../../api/structureService', () => ({
  structureService: {
    getAthleteById: vi.fn(),
  },
}));

const mockHabitsRec: AthleteRecommendation = {
  id: 'rec-1',
  athleteId: 'ath-123',
  type: 'Habits',
  status: 'Pending',
  title: 'Hidratación y descanso',
  recommendationText: 'Mantener 3 litros de agua diarios y 8 horas de sueño.',
  reason: 'Baja recuperación en check-in',
  createdAt: '2026-11-20T10:00:00Z',
  updatedAt: '2026-11-20T10:00:00Z',
  provider: 'Reglas',
  metrics: [],
};

const mockAthlete: Athlete = {
  id: 'ath-123',
  firstName: 'Lucas',
  lastName: 'Gómez',
  fullName: 'Lucas Gómez',
  email: 'lucas@protraining.com',
  phone: '1150000001',
  active: true,
  weightKg: 76,
  heightCm: 178,
  birthDate: '2000-05-15',
  gender: 'Masculino',
  athleticGoal: 'Performance',
  activeInjuriesCount: 0,
  hasPhoto: false,
  photoUpdatedAt: null,
  isMinor: false,
};

describe('RecommendationDetailModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza una sola tarjeta nutricional (sin duplicados) para recomendaciones de hábitos', () => {
    render(
      <RecommendationDetailModal
        athleteId="ath-123"
        athleteName="Lucas Gómez"
        recommendations={[mockHabitsRec]}
        statusTab="Pending"
        athleteWeightKg={76}
        athleteHeightCm={178}
        athleteBirthDate="2000-05-15"
        athleteGender="Masculino"
        athleteGoal="Rendimiento deportivo"
        onClose={vi.fn()}
        onUpdate={vi.fn()}
        onApprove={vi.fn()}
        onDiscard={vi.fn()}
      />,
    );

    // Debe existir exactamente una tarjeta nutricional
    const nutritionCards = screen.getAllByTestId('athlete-nutrition-card');
    expect(nutritionCards).toHaveLength(1);

    // No debe haber estado vacío
    expect(screen.queryByTestId('athlete-nutrition-empty')).toBeNull();
    expect(screen.queryByTestId('athlete-bmi-empty')).toBeNull();

    // Debe mostrar la escala de IMC y las calorías
    expect(screen.getByTestId('athlete-bmi-gauge')).toBeDefined();
    expect(screen.getByText(/Plan Nutricional Recomendado/i)).toBeDefined();
  });

  it('recupera automáticamente datos del atleta si no fueron provistos en las props', async () => {
    vi.mocked(structureService.getAthleteById).mockResolvedValueOnce(mockAthlete);

    render(
      <RecommendationDetailModal
        athleteId="ath-123"
        athleteName="Lucas Gómez"
        recommendations={[mockHabitsRec]}
        statusTab="Pending"
        athleteWeightKg={undefined}
        athleteHeightCm={undefined}
        onClose={vi.fn()}
        onUpdate={vi.fn()}
        onApprove={vi.fn()}
        onDiscard={vi.fn()}
      />,
    );

    expect(structureService.getAthleteById).toHaveBeenCalledWith('ath-123');

    // Esperar a que se actualice el estado y se renderice la tarjeta completa
    await waitFor(() => {
      expect(screen.getByTestId('athlete-nutrition-card')).toBeDefined();
      expect(screen.getByText(/Plan Nutricional Recomendado/i)).toBeDefined();
    });
  });
});
