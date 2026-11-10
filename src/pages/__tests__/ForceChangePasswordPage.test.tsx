import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ForceChangePasswordPage } from '../ForceChangePasswordPage';
import { authService } from '../../api/authService';

const mockNavigate = vi.fn();
const mockLogout = vi.fn();
const mockClearMustChangePassword = vi.fn();

let mockAuthState = {
  user: {
    id: 'athlete-1',
    email: 'atleta@protraining.com',
    fullName: 'Atleta Test',
    role: 'Atleta',
    pfId: 'pf-1',
    mustChangePassword: true,
  },
  isAuthenticated: true,
  isHydrating: false,
};

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    Navigate: ({ to }: { to: string }) => <div data-testid="navigate-mock">{to}</div>,
  };
});

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: mockAuthState.user,
    isAuthenticated: mockAuthState.isAuthenticated,
    isHydrating: mockAuthState.isHydrating,
    logout: mockLogout,
    clearMustChangePassword: mockClearMustChangePassword,
  }),
}));

vi.mock('../../api/authService', () => ({
  authService: {
    changePassword: vi.fn(),
  },
}));

describe('ForceChangePasswordPage (KAN-539 / F-07 a F-10)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthState = {
      user: {
        id: 'athlete-1',
        email: 'atleta@protraining.com',
        fullName: 'Atleta Test',
        role: 'Atleta',
        pfId: 'pf-1',
        mustChangePassword: true,
      },
      isAuthenticated: true,
      isHydrating: false,
    };
  });

  it('F-07 y F-08: renderiza pantalla forzada de cambio de contraseña obligatoria para atleta con mustChangePassword = true', () => {
    render(<ForceChangePasswordPage />);

    expect(screen.getByText('Cambio de contraseña obligatorio')).toBeDefined();
    expect(screen.getByText(/Tu Preparador Físico restableció tu contraseña/i)).toBeDefined();
    expect(screen.getByLabelText(/Contraseña temporal provista/i)).toBeDefined();
    expect(screen.getByLabelText(/^Nueva contraseña/i)).toBeDefined();
    expect(screen.getByLabelText(/Repetir nueva contraseña/i)).toBeDefined();
    expect(screen.getByText('Establecer nueva contraseña')).toBeDefined();
    expect(screen.getByText('Cerrar sesión')).toBeDefined();
  });

  it('redirige a /login si el usuario no está autenticado', () => {
    mockAuthState.isAuthenticated = false;
    render(<ForceChangePasswordPage />);

    expect(screen.getByTestId('navigate-mock').textContent).toBe('/login');
  });

  it('redirige a /athlete si el usuario ya no tiene mustChangePassword pendiente', () => {
    mockAuthState.user.mustChangePassword = false;
    render(<ForceChangePasswordPage />);

    expect(screen.getByTestId('navigate-mock').textContent).toBe('/athlete');
  });

  it('valida que la nueva contraseña no coincida con la temporal', async () => {
    render(<ForceChangePasswordPage />);

    fireEvent.change(screen.getByLabelText(/Contraseña temporal provista/i), {
      target: { value: 'PasswordTemp123!' },
    });
    fireEvent.change(screen.getByLabelText(/^Nueva contraseña/i), {
      target: { value: 'PasswordTemp123!' },
    });
    fireEvent.change(screen.getByLabelText(/Repetir nueva contraseña/i), {
      target: { value: 'PasswordTemp123!' },
    });

    fireEvent.click(screen.getByText('Establecer nueva contraseña'));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
      expect(
        screen.getByText('La nueva contraseña no puede ser igual a la contraseña temporal.'),
      ).toBeDefined();
    });
    expect(authService.changePassword).not.toHaveBeenCalled();
  });

  it('valida que las contraseñas coincidan', async () => {
    render(<ForceChangePasswordPage />);

    fireEvent.change(screen.getByLabelText(/Contraseña temporal provista/i), {
      target: { value: 'PasswordTemp123!' },
    });
    fireEvent.change(screen.getByLabelText(/^Nueva contraseña/i), {
      target: { value: 'PasswordNueva123!' },
    });
    fireEvent.change(screen.getByLabelText(/Repetir nueva contraseña/i), {
      target: { value: 'OtraPasswordDistinta456!' },
    });

    fireEvent.click(screen.getByText('Establecer nueva contraseña'));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
      expect(screen.getByText('Las nuevas contraseñas no coinciden.')).toBeDefined();
    });
    expect(authService.changePassword).not.toHaveBeenCalled();
  });

  it('F-09: al completar el cambio exitosamente, limpia flag mustChangePassword y navega a la app', async () => {
    vi.mocked(authService.changePassword).mockResolvedValueOnce(undefined);

    render(<ForceChangePasswordPage />);

    fireEvent.change(screen.getByLabelText(/Contraseña temporal provista/i), {
      target: { value: 'PasswordTemp123!' },
    });
    fireEvent.change(screen.getByLabelText(/^Nueva contraseña/i), {
      target: { value: 'PasswordNueva123!' },
    });
    fireEvent.change(screen.getByLabelText(/Repetir nueva contraseña/i), {
      target: { value: 'PasswordNueva123!' },
    });

    fireEvent.click(screen.getByText('Establecer nueva contraseña'));

    await waitFor(() => {
      expect(authService.changePassword).toHaveBeenCalledWith({
        currentPassword: 'PasswordTemp123!',
        newPassword: 'PasswordNueva123!',
      });
      expect(mockClearMustChangePassword).toHaveBeenCalled();
      expect(screen.getByRole('status')).toBeDefined();
      expect(
        screen.getByText('¡Contraseña actualizada exitosamente! Ingresando a tu cuenta...'),
      ).toBeDefined();
    });
  });

  it('F-10: botón Cerrar sesión cierra sesión y redirige al login', () => {
    render(<ForceChangePasswordPage />);

    fireEvent.click(screen.getByText('Cerrar sesión'));

    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
  });
});
