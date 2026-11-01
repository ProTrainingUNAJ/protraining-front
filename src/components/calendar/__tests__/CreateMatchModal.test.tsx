import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';
import { CreateMatchModal } from '../CreateMatchModal';
import { matchService } from '../../../services/matchService';
import { Category } from '../../../types/structure';

const mockCategories: Category[] = [
  { id: 'cat-primera', organizationId: 'org-1', name: 'Primera División', athletesCount: 20 },
];

describe('CreateMatchModal (KAN-404)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renderiza el modal abierto y gestiona el envío básico del formulario', async () => {
    const onMatchCreated = vi.fn();
    const onClose = vi.fn();

    vi.spyOn(matchService, 'createMatch').mockResolvedValue({
      id: 'match-1',
      categoryId: 'cat-primera',
      opponent: 'Deportivo Morón',
      matchDate: '2026-10-31T15:30:00',
      homeOrAway: 'Home',
    });

    render(
      <CreateMatchModal
        isOpen={true}
        onClose={onClose}
        categories={mockCategories}
        initialCategoryId="cat-primera"
        initialDate="2026-10-31"
        onMatchCreated={onMatchCreated}
      />,
    );

    expect(screen.getByText('Programar Partido Oficial')).toBeDefined();

    const opponentInput = screen.getByPlaceholderText(/Club San Martín/i);
    fireEvent.change(opponentInput, { target: { value: 'Deportivo Morón' } });

    const form = screen.getByRole('dialog').querySelector('form')!;
    await act(async () => {
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(matchService.createMatch).toHaveBeenCalledWith(
        'cat-primera',
        expect.objectContaining({
          opponent: 'Deportivo Morón',
          homeOrAway: 'Home',
        }),
      );
      expect(onMatchCreated).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('no corre la fecha ni la hora para un partido nocturno a las 21:30 (evita UTC shift)', async () => {
    const onMatchCreated = vi.fn();
    const onClose = vi.fn();

    const createSpy = vi.spyOn(matchService, 'createMatch').mockResolvedValue({
      id: 'match-night-1',
      categoryId: 'cat-primera',
      opponent: 'Quilmes AC',
      matchDate: '2026-11-07T21:30:00',
      homeOrAway: 'Away',
    });

    render(
      <CreateMatchModal
        isOpen={true}
        onClose={onClose}
        categories={mockCategories}
        initialCategoryId="cat-primera"
        initialDate="2026-11-07"
        onMatchCreated={onMatchCreated}
      />,
    );

    // Ingresar rival
    const opponentInput = screen.getByPlaceholderText(/Club San Martín/i);
    fireEvent.change(opponentInput, { target: { value: 'Quilmes AC' } });

    // Ingresar fecha: 2026-11-07
    const dateInput = screen.getByLabelText(/Fecha del partido/i);
    fireEvent.change(dateInput, { target: { value: '2026-11-07' } });

    // Ingresar hora: 21:30
    const timeInput = screen.getByLabelText(/Horario/i);
    fireEvent.change(timeInput, { target: { value: '21:30' } });

    const form = screen.getByRole('dialog').querySelector('form')!;
    await act(async () => {
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith(
        'cat-primera',
        expect.objectContaining({
          opponent: 'Quilmes AC',
          date: '2026-11-07',
          startTime: '21:30:00',
          matchDate: '2026-11-07T21:30:00',
        }),
      );

      // Verificación estricta: NO debe mandarse con la fecha del día siguiente ni hora corrida a UTC
      const callArgs = createSpy.mock.calls[0][1];
      expect(callArgs.date).toBe('2026-11-07');
      expect(callArgs.date).not.toBe('2026-11-08');
      expect(callArgs.startTime).toBe('21:30:00');
      expect(callArgs.startTime).not.toBe('00:30:00');

      expect(onMatchCreated).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('muestra el mensaje de error y no cierra el modal si la creación en el backend falla', async () => {
    const onMatchCreated = vi.fn();
    const onClose = vi.fn();

    vi.spyOn(matchService, 'createMatch').mockRejectedValue(
      new Error('No se pudo conectar con el servidor de estructura'),
    );

    render(
      <CreateMatchModal
        isOpen={true}
        onClose={onClose}
        categories={mockCategories}
        initialCategoryId="cat-primera"
        initialDate="2026-11-07"
        onMatchCreated={onMatchCreated}
      />,
    );

    const opponentInput = screen.getByPlaceholderText(/Club San Martín/i);
    fireEvent.change(opponentInput, { target: { value: 'Almirante Brown' } });

    const form = screen.getByRole('dialog').querySelector('form')!;
    await act(async () => {
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(screen.getByText('No se pudo conectar con el servidor de estructura')).toBeDefined();
      expect(onMatchCreated).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    });
  });
});
