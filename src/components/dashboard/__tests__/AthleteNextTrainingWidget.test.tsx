import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AthleteNextTrainingWidget } from '../AthleteNextTrainingWidget';
import { pickNextRoutine } from '../athleteHomeUtils';
import { todayRoutineService } from '../../../api/todayRoutine';
import type { TodayRoutineResponse } from '../../../api/generated/entrenamiento';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});
vi.mock('../../../api/todayRoutine', () => ({ todayRoutineService: { getMyRoutine: vi.fn() } }));
vi.mock('../../../utils/argentinaDate', () => ({
  todayInArgentina: () => '2026-11-23',
  nowTimeInArgentina: () => '10:00',
}));

const routineMock = vi.mocked(todayRoutineService.getMyRoutine);
const exercise = (name: string) => ({ name, sets: 3, reps: 5, isReference: false });
const routine = (date: string, over: Partial<TodayRoutineResponse> = {}): TodayRoutineResponse => ({
  date,
  sessionName: 'Tren inferior A',
  startTime: '18:00:00',
  weekNumber: 2,
  exercises: [
    exercise('Movilidad de cadera'),
    exercise('Sentadilla con barra'),
    exercise('Peso muerto rumano'),
    exercise('Estocadas'),
  ],
  ...over,
});
const empty = (date: string): TodayRoutineResponse => ({ date, exercises: [] });

function renderWidget() {
  return render(
    <MemoryRouter>
      <AthleteNextTrainingWidget />
    </MemoryRouter>,
  );
}

describe('AthleteNextTrainingWidget (KAN-594)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('muestra la próxima sesión con hora, semana, ejercicios y la nota del PF', async () => {
    routineMock.mockImplementation(async (date?: string) =>
      date === '2026-11-24'
        ? routine('2026-11-24', { routineAdapted: true, coachNotes: 'Sin carga en el hombro' })
        : empty(date ?? ''),
    );
    renderWidget();

    expect(await screen.findByText('Tren inferior A')).toBeDefined();
    expect(screen.getByText('Mañana')).toBeDefined();
    expect(screen.getByText('18:00')).toBeDefined();
    expect(screen.getByText(/Semana 2 · 4 ejercicios/)).toBeDefined();
    expect(screen.getByText('Sentadilla con barra')).toBeDefined();
    expect(screen.queryByText('Estocadas')).toBeNull();
    expect(screen.getByText('y 1 más')).toBeDefined();
    expect(screen.getByText('Adaptada por tu PF: Sin carga en el hombro')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: /Ver mi rutina/ }));
    expect(navigateMock).toHaveBeenCalledWith('/athlete/routine');
  });

  it('sin rutina en 7 días lo dice, sin inventar una sesión', async () => {
    routineMock.mockImplementation(async (date?: string) => empty(date ?? ''));
    renderWidget();
    expect(
      await screen.findByText('No tenés entrenamientos en los próximos 7 días.'),
    ).toBeDefined();
  });

  it('si fallan todos los días muestra el error con Reintentar, no "sin entrenamientos"', async () => {
    routineMock.mockRejectedValue(new Error('caído'));
    renderWidget();
    expect(await screen.findByText('No pudimos cargar tu rutina.')).toBeDefined();
    expect(screen.getByRole('button', { name: /Reintentar/ })).toBeDefined();
    expect(screen.queryByText(/No tenés entrenamientos/)).toBeNull();
  });

  it('la sesión de hoy que ya empezó no cuenta: pasa a la siguiente', () => {
    const next = pickNextRoutine(
      [routine('2026-11-23', { startTime: '08:00:00' }), routine('2026-11-26')],
      '2026-11-23',
      '10:00',
    );
    expect(next?.date).toBe('2026-11-26');
  });
});
