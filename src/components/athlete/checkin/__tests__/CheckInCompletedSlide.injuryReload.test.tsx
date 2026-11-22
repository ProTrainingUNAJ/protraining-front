import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CheckInCompletedSlide } from '../CheckInCompletedSlide';

const INJURY_ID = 'lucas-injury-id';

describe('CheckInCompletedSlide al recargar con el borrador borrado', () => {
  it('muestra la zona clínica y su puntaje 0-10 desde la respuesta del submit', () => {
    const submissionResult = {
      message: 'Check-in registrado',
      trafficLight: 'Red',
      trafficLightReason: 'Lesión activa reportada',
      checkIn: {
        sleepHours: 8,
        sleepQuality: 4,
        muscleSoreness: 2,
        fatigueLevel: 2,
        moodRate: 3,
        stressLevel: 2,
        isSick: false,
        painZones: 'isquiotibiales:6',
        hasActiveInjury: true,
        injuries: [{ injuryId: INJURY_ID, zone: 'isquiotibiales', level: 7 }],
      },
    } as never;

    render(
      <CheckInCompletedSlide
        submissionResult={submissionResult}
        sleepHours={null}
        sleepQuality={null}
        fatigueLevel={null}
        muscleSoreness={null}
        moodRate={3}
        stressLevel={2}
        isSick={false}
        hasActiveInjury={true}
        musclePains={{}}
        activeInjuries={[
          {
            id: INJURY_ID,
            zone: 'isquiotibiales',
            description: 'Distensión grado 1',
          },
        ]}
        injuryScores={{}}
        notes=""
        onEditResponses={() => {}}
      />,
    );

    expect(screen.getAllByText(/Lesión activa reportada/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/^Isquiotibiales:$/i)).toBeDefined();
    expect(screen.getByText(/Lesión · 7\/10/i)).toBeDefined();
    // sin borrador, estas métricas deben reconstruirse desde la respuesta guardada.
    expect(screen.getByText('8')).toBeDefined();
    expect(screen.getByText('Fresco')).toBeDefined();
    expect(screen.getByText('Leve')).toBeDefined();
    expect(screen.queryByText(/No registrado|Sin registrar/i)).toBeNull();
  });
});
