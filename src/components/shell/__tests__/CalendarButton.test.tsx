import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { CalendarButton } from '../CalendarButton';
import { structureService } from '../../../api/structureService';
import { matchService } from '../../../services/matchService';
import { todayRoutineService } from '../../../api/todayRoutine';
import * as checkInHelper from '../../athlete/checkin/checkInHelper';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/athlete/routine' }),
  };
});

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'ath-1', role: 'Atleta', name: 'Juan Perez' },
    isAuthenticated: true,
  }),
}));

vi.mock('../../../api/structureService', () => ({
  structureService: {
    getMe: vi.fn(),
    getOrganizations: vi.fn().mockResolvedValue([]),
    getCategories: vi.fn().mockResolvedValue([]),
    getAthletes: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../../../services/matchService', () => ({
  matchService: {
    getMatches: vi.fn(),
    subscribe: vi.fn(() => () => {}),
  },
}));

vi.mock('../../../services/seasonPlanningService', () => ({
  seasonPlanningService: {
    getSessionsForDate: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../../../api/todayRoutine', () => ({
  todayRoutineService: {
    getMyRoutine: vi.fn(),
  },
}));

describe('CalendarButton - Perfil del Atleta y Tareas Diarias', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(structureService.getMe).mockResolvedValue({
      athleteId: 'ath-1',
      fullName: 'Juan Perez',
      email: 'juan@protraining.com',
      categories: [{ id: 'cat-1', name: 'Primera División' }],
    });

    vi.mocked(matchService.getMatches).mockResolvedValue([
      {
        id: 'match-1',
        categoryId: 'cat-1',
        opponent: 'Club Atlético Rivadavia',
        matchDate: '2026-11-20T16:00:00',
        homeOrAway: 'Home',
        categoryName: 'Primera División',
      },
    ]);

    vi.mocked(todayRoutineService.getMyRoutine).mockResolvedValue({
      id: 'routine-1',
      athleteId: 'ath-1',
      date: '2026-11-03',
      coachNotes: 'Priorizar velocidad en la fase concéntrica',
      exercises: [
        {
          id: 'ex-1',
          name: 'Sentadilla Trasera',
          order: 1,
          sets: [],
        },
        {
          id: 'ex-2',
          name: 'Press Banca',
          order: 2,
          sets: [],
        },
      ],
    });

    vi.spyOn(checkInHelper, 'getCheckInCompleted').mockReturnValue(false);
  });

  it('abre el popover y vincula las tareas diarias del atleta para la fecha seleccionada', async () => {
    render(
      <MemoryRouter>
        <CalendarButton />
      </MemoryRouter>,
    );

    const button = screen.getByRole('button', { name: /abrir calendario/i });
    expect(button).toBeDefined();

    await act(async () => {
      fireEvent.click(button);
    });

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: /vista de calendario/i })).toBeDefined();
    });

    // Debe cargar tareas diarias del atleta
    await waitFor(() => {
      expect(screen.getByText(/tareas del/i)).toBeDefined();
    });

    // Tarea 1: Rutina de gimnasio
    expect(screen.getByText(/sesión de gimnasio/i)).toBeDefined();
    expect(screen.getByText(/2 ejercicios/i)).toBeDefined();
    expect(screen.getByText(/priorizar velocidad en la fase concéntrica/i)).toBeDefined();

    // Tarea 2: Check-in de bienestar (pendiente)
    expect(screen.getByText(/check-in diario de bienestar/i)).toBeDefined();
    expect(screen.getByText(/pendiente/i)).toBeDefined();

    // Tarea 3: Carga del día
    expect(screen.getByText(/registrar esfuerzo y duración/i)).toBeDefined();

    // Footer de atleta con accesos directos
    expect(screen.getByRole('button', { name: /mi rutina/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /mi progreso/i })).toBeDefined();
  });

  it('navega a la rutina del día seleccionado al hacer clic en la sesión de gimnasio', async () => {
    render(
      <MemoryRouter>
        <CalendarButton />
      </MemoryRouter>,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /abrir calendario/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/sesión de gimnasio/i)).toBeDefined();
    });

    fireEvent.click(screen.getByText(/sesión de gimnasio/i));

    expect(mockNavigate).toHaveBeenCalledWith(expect.stringMatching(/^\/athlete\/routine\?date=/));
  });

  it('navega a check-in de bienestar y a carga del día desde sus respectivas tareas', async () => {
    render(
      <MemoryRouter>
        <CalendarButton />
      </MemoryRouter>,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /abrir calendario/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/check-in diario de bienestar/i)).toBeDefined();
    });

    fireEvent.click(screen.getByText(/check-in diario de bienestar/i));
    expect(mockNavigate).toHaveBeenCalledWith('/athlete/check-in');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /abrir calendario/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/registrar esfuerzo y duración/i)).toBeDefined();
    });

    fireEvent.click(screen.getByText(/registrar esfuerzo y duración/i));
    expect(mockNavigate).toHaveBeenCalledWith('/athlete/daily-load');
  });

  it('navega a Mi Progreso desde el botón del footer', async () => {
    render(
      <MemoryRouter>
        <CalendarButton />
      </MemoryRouter>,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /abrir calendario/i }));
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /mi progreso/i })).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /mi progreso/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/athlete/progress');
  });
});
