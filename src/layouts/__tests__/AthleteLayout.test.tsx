import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { AthleteLayout } from '../AthleteLayout';
import { structureService } from '../../api/structureService';
import { useAuth } from '../../context/AuthContext';
import { UserDto } from '../../types/auth';

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../components/shell/AppShell', () => ({
  AppShell: () => <div data-testid="app-shell-athlete">AppShell Mock</div>,
}));

vi.mock('../../api/structureService', () => ({
  structureService: {
    getMyConsent: vi.fn(),
    registerMyConsent: vi.fn(),
  },
}));

describe('AthleteLayout (KAN-326)', () => {
  const mockUser: UserDto = {
    id: 'athlete-account-1',
    email: 'atleta@club.com',
    fullName: 'Lucas Beltrán',
    role: 'Atleta',
    pfId: 'pf-1',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      session: null,
      isAuthenticated: true,
      isHydrating: false,
      selectedRole: 'Atleta',
      setSelectedRole: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
      theme: 'light',
      themePreference: 'system',
      setThemePreference: vi.fn(),
      toggleTheme: vi.fn(),
    });
  });

  it('muestra diálogo de error con botón "Reintentar" si falla getMyConsent y no deja pasar al atleta', async () => {
    vi.mocked(structureService.getMyConsent).mockRejectedValueOnce(
      new Error('Fallo de conexión al validar consentimiento'),
    );

    render(<AthleteLayout />);

    expect(await screen.findByText('Error al verificar consentimiento')).toBeDefined();
    expect(screen.getByText('Fallo de conexión al validar consentimiento')).toBeDefined();

    const retryButton = screen.getByRole('button', { name: /Reintentar/i });
    expect(retryButton).toBeDefined();

    // Mockeamos que el segundo intento es exitoso con consentimiento firmado
    vi.mocked(structureService.getMyConsent).mockResolvedValueOnce({
      hasSignedConsent: true,
      isMinor: false,
      allowsPhysicalTraining: true,
      allowsHabitsRecommendations: false,
    });

    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.queryByText('Error al verificar consentimiento')).toBeNull();
    });
    expect(structureService.getMyConsent).toHaveBeenCalledTimes(2);
  });

  it('muestra modal de consentimiento cuando hasSignedConsent es false', async () => {
    vi.mocked(structureService.getMyConsent).mockResolvedValueOnce({
      hasSignedConsent: false,
      isMinor: false,
      allowsPhysicalTraining: false,
      allowsHabitsRecommendations: false,
    });

    render(<AthleteLayout />);

    expect(await screen.findByText('Consentimiento Médico y Deportivo Obligatorio')).toBeDefined();
    expect(screen.getByText(/Bienvenido a ProTraining, Lucas Beltrán/i)).toBeDefined();
  });

  it('no muestra modal de consentimiento si el atleta ya firmó', async () => {
    vi.mocked(structureService.getMyConsent).mockResolvedValueOnce({
      hasSignedConsent: true,
      isMinor: false,
      allowsPhysicalTraining: true,
      allowsHabitsRecommendations: true,
    });

    render(<AthleteLayout />);

    await waitFor(() => {
      expect(screen.getByTestId('app-shell-athlete')).toBeDefined();
    });
    expect(screen.queryByText('Consentimiento Médico y Deportivo Obligatorio')).toBeNull();
  });
});
