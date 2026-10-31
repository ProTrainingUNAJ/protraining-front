import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CategoriesPage } from '../CategoriesPage';
import { structureService } from '../../../api/structureService';
import { categoryInvitationsService } from '../../../api/categoryInvitations';

vi.mock('../../../api/structureService', () => ({
  structureService: {
    getOrganizations: vi.fn(),
    getCategories: vi.fn(),
    withAthleteCounts: vi.fn(),
    createCategory: vi.fn(),
  },
}));

vi.mock('../../../api/categoryInvitations', () => ({
  categoryInvitationsService: {
    generate: vi.fn(),
  },
}));

describe('CategoriesPage · Invitar Atletas (KAN-400)', () => {
  const mockOrgs = [{ id: 'org-1', name: 'Club Atlético Pro', categoriesCount: 1 }];

  const mockCategories = [
    {
      id: 'cat-1',
      organizationId: 'org-1',
      name: 'Primera División',
      description: 'Plantel Superior',
      athletesCount: 18,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(structureService.getOrganizations).mockResolvedValue(mockOrgs);
    vi.mocked(structureService.getCategories).mockResolvedValue(mockCategories);
    vi.mocked(structureService.withAthleteCounts).mockResolvedValue(mockCategories);
  });

  it('muestra el botón "Invitar Atletas" en la tarjeta de categoría', async () => {
    render(
      <MemoryRouter>
        <CategoriesPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Primera División')).toBeDefined();
    });

    const inviteBtn = screen.getByRole('button', { name: /Invitar atletas a Primera División/i });
    expect(inviteBtn).toBeDefined();
  });

  it('abre el modal de invitación con el QR y enlace al hacer clic en "Invitar Atletas"', async () => {
    vi.mocked(categoryInvitationsService.generate).mockResolvedValueOnce({
      token: 'tok-abc',
      expiresAt: '2026-11-07T15:00:00.000Z',
      categoryId: 'cat-1',
      categoryName: 'Primera División',
      invitationUrl: 'http://localhost:5173/invite/tok-abc',
    });

    render(
      <MemoryRouter>
        <CategoriesPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Primera División')).toBeDefined();
    });

    const inviteBtn = screen.getByRole('button', { name: /Invitar atletas a Primera División/i });
    fireEvent.click(inviteBtn);

    // Se abre el modal
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeDefined();
      expect(screen.getByText(/Vence el 07\/11\/2026 a las 12:00 hs/)).toBeDefined();
    });

    expect(categoryInvitationsService.generate).toHaveBeenCalledWith('cat-1');
  });
});
