import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { DayDetailDrawer } from '../DayDetailDrawer';
import { matchService } from '../../../services/matchService';
import { Match } from '../../../types/structure';

vi.mock('../../../services/seasonPlanningService', () => ({
  seasonPlanningService: {
    getSessionsForDate: vi.fn().mockResolvedValue([]),
  },
}));

describe('DayDetailDrawer (KAN-404)', () => {
  const mockMatches: Match[] = [
    {
      id: 'match-1',
      categoryId: 'cat-1',
      opponent: 'Club Almagro',
      matchDate: '2026-11-07T15:30:00',
      startTime: '15:30:00',
      homeOrAway: 'Home',
    },
    {
      id: 'match-2',
      categoryId: 'cat-1',
      opponent: 'Club San Telmo',
      matchDate: '2026-11-07',
      startTime: null,
      homeOrAway: 'Away',
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('muestra la hora formateada para partidos con horario y "Sin horario" para partidos sin hora', async () => {
    render(
      <MemoryRouter>
        <DayDetailDrawer
          isOpen={true}
          onClose={vi.fn()}
          isoDate="2026-11-07"
          matches={mockMatches}
          onAddMatch={vi.fn()}
        />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('15:30 hs')).toBeDefined();
      expect(screen.getByText('Sin horario')).toBeDefined();
      expect(screen.getByText(/VS Club Almagro/i)).toBeDefined();
      expect(screen.getByText(/VS Club San Telmo/i)).toBeDefined();
    });
  });

  it('avisa en la interfaz mediante un mensaje de error si falla la eliminacion del partido', async () => {
    vi.spyOn(matchService, 'deleteMatch').mockRejectedValue(
      new Error('Error de conexion: no se pudo eliminar el partido en Estructura'),
    );

    render(
      <MemoryRouter>
        <DayDetailDrawer
          isOpen={true}
          onClose={vi.fn()}
          isoDate="2026-11-07"
          matches={[mockMatches[0]]}
          onAddMatch={vi.fn()}
        />
      </MemoryRouter>,
    );

    const deleteButtons = screen.getAllByTitle('Eliminar partido');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(
        screen.getByText('Error de conexion: no se pudo eliminar el partido en Estructura'),
      ).toBeDefined();
    });
  });

  it('llama a deleteMatch con la categoria y matchId al confirmar eliminacion', async () => {
    const deleteSpy = vi.spyOn(matchService, 'deleteMatch').mockResolvedValue(undefined);

    render(
      <MemoryRouter>
        <DayDetailDrawer
          isOpen={true}
          onClose={vi.fn()}
          isoDate="2026-11-07"
          matches={[mockMatches[0]]}
          onAddMatch={vi.fn()}
        />
      </MemoryRouter>,
    );

    const deleteButtons = screen.getAllByTitle('Eliminar partido');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledWith('cat-1', 'match-1');
    });
  });

  it('muestra la organizacion y categoria del partido cuando estan disponibles', async () => {
    const matchWithOrg: Match = {
      id: 'match-org-1',
      categoryId: 'cat-primera',
      opponent: 'Atlético Varela',
      matchDate: '2026-11-21T15:30:00',
      startTime: '15:30:00',
      homeOrAway: 'Home',
      categoryName: 'Primera División',
      organizationName: 'Club Defensa y Justicia',
    };

    render(
      <MemoryRouter>
        <DayDetailDrawer
          isOpen={true}
          onClose={vi.fn()}
          isoDate="2026-11-21"
          matches={[matchWithOrg]}
          categories={[
            {
              id: 'cat-primera',
              organizationId: 'org-1',
              name: 'Primera División',
              athletesCount: 25,
              organizationName: 'Club Defensa y Justicia',
            },
          ]}
          onAddMatch={vi.fn()}
        />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Organización:')).toBeDefined();
      expect(screen.getByText('Club Defensa y Justicia')).toBeDefined();
      expect(screen.getByText('Categoría:')).toBeDefined();
      expect(screen.getByText('Primera División')).toBeDefined();
      expect(screen.getByText(/VS Atlético Varela/i)).toBeDefined();
    });
  });
});
