import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LoginForm } from '../LoginForm';

const mockNavigate = vi.fn();
const mockLoginWithGoogle = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock de useAuth para evitar montar AuthProvider y su matchMedia
vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    login: vi.fn(),
    loginWithGoogle: mockLoginWithGoogle,
    isAuthenticated: false,
    user: null,
    isHydrating: false,
  }),
}));

describe('LoginForm - Google Login Flag (KAN-551 / KAN-541)', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    delete (window as unknown as { google?: unknown }).google;
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

  it('DADO botón de Google habilitado sin Client ID CUANDO se hace clic ENTONCES muestra error descriptivo', () => {
    vi.stubEnv('VITE_GOOGLE_LOGIN_ENABLED', 'true');
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', '');

    render(
      <MemoryRouter>
        <LoginForm />
      </MemoryRouter>,
    );

    const googleBtn = screen.getByRole('button', { name: /iniciar sesión con google/i });
    fireEvent.click(googleBtn);

    expect(
      screen.getByText(/la integración con google no cuenta con client id configurado/i),
    ).toBeDefined();
  });

  it('DADO Google Identity Services inicializado CUANDO se autentica exitosamente ENTONCES navega según el rol', async () => {
    vi.stubEnv('VITE_GOOGLE_LOGIN_ENABLED', 'true');
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'test-google-client-id');

    let capturedCallback: ((response: { credential?: string }) => Promise<void>) | null = null;

    (window as unknown as { google: unknown }).google = {
      accounts: {
        id: {
          initialize: vi.fn(
            (config: { callback: (response: { credential?: string }) => Promise<void> }) => {
              capturedCallback = config.callback;
            },
          ),
          prompt: vi.fn(),
        },
      },
    };

    mockLoginWithGoogle.mockResolvedValueOnce({
      accessToken: 'fake-jwt',
      user: { role: 'Atleta' },
    });

    render(
      <MemoryRouter>
        <LoginForm />
      </MemoryRouter>,
    );

    const googleBtn = screen.getByRole('button', { name: /iniciar sesión con google/i });
    fireEvent.click(googleBtn);

    expect(capturedCallback).not.toBeNull();

    // Simular recepción de credencial de Google
    await capturedCallback!({ credential: 'valid-google-id-token' });

    await waitFor(() => {
      expect(mockLoginWithGoogle).toHaveBeenCalledWith('valid-google-id-token');
      expect(mockNavigate).toHaveBeenCalledWith('/athlete');
    });
  });

  it('habilita el botón Olvidé mi contraseña (#KAN-540) y navega a /forgot-password al pulsar', () => {
    render(
      <MemoryRouter>
        <LoginForm />
      </MemoryRouter>,
    );

    const forgotBtn = screen.getByRole('button', {
      name: /olvidé mi contraseña/i,
    });
    const registerBtn = screen.getByRole('button', {
      name: /registrarse \(próximamente\)/i,
    });

    expect(forgotBtn).toBeDefined();
    expect(forgotBtn.hasAttribute('disabled')).toBe(false);

    fireEvent.click(forgotBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/forgot-password');

    expect(registerBtn).toBeDefined();
    expect(registerBtn.hasAttribute('disabled')).toBe(true);
  });
});
