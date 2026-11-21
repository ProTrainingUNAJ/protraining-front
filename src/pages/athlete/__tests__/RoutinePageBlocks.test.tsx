import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RoutinePage } from '../RoutinePage';
import { todayRoutineService } from '../../../api/todayRoutine';

vi.mock('../../../api/todayRoutine', () => ({
  todayRoutineService: {
    getMyRoutine: vi.fn(),
    recordSets: vi.fn(),
  },
}));

vi.mock('../../../api/seguimientoService', () => ({
  getDailyLoad: vi.fn().mockResolvedValue(null),
  submitDailyLoad: vi.fn(),
}));

describe('RoutinePage · Rutina por bloques', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(todayRoutineService.recordSets).mockResolvedValue({
      recordedSetsCount: 1,
      proposalsGeneratedCount: 0,
    });
  });

  it('muestra los bloques en orden con sus títulos y los valores de la semana', async () => {
    vi.mocked(todayRoutineService.getMyRoutine).mockResolvedValue({
      date: '2026-11-04',
      athleteId: 'ath-1',
      athleteName: 'Lucas Gómez',
      hasActiveInjuries: false,
      routineAdapted: false,
      weekNumber: 2,
      blocks: [
        {
          id: 'b1',
          title: 'Entrada en calor',
          order: 1,
          exercises: [
            {
              exerciseId: 'ex-1',
              name: 'Movilidad',
              muscleGroup: 'General',
              sets: 2,
              reps: 10,
              isReference: false,
              images: [],
              primaryMuscles: [],
              secondaryMuscles: [],
              weightKg: 0,
              exerciseType: 'Weight',
            },
          ],
        },
        {
          id: 'b2',
          title: 'Fuerza A',
          order: 2,
          exercises: [
            {
              exerciseId: 'ex-2',
              name: 'Sentadilla',
              muscleGroup: 'Piernas',
              sets: 4,
              reps: 8,
              isReference: false,
              images: [],
              primaryMuscles: [],
              secondaryMuscles: [],
              weightKg: 100,
              barWeight: 20,
              weightPerSide: 40,
              exerciseType: 'Weight',
              intensityType: 'RPE',
              targetRpe: 8,
              notes: 'Controlar la bajada',
            },
          ],
        },
      ],
      exercises: [],
    });

    render(
      <MemoryRouter>
        <RoutinePage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Sentadilla')).toBeTruthy();
    });

    const headers = screen.getAllByTestId('routine-block-header');
    expect(headers.length).toBe(2);
    expect(headers[0].textContent).toContain('Entrada en calor');
    expect(headers[1].textContent).toContain('Fuerza A');

    expect(screen.getByText('Semana 2')).toBeTruthy();
    expect(screen.getByText('RPE 8')).toBeTruthy();
    expect(screen.getByText('Controlar la bajada')).toBeTruthy();
    expect(screen.getByText(/4 series × 8 reps/)).toBeTruthy();
    expect(screen.getByText(/40 kg por lado/)).toBeTruthy();
  });

  it('muestra RIR cuando la intensidad es RIR', async () => {
    vi.mocked(todayRoutineService.getMyRoutine).mockResolvedValue({
      date: '2026-11-04',
      athleteId: 'ath-1',
      routineAdapted: false,
      weekNumber: 1,
      blocks: [
        {
          id: 'b1',
          title: 'Fuerza',
          order: 1,
          exercises: [
            {
              exerciseId: 'ex-rir',
              name: 'Press',
              muscleGroup: 'Pecho',
              sets: 3,
              reps: 10,
              isReference: false,
              images: [],
              primaryMuscles: [],
              secondaryMuscles: [],
              weightKg: 60,
              exerciseType: 'Weight',
              intensityType: 'RIR',
              targetRir: 2,
            },
          ],
        },
      ],
      exercises: [],
    });

    render(
      <MemoryRouter>
        <RoutinePage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Press')).toBeTruthy();
    });

    expect(screen.getByText('RIR 2')).toBeTruthy();
    expect(screen.queryByText(/RPE/)).toBeNull();
  });

  it('oculta el encabezado de bloque cuando el único bloque se llama "Principal"', async () => {
    vi.mocked(todayRoutineService.getMyRoutine).mockResolvedValue({
      date: '2026-11-04',
      athleteId: 'ath-1',
      routineAdapted: false,
      blocks: [
        {
          id: 'b1',
          title: 'Principal',
          order: 1,
          exercises: [
            {
              exerciseId: 'ex-p',
              name: 'Flexiones',
              muscleGroup: 'Pecho',
              sets: 3,
              reps: 12,
              isReference: false,
              images: [],
              primaryMuscles: [],
              secondaryMuscles: [],
              weightKg: 0,
              exerciseType: 'Weight',
            },
          ],
        },
      ],
      exercises: [],
    });

    render(
      <MemoryRouter>
        <RoutinePage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Flexiones')).toBeTruthy();
    });

    expect(screen.queryByTestId('routine-block-header')).toBeNull();
  });

  it('mantiene el comportamiento tradicional cuando no hay bloques', async () => {
    vi.mocked(todayRoutineService.getMyRoutine).mockResolvedValue({
      date: '2026-11-04',
      athleteId: 'ath-1',
      routineAdapted: false,
      exercises: [
        {
          exerciseId: 'ex-legacy',
          name: 'Curl',
          muscleGroup: 'Bíceps',
          sets: 3,
          reps: 10,
          isReference: false,
          images: [],
          primaryMuscles: [],
          secondaryMuscles: [],
          weightKg: 15,
          exerciseType: 'Weight',
        },
      ],
    });

    render(
      <MemoryRouter>
        <RoutinePage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Curl')).toBeTruthy();
    });

    expect(screen.queryByTestId('routine-block-header')).toBeNull();
  });

  it('muestra mensaje cuando un bloque no tiene ejercicios', async () => {
    vi.mocked(todayRoutineService.getMyRoutine).mockResolvedValue({
      date: '2026-11-04',
      athleteId: 'ath-1',
      routineAdapted: false,
      weekNumber: 1,
      blocks: [
        {
          id: 'b1',
          title: 'Bloque vacío',
          order: 1,
          exercises: [],
        },
        {
          id: 'b2',
          title: 'Fuerza',
          order: 2,
          exercises: [
            {
              exerciseId: 'ex-1',
              name: 'Sentadilla',
              muscleGroup: 'Piernas',
              sets: 2,
              reps: 5,
              isReference: false,
              images: [],
              primaryMuscles: [],
              secondaryMuscles: [],
              weightKg: 80,
              exerciseType: 'Weight',
            },
          ],
        },
      ],
      exercises: [],
    });

    render(
      <MemoryRouter>
        <RoutinePage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Sentadilla')).toBeTruthy();
    });

    expect(screen.getByText('Este bloque no tiene ejercicios asignados.')).toBeTruthy();
  });

  it('oculta RPE cuando falta el valor de intensidad', async () => {
    vi.mocked(todayRoutineService.getMyRoutine).mockResolvedValue({
      date: '2026-11-04',
      athleteId: 'ath-1',
      routineAdapted: false,
      weekNumber: 3,
      blocks: [
        {
          id: 'b1',
          title: 'Fuerza',
          order: 1,
          exercises: [
            {
              exerciseId: 'ex-x',
              name: 'Remo',
              muscleGroup: 'Espalda',
              sets: 3,
              reps: 10,
              isReference: false,
              images: [],
              primaryMuscles: [],
              secondaryMuscles: [],
              weightKg: 50,
              exerciseType: 'Weight',
            },
          ],
        },
      ],
      exercises: [],
    });

    render(
      <MemoryRouter>
        <RoutinePage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Remo')).toBeTruthy();
    });

    expect(screen.queryByText(/RPE|RIR/)).toBeNull();
    expect(screen.getByText('Semana 3')).toBeTruthy();
  });
});
