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

  it('renderiza indicadores rápidos de check-in (sirena, termómetro, EVA, sueño, RPE) en la cabecera', () => {
    const handleClose = vi.fn();
    render(<AthleteQuickSheet athlete={athleteWithIndicators} onClose={handleClose} />);

    expect(screen.getByText('Lucas Gómez')).toBeDefined();
    expect(screen.getAllByLabelText('Lesión activa').length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText('Enfermo').length).toBeGreaterThan(0);
    // La escala EVA máxima es 5/5, la lesión es una condición clínica aparte (no 6/5)
    expect(screen.getAllByText(/5\/5/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/6\/5/i)).toBeNull();
    expect(screen.getAllByText(/4h/i).length).toBeGreaterThan(0);

    const closeBtn = screen.getByLabelText('Cerrar ficha');
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('muestra tarjetas limpias de métricas estilo card y no duplica las horas de sueño (KAN-621)', () => {
    render(<AthleteQuickSheet athlete={athleteWithIndicators} onClose={vi.fn()} />);

    // No existe la barra amarilla de texto "Check-in del día:"
    expect(screen.queryByText(/Check-in del día:/i)).toBeNull();

    // Tarjeta de Sueño y Descanso (4 hrs)
    expect(screen.getByText(/Sueño y Descanso/i)).toBeDefined();
    expect(screen.getByText('4 hrs')).toBeDefined();
    expect(screen.getByText(/Calidad: Mala/i)).toBeDefined();

    // Tarjeta de RPE / Fatiga (8 / 10)
    expect(screen.getByText(/RPE \/ Fatiga/i)).toBeDefined();
    expect(screen.getByText('8 / 10')).toBeDefined();
    expect(screen.getByText('Sobrecarga alta')).toBeDefined();

    // Tarjeta de Dolor EVA (6/5)
    expect(screen.getByText(/Dolor EVA/i)).toBeDefined();

    // Tarjeta de Estado de Salud
    expect(screen.getByText(/Estado de Salud/i)).toBeDefined();
    expect(screen.getByText('Lesión y Enfermedad')).toBeDefined();
  });

  it('muestra el desglose completo de actividades, minutos, RPE y lugar/tipo al tener actividades cargadas (KAN-621)', () => {
    const athleteWithActivities: AthleteTrafficLightItem = {
      ...athleteWithIndicators,
      totalMinutes: 56,
      totalLoad: 392,
      activities: [
        {
          type: 'Gym',
          name: 'Gimnasio',
          minutes: 56,
          rpe: 7,
        },
      ],
    };

    render(<AthleteQuickSheet athlete={athleteWithActivities} onClose={vi.fn()} />);

    expect(screen.getByText(/Actividades y Carga del Día/i)).toBeDefined();
    expect(screen.getByText('Gimnasio')).toBeDefined();
    expect(screen.getByText('Lugar / Tipo: Gimnasio')).toBeDefined();
    expect(screen.getByText('56 min')).toBeDefined();
    expect(screen.getByText('RPE 7')).toBeDefined();
    expect(screen.getByText('392 UA')).toBeDefined();
  });
});
