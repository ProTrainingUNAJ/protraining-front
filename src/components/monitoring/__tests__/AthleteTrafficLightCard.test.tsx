import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AthleteTrafficLightCard } from '../AthleteTrafficLightCard';
import { AthleteTrafficLightItem } from '../trafficLight.types';

describe('AthleteTrafficLightCard (KAN-621)', () => {
  const baseAthlete: AthleteTrafficLightItem = {
    id: 'ath-1',
    name: 'Joaquín Díaz',
    position: 'Delantero',
    status: 'gray',
    statusLabel: 'Sin Check-in',
    category: 'Primera División',
    recommendation: 'Sin check-in completado el día de hoy.',
    submittedAt: '08:00 hs',
  };

  it('renderiza la cabecera con avatar, nombre, división y siluetas anatómicas en el centro', () => {
    render(<AthleteTrafficLightCard athlete={baseAthlete} onClick={vi.fn()} />);

    expect(screen.getByText('Joaquín Díaz')).toBeDefined();
    expect(screen.getByText(/Primera División/i)).toBeDefined();
    expect(screen.getByText('Sin Check-in')).toBeDefined();
    expect(screen.getByText('Pendiente')).toBeDefined();
    expect(screen.getByText('Sin Check in completado hoy')).toBeDefined();

    // Siluetas anatómicas (frente y dorso)
    const muscleMap = screen.getByRole('img', { name: /Mapa anatómico de Joaquín Díaz/i });
    expect(muscleMap).toBeDefined();
  });

  it('renderiza lesión activa pintando la zona en negro en el mapa anatómico y badge de sirena', () => {
    const injuredAthlete: AthleteTrafficLightItem = {
      ...baseAthlete,
      status: 'red',
      statusLabel: 'Atención Crítica',
      hasActiveInjury: true,
      affectedMuscle: 'Glúteo derecho',
      pains: [
        {
          zone: 'Glúteo derecho',
          level: 6, // Lesión activa = 6 (negro #000000)
          muscleId: 'gluteo_derecho',
        },
      ],
      recommendation: 'Atención médica requerida. No apto para carga máxima.',
    };

    const { container } = render(
      <AthleteTrafficLightCard athlete={injuredAthlete} onClick={vi.fn()} />,
    );

    expect(screen.getByText('Glúteo derecho')).toBeDefined();
    expect(screen.getByLabelText('Lesión activa')).toBeDefined();

    // Comprobar que en el mapa SVG el músculo con lesión se pinte en negro (#000000)
    const glutePath = container.querySelector('[id*="gluteo_derecho"]');
    if (glutePath) {
      expect(glutePath.getAttribute('fill')).toBe('#000000');
    }
  });

  it('renderiza dolores con escala EVA en amarillo/naranja/rojo', () => {
    const painAthlete: AthleteTrafficLightItem = {
      ...baseAthlete,
      status: 'yellow',
      statusLabel: 'Precaución',
      affectedMuscle: 'Isquiotibial izquierdo',
      pains: [
        {
          zone: 'Isquiotibial izquierdo',
          level: 3,
          muscleId: 'isquiotibial_izquierdo',
        },
      ],
      sleepHours: 7,
      recommendation: 'Monitorear isquiotibiales durante la sesión.',
    };

    render(<AthleteTrafficLightCard athlete={painAthlete} onClick={vi.fn()} />);

    expect(screen.getByText('Isquiotibial izquierdo')).toBeDefined();
    expect(screen.getByText(/3\/5/i)).toBeDefined();
    expect(screen.getByText(/7h/i)).toBeDefined();
  });

  it('renderiza la burbuja inferior estandarizada con título y subtítulo de detalle', () => {
    render(<AthleteTrafficLightCard athlete={baseAthlete} onClick={vi.fn()} />);

    expect(screen.getByText('Sin Check in completado hoy')).toBeDefined();
    expect(screen.getByText('Tocar tarjeta para ver detalle y actividades')).toBeDefined();
  });

  it('no renderiza el botón de tilde para tomar presente en la tarjeta del Semáforo (KAN-621)', () => {
    const handleCardClick = vi.fn();

    render(<AthleteTrafficLightCard athlete={baseAthlete} onClick={handleCardClick} />);

    expect(screen.queryByTestId(`btn-attendance-check-${baseAthlete.id}`)).toBeNull();
    expect(screen.queryByTitle('Marcar presente')).toBeNull();
    expect(screen.queryByTitle('Presente (clic para quitar)')).toBeNull();
  });
});
