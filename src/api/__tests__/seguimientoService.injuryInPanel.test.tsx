import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { mapTrafficLightSummaryToItem } from '../seguimientoService';
import { AthleteQuickSheet } from '../../components/monitoring/AthleteQuickSheet';
import type { AthleteTrafficLightSummary } from '../generated/seguimiento';

// el backend consolida la lesión clínica activa en PainZones con el marcador 6
// de la escala del check-in. El PF debe ver el mismo reporte que el atleta: semáforo rojo,
// flag de lesión, zona con dolor nivel 6 y la zona pintada en su mapa anatómico.
describe('lesión clínica activa en el panel del Preparador Físico', () => {
  const resumenConLesionClinica: AthleteTrafficLightSummary = {
    athleteId: 'ath-lesion-activa',
    athleteName: 'Lucas Gómez',
    trafficLight: 'Red',
    trafficLightReason: 'Lesión activa',
    hasReportedToday: true,
    reportedAt: '2026-11-21T11:00:00.000Z',
    resultValue: 20,
    indicators: {
      sleepHours: 7,
      sleepQuality: 4,
      effortRate: 5,
      isSick: false,
      hasActiveInjury: true,
      painZones: 'isquiotibiales:6',
    },
  };

  const itemDelPf = () => mapTrafficLightSummaryToItem(resumenConLesionClinica, 'Primera División');

  it('convierte painZones con marcador 6 en una zona con dolor nivel 6 para el PF', () => {
    const item = itemDelPf();

    expect(item.status).toBe('red');
    expect(item.hasActiveInjury).toBe(true);
    expect(item.recommendation).toBe('Lesión activa');
    expect(item.affectedMuscle).toBe('Isquiotibiales');
    expect(item.pains).toEqual([
      { zone: 'Isquiotibiales', muscleId: 'isquiotibial_derecho', level: 6 },
    ]);
  });

  it('muestra «Lesión activa reportada» y pinta la zona clínica en el mapa anatómico', () => {
    render(<AthleteQuickSheet athlete={itemDelPf()} mode="semaforo" onClose={vi.fn()} />);

    expect(screen.getByText('Lucas Gómez')).toBeDefined();
    expect(screen.getByText('Lesión activa reportada')).toBeDefined();
    expect(screen.getAllByText('Lesión Activa').length).toBeGreaterThan(0);
    expect(screen.getByText(/MAPA ANATÓMICO DEL CHECK-IN/i)).toBeDefined();

    // La lesión clínica llegó como texto libre ("isquiotibiales"), no como id del SVG.
    // El mapa debe resolverla a la región oficial y pintarla con nivel 6.
    // El mapa es de solo lectura: se anuncia como imagen con el resumen (KAN-594).
    expect(
      screen.getByRole('img', { name: /dolor en .*Isquiotibial derecho \(lesión\)/i }),
    ).toBeDefined();
  });
});
