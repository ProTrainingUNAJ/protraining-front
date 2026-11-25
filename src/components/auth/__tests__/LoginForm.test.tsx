import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LoginForm } from '../LoginForm';

const mockNavigate = vi.fn();
const mockLogin = vi.fn();
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
    login: mockLogin,
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

  it('DADO VITE_GOOGLE_LOGIN_ENABLED=true y VITE_GOOGLE_CLIENT_ID válido CUANDO se abre el login ENTONCES renderiza el contenedor oficial de Google (KAN-541)', async () => {
    vi.stubEnv('VITE_GOOGLE_LOGIN_ENABLED', 'true');
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'test-client-id');

    const renderButtonMock = vi.fn();
    (window as unknown as { google: unknown }).google = {
      accounts: {
        id: {
          initialize: vi.fn(),
          renderButton: renderButtonMock,
        },
      },
    };

    render(
      <MemoryRouter>
        <LoginForm />
      </MemoryRouter>,
    );

    const container = screen.getByTestId('google-signin-button-container');
    expect(container).toBeDefined();

    await waitFor(() => {
      expect(renderButtonMock).toHaveBeenCalledWith(
        container,
        expect.objectContaining({ text: 'continue_with' }),
      );
    });
  });

  it('DADO botón de Google habilitado sin Client ID CUANDO se monta ENTONCES oculta el botón de Google', () => {
    vi.stubEnv('VITE_GOOGLE_LOGIN_ENABLED', 'true');
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', '');

    render(
      <MemoryRouter>
        <LoginForm />
      </MemoryRouter>,
    );

    expect(screen.queryByTestId('google-signin-button-container')).toBeNull();
  });

  it('DADO Google Identity Services inicializado CUANDO se autentica como PF o Atleta ENTONCES navega según rol y respeta mustChangePassword', async () => {
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
          renderButton: vi.fn(),
        },
      },
    };

    mockLoginWithGoogle.mockResolvedValueOnce({
      accessToken: 'fake-jwt',
      user: { role: 'PreparadorFisico', mustChangePassword: false },
    });

    render(
      <MemoryRouter>
        <LoginForm />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(capturedCallback).not.toBeNull();
    });

    await capturedCallback!({ credential: 'valid-google-id-token-pf' });
    await waitFor(() => {
      expect(mockLoginWithGoogle).toHaveBeenCalledWith('valid-google-id-token-pf');
      expect(mockNavigate).toHaveBeenCalledWith('/pf');
    });

    mockLoginWithGoogle.mockResolvedValueOnce({
      accessToken: 'fake-jwt-2',
      user: { role: 'Atleta', mustChangePassword: true },
    });

    await capturedCallback!({ credential: 'valid-google-id-token-ath' });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/force-change-password', { replace: true });
    });
  });

  it('DADO error del backend por cuenta no vinculada o credencial vacía CUANDO responde Google ENTONCES muestra error claro en español', async () => {
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
          renderButton: vi.fn(),
        },
      },
    };

    mockLoginWithGoogle.mockRejectedValueOnce(
      new Error(
        'Esta cuenta de Google no está vinculada. Iniciá sesión con tu usuario y contraseña y vinculala desde tu perfil.',
      ),
    );

    render(
      <MemoryRouter>
        <LoginForm />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(capturedCallback).not.toBeNull();
    });

    await capturedCallback!({});
    expect(
      await screen.findByText(/No se recibió la credencial de autenticación de Google/i),
    ).toBeDefined();

    await capturedCallback!({ credential: 'unlinked-token' });
    expect(await screen.findByText(/Esta cuenta de Google no está vinculada/i)).toBeDefined();
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
      name: /^registrate$/i,
    });

    expect(forgotBtn).toBeDefined();
    expect(forgotBtn.hasAttribute('disabled')).toBe(false);

    fireEvent.click(forgotBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/forgot-password');

    expect(registerBtn).toBeDefined();
    expect(registerBtn.hasAttribute('disabled')).toBe(false);

    fireEvent.click(registerBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/registro');
  });

  it('DADO un usuario con mustChangePassword = true CUANDO inicia sesión ENTONCES navega a /force-change-password (KAN-608)', async () => {
    mockLogin.mockResolvedValueOnce({
      accessToken: 'temp-jwt',
      user: { role: 'Atleta', mustChangePassword: true },
    });

    render(
      <MemoryRouter>
        <LoginForm />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText(/correo electrónico/i), {
      target: { value: 'atleta@protraining.com' },
    });
    fireEvent.change(screen.getByLabelText(/^contraseña/i), {
      target: { value: 'ClaveTemporal123!' },
    });

    fireEvent.click(screen.getByRole('button', { name: /^iniciar sesión$/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'atleta@protraining.com',
        password: 'ClaveTemporal123!',
      });
      expect(mockNavigate).toHaveBeenCalledWith('/force-change-password', { replace: true });
    });
  });

  it('DADO un state con successMessage CUANDO se monta ENTONCES muestra la alerta de éxito', () => {
    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/login',
            state: {
              successMessage: 'Contraseña actualizada exitosamente.',
            },
          },
        ]}
      >
        <LoginForm />
      </MemoryRouter>,
    );

    expect(screen.getByText('Contraseña actualizada exitosamente.')).toBeDefined();
  });
});
