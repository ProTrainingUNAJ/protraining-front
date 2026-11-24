import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AthleteCheckInTodayWidget } from '../AthleteCheckInTodayWidget';
import { getAthleteTodayCheckIn, type CheckIn } from '../../../api/seguimientoService';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});
vi.mock('../../../hooks/useMyAthleteId', () => ({
  useMyAthleteId: () => ({ status: 'ready', athleteId: 'ath-1' }),
}));
vi.mock('../../../api/seguimientoService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../api/seguimientoService')>();
  return { ...actual, getAthleteTodayCheckIn: vi.fn() };
});

const checkIn = (over: Partial<CheckIn>): CheckIn => ({
  id: 'ci-1',
  athleteId: 'ath-1',
  date: '2026-11-23',
  trafficLight: 'Yellow',
  trafficLightReason: 'Sueño moderado',
  sleepHours: 6,
  muscleSoreness: 2,
  fatigueLevel: 3,
  moodRate: 3,
  stressLevel: 3,
  effortRate: 7,
  isSick: false,
  painZones: 'cuadriceps:3',
  ...over,
});

function renderWidget() {
  return render(
    <MemoryRouter>
      <AthleteCheckInTodayWidget />
    </MemoryRouter>,
  );
}

describe('AthleteCheckInTodayWidget (KAN-594)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sin check-in hoy se lo pide y lleva a hacerlo', async () => {
    vi.mocked(getAthleteTodayCheckIn).mockResolvedValue(null);
    renderWidget();

    expect(await screen.findByText('Todavía no hiciste el check-in de hoy')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /Hacer check-in/ }));
    expect(navigateMock).toHaveBeenCalledWith('/athlete/check-in');
  });

  it('con check-in muestra el color, el motivo y lo que cargó', async () => {
    vi.mocked(getAthleteTodayCheckIn).mockResolvedValue(checkIn({}));
    renderWidget();

    expect(await screen.findByText('Amarillo')).toBeDefined();
    expect(screen.getByText('Entrená con atención')).toBeDefined();
    expect(screen.getByText(/Así llegás hoy:/).closest('p')?.textContent).toContain(
      'Sueño moderado',
    );
    const facts = screen.getByRole('list', { name: 'Lo que cargaste hoy' });
    expect(facts.textContent).toContain('Dormiste 6 h');
    expect(facts.textContent).toContain('Esfuerzo 7/10');
    expect(facts.textContent).toContain('Dolor: cuádriceps');
    expect(screen.getByRole('button', { name: /Ver mi check-in/ })).toBeDefined();
  });

  it('si falla la lectura muestra el error con Reintentar, no "no hiciste el check-in"', async () => {
    vi.mocked(getAthleteTodayCheckIn)
      .mockRejectedValueOnce(new Error('caído'))
      .mockResolvedValueOnce(checkIn({ trafficLight: 'Green', trafficLightReason: null }));
    renderWidget();

    expect(await screen.findByText('No pudimos leer tu check-in.')).toBeDefined();
    expect(screen.queryByText('Todavía no hiciste el check-in de hoy')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Reintentar/ }));
    expect(await screen.findByText('Estás para entrenar')).toBeDefined();
  });
});
