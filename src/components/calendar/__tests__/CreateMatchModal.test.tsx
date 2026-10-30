import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';
import { CreateMatchModal } from '../CreateMatchModal';
import { matchService } from '../../../services/matchService';
import { Category } from '../../../types/structure';

const mockCategories: Category[] = [
  { id: 'cat-primera', organizationId: 'org-1', name: 'Primera División', athletesCount: 20 },
];

describe('CreateMatchModal', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders modal when open and handles form submission', async () => {
    const onMatchCreated = vi.fn();
    const onClose = vi.fn();

    vi.spyOn(matchService, 'createMatch').mockResolvedValue({
      id: 'match-1',
      categoryId: 'cat-primera',
      opponent: 'Deportivo Morón',
      matchDate: '2026-10-31T15:30:00.000Z',
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
});
