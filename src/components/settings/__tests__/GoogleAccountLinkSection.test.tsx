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
  });

  it('muestra estado Sin vincular y exige reautenticación con contraseña antes de vincular', async () => {
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

    expect(await screen.findByText('Sin vincular')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /Vincular cuenta de Google/i }));

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
      expect(screen.getByText('Cuenta de Google vinculada')).toBeDefined();
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
    await screen.findByText('Sin vincular');

    fireEvent.click(screen.getByRole('button', { name: /Vincular cuenta de Google/i }));
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
    expect(screen.getByText('Sin vincular')).toBeDefined();
  });

  it('permite desvincular Google tras confirmar contraseña actual', async () => {
    vi.mocked(authService.getGoogleLinkStatus).mockResolvedValueOnce(true);
    vi.mocked(authService.unlinkGoogleAccount).mockResolvedValueOnce(false);

    render(<GoogleAccountLinkSection />);

    expect(await screen.findByText('Cuenta de Google vinculada')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /Desvincular Google/i }));

    fireEvent.change(screen.getByLabelText(/Confirmá tu contraseña actual para desvincular/i), {
      target: { value: 'Password123!' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Confirmar desvinculación/i }));

    await waitFor(() => {
      expect(authService.unlinkGoogleAccount).toHaveBeenCalledWith('Password123!');
      expect(screen.getByText('Cuenta de Google desvinculada correctamente.')).toBeDefined();
      expect(screen.getByText('Sin vincular')).toBeDefined();
    });
  });
});
