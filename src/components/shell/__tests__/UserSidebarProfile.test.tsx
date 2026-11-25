import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { UserSidebarProfile } from '../UserSidebarProfile';
import { useAuth } from '../../../context/AuthContext';
import { usersService } from '../../../api/users';

vi.mock('../../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../../api/users', () => ({
  usersService: {
    getMyPhotoUrl: vi.fn((userId: string, photoUpdatedAt?: string | null) =>
      photoUpdatedAt
        ? `/identidad/api/v1/users/${userId}/photo?v=${photoUpdatedAt}`
        : `/identidad/api/v1/users/${userId}/photo`,
    ),
  },
}));

describe('UserSidebarProfile', () => {
  const mockLogout = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('obtiene la foto de perfil desde identidad con el id de usuario autenticado', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 'usr-athlete-1',
        email: 'atleta@protraining.com',
        fullName: 'Lucas Gómez',
        role: 'Atleta',
        hasPhoto: true,
        photoUpdatedAt: '2026-11-25T10:00:00Z',
      },
      logout: mockLogout,
    } as never);

    render(
      <MemoryRouter initialEntries={['/athlete']}>
        <UserSidebarProfile />
      </MemoryRouter>,
    );

    expect(usersService.getMyPhotoUrl).toHaveBeenCalledWith('usr-athlete-1');
    const button = screen.getByRole('button', { name: /menú de usuario: lucas gómez/i });
    expect(button).toBeDefined();
  });

  it('despliega el menú con la información y opciones de configuración al hacer clic', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 'usr-pf-1',
        email: 'pf@protraining.com',
        fullName: 'Prof. Alejandro López',
        role: 'PreparadorFisico',
      },
      logout: mockLogout,
    } as never);

    render(
      <MemoryRouter initialEntries={['/pf']}>
        <UserSidebarProfile />
      </MemoryRouter>,
    );

    const button = screen.getByRole('button', { name: /menú de usuario: prof\. alejandro lópez/i });
    fireEvent.click(button);

    expect(screen.getByText('Prof. Alejandro López')).toBeDefined();
    expect(screen.getByText('Preparador físico')).toBeDefined();
    expect(screen.getByText('pf@protraining.com')).toBeDefined();
    expect(screen.getByRole('menuitem', { name: /configuración/i })).toBeDefined();
    expect(screen.getByRole('menuitem', { name: /cerrar sesión/i })).toBeDefined();
  });
});
