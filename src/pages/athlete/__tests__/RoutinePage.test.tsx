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

  describe('RoutinePage · Meta de tiempo por test', () => {
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

    it('Criterio de aceptación KAN-457: DADO una meta de 15,6 s CUANDO el atleta carga 15,2 s ENTONCES la app la marca como cumplida', async () => {
      vi.mocked(todayRoutineService.getMyRoutine).mockResolvedValue({
        date: '2026-11-08',
        athleteId: 'ath-1',
        athleteName: 'Lucas Gómez',
        hasActiveInjuries: false,
        routineAdapted: false,
        exercises: [
          {
            exerciseId: 'ex-pasadas-100',
            name: 'Pasadas',
            muscleGroup: 'Piernas',
            sets: 1,
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
        expect(screen.getByText('Pasadas')).toBeTruthy();
      });

      // Busca el campo de texto para cargar el tiempo de la pasada 1
      const input = screen.getByLabelText(/tiempo de pasada 1/i);
      expect(input).toBeTruthy();

      // Carga 15.2 s (menor a la meta de 15.6 s)
      fireEvent.change(input, { target: { value: '15.2' } });

      // Valida que la marque como "Cumplida"
      expect(screen.getByText('Cumplida')).toBeTruthy();
    });
  });

  describe('RoutinePage · Ajuste del día por el PF (#157 · KAN-452)', () => {
    it('DADO un atleta con rutina ajustada CUANDO entra a "Mi rutina de hoy" ENTONCES ve el cartel "Tu PF ajustó la rutina de hoy" con la nota y el sustituto con sus kilos', async () => {
      vi.mocked(todayRoutineService.getMyRoutine).mockResolvedValue({
        date: '2026-11-10',
        athleteId: 'ath-1',
        athleteName: 'Lucas Gómez',
        hasActiveInjuries: false,
        routineAdapted: false,
        adjustedByCoach: true,
        adjustmentNote:
          'Se cambian los saltos por prensa de piernas por molestia en el cuádriceps (nivel 2) reportada hoy.',
        exercises: [
          {
            exerciseId: 'ex-prensa',
            name: 'Prensa de piernas',
            muscleGroup: 'Piernas',
            sets: 4,
            reps: 10,
            weightKg: 140,
            isReference: false,
            images: [],
            primaryMuscles: ['cuádriceps'],
            secondaryMuscles: ['glúteos'],
          },
        ],
      });

      render(
        <MemoryRouter>
          <RoutinePage />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('routine-adjusted-banner')).toBeTruthy();
      });

      expect(screen.getByText('Tu PF ajustó la rutina de hoy')).toBeTruthy();
      expect(
        screen.getByText(
          'Se cambian los saltos por prensa de piernas por molestia en el cuádriceps (nivel 2) reportada hoy.',
        ),
      ).toBeTruthy();
      expect(screen.getByText('Prensa de piernas')).toBeTruthy();
      expect(screen.getByText('140')).toBeTruthy();
    });

    it('DADO un atleta sin ajuste del PF CUANDO entra a su rutina ENTONCES no ve el cartel de ajuste del día', async () => {
      vi.mocked(todayRoutineService.getMyRoutine).mockResolvedValue({
        date: '2026-11-10',
        athleteId: 'ath-1',
        athleteName: 'Lucas Gómez',
        hasActiveInjuries: false,
        routineAdapted: false,
        adjustedByCoach: false,
        exercises: [
          {
            exerciseId: 'ex-saltos',
            name: 'Salto al cajón',
            muscleGroup: 'Piernas',
            sets: 3,
            reps: 8,
            isReference: true,
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
        expect(screen.getByText('Salto al cajón')).toBeTruthy();
      });

      expect(screen.queryByTestId('routine-adjusted-banner')).toBeNull();
      expect(screen.queryByText('Tu PF ajustó la rutina de hoy')).toBeNull();
    });
  });

  describe('RoutinePage · Persistencia de tiempo real en backend (KAN-457)', () => {
    it('DADO un atleta con pasadas ya registradas en el backend CUANDO entra a "Mi rutina" ENTONCES lee los tiempos del backend aunque no existan en localStorage', async () => {
      localStorage.clear();
      vi.mocked(todayRoutineService.getMyRoutine).mockResolvedValue({
        date: '2026-11-11',
        athleteId: 'ath-1',
        athleteName: 'Lucas Gómez',
        hasActiveInjuries: false,
        routineAdapted: false,
        exercises: [
          {
            exerciseId: 'ex-pasadas-100m',
            name: 'Pasadas 100m',
            muscleGroup: 'Piernas',
            sets: 2,
            reps: 100,
            isReference: false,
            images: [],
            primaryMuscles: [],
            secondaryMuscles: [],
            targetTimeSeconds: 15.6,
            exerciseType: 'Distance',
            performedSets: [
              {
                setNumber: 1,
                timeSeconds: 15.2,
              },
            ],
          },
        ],
      });

      render(
        <MemoryRouter>
          <RoutinePage />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText('Pasadas 100m')).toBeTruthy();
      });

      // La pasada 1 debe mostrar el tiempo hidratado del back (15.2) y el estado Cumplida
      const input = screen.getByLabelText('Tiempo de pasada 1') as HTMLInputElement;
      expect(input.value).toBe('15.2');
      expect(screen.getByText(/Cumplida/i)).toBeTruthy();
    });

    it('DADO un ejercicio cronometrado CUANDO el atleta ingresa un tiempo ENTONCES llama a recordSets en el backend con exerciseId, setNumber y timeSeconds', async () => {
      localStorage.clear();
      vi.mocked(todayRoutineService.getMyRoutine).mockResolvedValue({
        date: '2026-11-11',
        athleteId: 'ath-1',
        athleteName: 'Lucas Gómez',
        hasActiveInjuries: false,
        routineAdapted: false,
        exercises: [
          {
            exerciseId: 'ex-pasadas-100m',
            name: 'Pasadas 100m',
            muscleGroup: 'Piernas',
            sets: 2,
            reps: 100,
            isReference: false,
            images: [],
            primaryMuscles: [],
            secondaryMuscles: [],
            targetTimeSeconds: 15.6,
            exerciseType: 'Distance',
            performedSets: [],
          },
        ],
      });

      vi.mocked(todayRoutineService.recordSets).mockResolvedValue({
        recordedSetsCount: 1,
        proposalsGeneratedCount: 0,
      });

      render(
        <MemoryRouter>
          <RoutinePage />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText('Pasadas 100m')).toBeTruthy();
      });

      const input = screen.getByLabelText('Tiempo de pasada 1');
      fireEvent.change(input, { target: { value: '15.2' } });

      await waitFor(() => {
        expect(todayRoutineService.recordSets).toHaveBeenCalledWith([
          {
            exerciseId: 'ex-pasadas-100m',
            setNumber: 1,
            timeSeconds: 15.2,
          },
        ]);
      });
    });
  });
});
