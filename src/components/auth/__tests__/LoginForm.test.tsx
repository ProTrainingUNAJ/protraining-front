import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LoginForm } from '../LoginForm';

// Mock de useAuth para evitar montar AuthProvider y su matchMedia
vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    login: vi.fn(),
    isAuthenticated: false,
    user: null,
    isHydrating: false,
  }),
}));

describe('LoginForm - Google Login Flag (KAN-551)', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('DADO el login por defecto CUANDO se abre ENTONCES no aparece el botón de Google', () => {
    vi.stubEnv('VITE_GOOGLE_LOGIN_ENABLED', 'false');

    render(
      <MemoryRouter>
        <LoginForm />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('button', { name: /iniciar sesión con google/i })).toBeNull();
  });

  it('DADO la bandera prendida CUANDO se abre el login ENTONCES vuelve a aparecer el botón de Google', () => {
    vi.stubEnv('VITE_GOOGLE_LOGIN_ENABLED', 'true');

    render(
      <MemoryRouter>
        <LoginForm />
      </MemoryRouter>,
    );

    const googleBtn = screen.getByRole('button', { name: /iniciar sesión con google/i });
    expect(googleBtn).toBeDefined();
  });

  it('muestra los accesos secundarios deshabilitados con (Próximamente)', () => {
    render(
      <MemoryRouter>
        <LoginForm />
      </MemoryRouter>,
    );

    const forgotBtn = screen.getByRole('button', {
      name: /¿olvidaste tu contraseña\? \(próximamente\)/i,
    });
    const registerBtn = screen.getByRole('button', {
      name: /registrarse \(próximamente\)/i,
    });

    expect(forgotBtn).toBeDefined();
    expect(forgotBtn.hasAttribute('disabled')).toBe(true);

    expect(registerBtn).toBeDefined();
    expect(registerBtn.hasAttribute('disabled')).toBe(true);
  });
});
