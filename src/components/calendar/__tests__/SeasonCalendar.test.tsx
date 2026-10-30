import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { SeasonCalendarView } from '../SeasonCalendarView';
import { matchService } from '../../../services/matchService';
import { Category, Match } from '../../../types/structure';

vi.mock('../../../api/structureService', () => ({
  structureService: {
    getCategoryMatches: vi.fn().mockImplementation(() => {
      // Returns items in localStorage to simulate persistent backend
      try {
        const raw = localStorage.getItem('protraining_season_matches_v1');
        return Promise.resolve(raw ? JSON.parse(raw) : []);
      } catch {
        return Promise.resolve([]);
      }
    }),
    createCategoryMatch: vi.fn().mockImplementation((catId, data) =>
      Promise.resolve({
        id: 'test-match-123',
        categoryId: catId,
        opponent: data.opponent,
        matchDate: data.matchDate,
        homeOrAway: data.homeOrAway,
        notes: data.notes,
      }),
    ),
  },
}));

vi.mock('../../../api/trainingPlans', () => ({
  trainingPlansService: {
    list: vi
      .fn()
      .mockResolvedValue([{ id: 'plan-1', name: 'Fuerza base', objective: 'Pretemporada' }]),
    assign: vi.fn().mockResolvedValue(undefined),
    schedule: vi.fn().mockImplementation((date) => {
      if (date === '2026-10-28') {
        return Promise.resolve([
          {
            assignmentId: 'assign-1',
            trainingPlanId: 'plan-1',
            planName: 'Fuerza base',
            sessionName: 'Día 1: Pecho y Tríceps',
            sessionDayOfWeek: 2,
            exerciseCount: 5,
            categoryId: 'cat-primera',
          },
        ]);
      }
      return Promise.resolve([]);
    }),
  },
}));

const mockCategories: Category[] = [
  {
    id: 'cat-primera',
    organizationId: 'org-1',
    name: 'Primera División',
    athletesCount: 24,
  },
  {
    id: 'cat-reserva',
    organizationId: 'org-1',
    name: 'Reserva',
    athletesCount: 20,
  },
];

const renderWithRouter = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('SeasonCalendarView (KAN-404)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders the Season Calendar title and controls', async () => {
    renderWithRouter(<SeasonCalendarView categories={mockCategories} />);

    await waitFor(() => {
      expect(screen.getByText('Calendario de Temporada')).toBeDefined();
    });
    expect(screen.getByText('Programar Partido')).toBeDefined();
    expect(screen.queryByText('Programar Entrenamiento')).toBeNull();
    expect(screen.getByRole('button', { name: 'Mes' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Semana' })).toBeDefined();
  });

  it('switches between monthly and weekly views', async () => {
    renderWithRouter(<SeasonCalendarView categories={mockCategories} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Semana' })).toBeDefined();
    });

    const weekBtn = screen.getByRole('button', { name: 'Semana' });
    fireEvent.click(weekBtn);

    expect(screen.getByText('Lunes')).toBeDefined();
    expect(screen.getByText('Sábado')).toBeDefined();
    expect(screen.getByText('Domingo')).toBeDefined();

    const monthBtn = screen.getByRole('button', { name: 'Mes' });
    fireEvent.click(monthBtn);

    await waitFor(() => {
      expect(screen.getByText('Lu')).toBeDefined();
      expect(screen.getByText('Sá')).toBeDefined();
    });
  });

  it('satisfies Acceptance Criteria: schedules match for upcoming Saturday and displays badge immediately', async () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilSaturday = (6 - dayOfWeek + 7) % 7 || 7;
    const saturday = new Date(today);
    saturday.setDate(today.getDate() + daysUntilSaturday);
    const targetIso = `${saturday.getFullYear()}-${String(saturday.getMonth() + 1).padStart(2, '0')}-${String(saturday.getDate()).padStart(2, '0')}`;

    const createdMatch: Match = {
      id: 'moron-match-1',
      categoryId: 'cat-primera',
      opponent: 'Deportivo Morón',
      matchDate: `${targetIso}T15:30:00.000Z`,
      homeOrAway: 'Home',
    };

    vi.spyOn(matchService, 'createMatch').mockResolvedValue(createdMatch);
    vi.spyOn(matchService, 'getMatches').mockResolvedValue([createdMatch]);

    renderWithRouter(<SeasonCalendarView categories={mockCategories} />);

    // Click on "Programar Partido"
    const addBtn = screen.getByText('Programar Partido');
    fireEvent.click(addBtn);

    // Modal opens
    expect(screen.getByText('Programar Partido Oficial')).toBeDefined();

    // Fill opponent
    const opponentInput = screen.getByPlaceholderText(/Club San Martín/i);
    fireEvent.change(opponentInput, { target: { value: 'Deportivo Morón' } });

    // Select Category in modal
    const categorySelect = screen.getByLabelText(/Categoría \/ División/i);
    fireEvent.change(categorySelect, { target: { value: 'cat-primera' } });

    // Select Date
    const dateInput = screen.getByLabelText(/Fecha del partido/i);
    fireEvent.change(dateInput, { target: { value: targetIso } });

    // Select Home condition
    const homeChip = screen.getByRole('radio', { name: /Local/i });
    fireEvent.click(homeChip);

    // Submit form
    const form = screen.getByRole('dialog').querySelector('form')!;
    fireEvent.submit(form);

    // Expect match to be rendered immediately with badge and VS text
    await waitFor(
      () => {
        const matchBadges = screen.getAllByText(/VS Deportivo Morón/i);
        expect(matchBadges.length).toBeGreaterThanOrEqual(1);
      },
      { timeout: 3000 },
    );
  });

  it('reflects active planning schedule on calendar with solid blocks', async () => {
    renderWithRouter(<SeasonCalendarView categories={mockCategories} />);

    await waitFor(() => {
      const trainingBlocks = screen.getAllByText(/Fuerza base/i);
      expect(trainingBlocks.length).toBeGreaterThanOrEqual(1);
    });
  });
});
