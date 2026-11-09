import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RoutinePage } from '../RoutinePage';
import { todayRoutineService } from '../../../api/todayRoutine';

vi.mock('../../../api/todayRoutine', () => ({
  todayRoutineService: {
    getMyRoutine: vi.fn(),
    recordSets: vi.fn(),
  },
}));

describe('RoutinePage · Video de YouTube por ejercicio (KAN-380)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('CRITERIO 2: DADO un ejercicio sin link CUANDO el atleta lo ve ENTONCES no aparece el botón', async () => {
    vi.mocked(todayRoutineService.getMyRoutine).mockResolvedValue({
      date: '2026-11-04',
      athleteId: 'ath-1',
      athleteName: 'Lucas Gómez',
      hasActiveInjuries: false,
      routineAdapted: false,
      exercises: [
        {
          exerciseId: 'ex-no-video',
          name: 'Press de Banca Plano',
          muscleGroup: 'Pecho',
          sets: 3,
          reps: 10,
          isReference: false,
          videoUrl: null, // Sin video
          images: [],
          primaryMuscles: ['pecho'],
          secondaryMuscles: [],
        },
      ],
    });

    render(
      <MemoryRouter>
        <RoutinePage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Press de Banca Plano')).toBeTruthy();
    });

    // Criterio 2: El botón "Ver video" no debe aparecer
    expect(screen.queryByRole('button', { name: /ver video/i })).toBeNull();
  });

  it('CRITERIO 1: DADO un ejercicio con link CUANDO el atleta toca «Ver video» ENTONCES el video se reproduce dentro de la app', async () => {
    vi.mocked(todayRoutineService.getMyRoutine).mockResolvedValue({
      date: '2026-11-04',
      athleteId: 'ath-1',
      athleteName: 'Lucas Gómez',
      hasActiveInjuries: false,
      routineAdapted: false,
      exercises: [
        {
          exerciseId: 'ex-with-video',
          name: 'Sentadilla Trasera',
          muscleGroup: 'Piernas',
          sets: 4,
          reps: 8,
          isReference: false,
          videoUrl: 'https://www.youtube.com/watch?v=aclHkVaku9U',
          images: [],
          primaryMuscles: ['cuádriceps'],
          secondaryMuscles: [],
        },
      ],
    });

    render(
      <MemoryRouter>
        <RoutinePage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Sentadilla Trasera')).toBeTruthy();
    });

    // El botón debe estar presente porque tiene videoUrl
    const videoBtn = screen.getByRole('button', { name: /ver video/i });
    expect(videoBtn).toBeTruthy();

    // Antes de tocarlo, no está el reproductor desplegado (no quita espacio)
    expect(screen.queryByTitle('Video de técnica: Sentadilla Trasera')).toBeNull();

    // El atleta toca «Ver video»
    fireEvent.click(videoBtn);

    // Criterio 1: El video se reproduce dentro de la app (iframe desplegado)
    const iframe = screen.getByTitle('Video de técnica: Sentadilla Trasera');
    expect(iframe).toBeTruthy();
    expect(iframe.getAttribute('src')).toBe(
      'https://www.youtube-nocookie.com/embed/aclHkVaku9U?rel=0',
    );

    // El botón ahora conmuta a "Ocultar video"
    expect(screen.getByRole('button', { name: /ocultar video/i })).toBeTruthy();

    // Si vuelve a tocarlo, se oculta
    fireEvent.click(screen.getByRole('button', { name: /ocultar video/i }));
    expect(screen.queryByTitle('Video de técnica: Sentadilla Trasera')).toBeNull();
  });

  describe('RoutinePage · Meta de tiempo por test (KAN-455)', () => {
    it('Criterio de aceptación: DADO 100 m al 90 % con meta calculada ENTONCES muestra 15,6 s y "6 series × 100 m"', async () => {
      vi.mocked(todayRoutineService.getMyRoutine).mockResolvedValue({
        date: '2026-11-08',
        athleteId: 'ath-1',
        athleteName: 'Lucas Gómez',
        hasActiveInjuries: false,
        routineAdapted: false,
        exercises: [
          {
            exerciseId: 'ex-sprints',
            name: 'Sprints',
            muscleGroup: 'Piernas',
            sets: 6,
            reps: 100,
            isReference: false,
            images: [],
            primaryMuscles: ['cuádriceps'],
            secondaryMuscles: [],
            exerciseType: 'Distance',
            targetTimeSeconds: 15.6,
          },
        ],
      });

      render(
        <MemoryRouter>
          <RoutinePage />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText('Sprints')).toBeTruthy();
      });

      // Valida que diga "100 m" en vez de "100 reps"
      expect(screen.getByText(/6 (series )?× 100 m · meta 15,6 s/)).toBeTruthy();
      // Valida la meta de tiempo y la etiqueta
      expect(screen.getAllByText(/15,6/).length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText('Meta de tiempo')).toBeTruthy();
    });

    it('serie sin test: muestra "Sin meta" y "Ritmo libre"', async () => {
      vi.mocked(todayRoutineService.getMyRoutine).mockResolvedValue({
        date: '2026-11-08',
        athleteId: 'ath-1',
        athleteName: 'Lucas Gómez',
        hasActiveInjuries: false,
        routineAdapted: false,
        exercises: [
          {
            exerciseId: 'ex-pasadas',
            name: 'Pasadas',
            muscleGroup: 'Piernas',
            sets: 4,
            reps: 200,
            isReference: true,
            images: [],
            primaryMuscles: ['cuádriceps'],
            secondaryMuscles: [],
            exerciseType: 'Distance',
            targetTimeSeconds: null,
          },
        ],
      });

      render(
        <MemoryRouter>
          <RoutinePage />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText('Pasadas')).toBeTruthy();
      });

      expect(screen.getByText('4 series × 200 m')).toBeTruthy();
      expect(screen.getByText('Sin meta')).toBeTruthy();
      expect(screen.getByText('Ritmo libre')).toBeTruthy();
    });
  });
});
