import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GoogleAccountLinkSection } from '../GoogleAccountLinkSection';
import { authService } from '../../../api/authService';

vi.mock('../../../api/authService', () => ({
  authService: {
    getGoogleLinkStatus: vi.fn(),
    linkGoogleAccount: vi.fn(),
    unlinkGoogleAccount: vi.fn(),
  },
}));

describe('GoogleAccountLinkSection (KAN-541)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv('VITE_GOOGLE_LOGIN_ENABLED', 'true');
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'test-client-id');
  });

  it('muestra estado desvinculado con acción y exige reautenticación con contraseña antes de vincular', async () => {
    vi.stubEnv('VITE_GOOGLE_LOGIN_ENABLED', 'true');
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'test-client-id');

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

    vi.mocked(authService.getGoogleLinkStatus).mockResolvedValueOnce(false);
    vi.mocked(authService.linkGoogleAccount).mockResolvedValueOnce(true);

    render(<GoogleAccountLinkSection />);

    const linkBtn = await screen.findByRole('button', { name: /Vincular cuenta de Google/i });
    expect(linkBtn).toBeDefined();
    fireEvent.click(linkBtn);

    const pwdInput = screen.getByLabelText(/Confirmá tu contraseña actual/i);
    fireEvent.change(pwdInput, { target: { value: 'Password123!' } });
    fireEvent.click(screen.getByRole('button', { name: /Continuar con Google/i }));

    await waitFor(() => {
      expect(capturedCallback).not.toBeNull();
    });

    await capturedCallback!({ credential: 'google-id-token-link' });

    await waitFor(() => {
      expect(authService.linkGoogleAccount).toHaveBeenCalledWith(
        'google-id-token-link',
        'Password123!',
      );
      expect(screen.getByText('Cuenta de Google vinculada correctamente.')).toBeDefined();
      expect(screen.getByRole('button', { name: /Vinculado/i })).toBeDefined();
    });
  });

  it('muestra error en español cuando el backend rechaza la vinculación', async () => {
    vi.stubEnv('VITE_GOOGLE_LOGIN_ENABLED', 'true');
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'test-client-id');

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

    vi.mocked(authService.getGoogleLinkStatus).mockResolvedValueOnce(false);
    vi.mocked(authService.linkGoogleAccount).mockRejectedValueOnce(
      new Error('El correo de Google no coincide con el de tu cuenta.'),
    );

    render(<GoogleAccountLinkSection />);
    const linkBtn = await screen.findByRole('button', { name: /Vincular cuenta de Google/i });

    fireEvent.click(linkBtn);
    fireEvent.change(screen.getByLabelText(/Confirmá tu contraseña actual/i), {
      target: { value: 'Password123!' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Continuar con Google/i }));

    await waitFor(() => {
      expect(capturedCallback).not.toBeNull();
    });

    await capturedCallback!({ credential: 'wrong-email-token' });

    expect(
      await screen.findByText('El correo de Google no coincide con el de tu cuenta.'),
    ).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /Cancelar/i }));
    expect(screen.getByRole('button', { name: /Vincular cuenta de Google/i })).toBeDefined();
  });

  it('permite desvincular Google tras confirmar contraseña actual', async () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'test-client-id');
    vi.mocked(authService.getGoogleLinkStatus).mockResolvedValueOnce(true);
    vi.mocked(authService.unlinkGoogleAccount).mockResolvedValueOnce(false);

    render(<GoogleAccountLinkSection />);

    const linkedBtn = await screen.findByRole('button', { name: /Vinculado/i });
    expect(linkedBtn).toBeDefined();
    fireEvent.click(linkedBtn);

    fireEvent.change(screen.getByLabelText(/Confirmá tu contraseña actual para desvincular/i), {
      target: { value: 'Password123!' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Confirmar desvinculación/i }));

    await waitFor(() => {
      expect(authService.unlinkGoogleAccount).toHaveBeenCalledWith('Password123!');
      expect(screen.getByText('Cuenta de Google desvinculada correctamente.')).toBeDefined();
      expect(screen.getByRole('button', { name: /Vincular cuenta de Google/i })).toBeDefined();
    });
  });

  it('no renderiza la sección si Google no está configurado y el usuario no está vinculado (KAN-512)', async () => {
    vi.stubEnv('VITE_GOOGLE_LOGIN_ENABLED', 'false');
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', '');
    vi.mocked(authService.getGoogleLinkStatus).mockResolvedValueOnce(false);
    const { container } = render(<GoogleAccountLinkSection />);
    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });
});
