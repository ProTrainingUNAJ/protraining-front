import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AthleteQuickSheet } from '../AthleteQuickSheet';
import { AthleteTrafficLightItem } from '../trafficLight.types';

describe('AthleteQuickSheet (KAN-621)', () => {
  const athleteWithIndicators: AthleteTrafficLightItem = {
    id: 'ath-lucas',
    name: 'Lucas Gómez',
    position: 'Extremo',
    status: 'red',
    statusLabel: 'Atención Crítica',
    category: 'Primera División',
    recommendation: 'Asignado a plan de rehabilitación y descarga muscular.',
    submittedAt: '17:22 hs',
    hasActiveInjury: true,
    isSick: true,
    sleepHours: 4,
    sleepQuality: 'Mala',
    rpe: 8,
    pains: [
      {
        zone: 'Glúteo derecho',
        level: 6,
        muscleId: 'gluteo_derecho',
      },
      {
        zone: 'Gemelo derecho',
        level: 5,
        muscleId: 'gemelo_derecho',
      },
    ],
  };

  it('renderiza indicadores rápidos de check-in (sirena, termómetro, EVA, sueño, RPE) en la cabecera y barra de resumen', () => {
    const handleClose = vi.fn();
    render(<AthleteQuickSheet athlete={athleteWithIndicators} onClose={handleClose} />);

    expect(screen.getByText('Lucas Gómez')).toBeDefined();
    expect(screen.getAllByLabelText('Lesión activa').length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText('Enfermo').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/6\/5/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/4h/i).length).toBeGreaterThan(0);

    const closeBtn = screen.getByLabelText('Cerrar ficha');
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
