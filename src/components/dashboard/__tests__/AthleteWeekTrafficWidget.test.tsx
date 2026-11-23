import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AthleteWeekTrafficWidget } from '../AthleteWeekTrafficWidget';
import { buildLastDays } from '../athleteLastDays';
import { listAthleteCheckIns, type CheckIn } from '../../../api/seguimientoService';

vi.mock('../../../hooks/useMyAthleteId', () => ({
  useMyAthleteId: () => ({ status: 'ready', athleteId: 'ath-1' }),
}));
vi.mock('../../../utils/argentinaDate', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../utils/argentinaDate')>();
  return { ...actual, todayInArgentina: () => '2026-11-23' };
});
vi.mock('../../../api/seguimientoService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../api/seguimientoService')>();
  return { ...actual, listAthleteCheckIns: vi.fn() };
});

const ci = (date: string, trafficLight: CheckIn['trafficLight']): CheckIn => ({
  id: date,
  athleteId: 'ath-1',
  date,
  trafficLight,
  sleepHours: 8,
  muscleSoreness: 1,
  fatigueLevel: 2,
  moodRate: 4,
  stressLevel: 2,
  isSick: false,
});

function renderWidget() {
  return render(
    <MemoryRouter>
      <AthleteWeekTrafficWidget />
    </MemoryRouter>,
  );
}

describe('AthleteWeekTrafficWidget (KAN-594)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('arma los 7 días hasta hoy, con gris los que no tienen check-in', () => {
    const days = buildLastDays([ci('2026-11-23', 'Red'), ci('2026-11-17', 'Green')], '2026-11-23');
    expect(days.map((d) => d.date)).toEqual([
      '2026-11-17',
      '2026-11-18',
      '2026-11-19',
      '2026-11-20',
      '2026-11-21',
      '2026-11-22',
      '2026-11-23',
    ]);
    expect(days.map((d) => d.tone)).toEqual([
      'green',
      'none',
      'none',
      'none',
      'none',
      'none',
      'red',
    ]);
    // 17/11/2026 es martes y 23/11/2026, lunes
    expect(days[0].label).toBe('Martes 17/11');
    expect(days[6]).toMatchObject({ initial: 'L', isToday: true });
  });

  it('cuenta los días con check-in y los verdes, y pide el rango de 7 días', async () => {
    vi.mocked(listAthleteCheckIns).mockResolvedValue([
      ci('2026-11-23', 'Green'),
      ci('2026-11-22', 'Yellow'),
      ci('2026-11-20', 'Green'),
    ]);
    renderWidget();

    expect((await screen.findByText(/días con check-in/)).textContent).toBe(
      '3 de 7 días con check-in · 2 en verde',
    );
    expect(listAthleteCheckIns).toHaveBeenCalledWith('ath-1', '2026-11-17', '2026-11-23');
    const list = screen.getByRole('list', { name: 'Tu semáforo de los últimos 7 días' });
    expect(list.children).toHaveLength(7);
    expect(screen.getByLabelText('Hoy, Lunes 23/11: verde')).toBeDefined();
    expect(screen.getByLabelText('Sábado 21/11: sin check-in')).toBeDefined();
  });

  it('sin check-ins lo dice, y un error se muestra como error', async () => {
    vi.mocked(listAthleteCheckIns).mockResolvedValueOnce([]);
    const { unmount } = renderWidget();
    expect(await screen.findByText('Ningún check-in en los últimos 7 días.')).toBeDefined();
    unmount();

    vi.mocked(listAthleteCheckIns).mockRejectedValueOnce(new Error('caído'));
    renderWidget();
    expect(await screen.findByText('No pudimos leer tus últimos check-ins.')).toBeDefined();
  });
});
