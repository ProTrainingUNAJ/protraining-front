import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService } from '../authService';
import {
  forgotPassword as forgotPasswordSdk,
  resetPassword as resetPasswordSdk,
} from '../generated/identidad';

vi.mock('../generated/identidad', () => ({
  changePassword: vi.fn(),
  resetAthletePassword: vi.fn(),
  forgotPassword: vi.fn(),
  resetPassword: vi.fn(),
  registerByInvitation: vi.fn(),
  registerPf: vi.fn(),
  confirmEmail: vi.fn(),
  resendConfirmation: vi.fn(),
  getGoogleLinkStatus: vi.fn(),
  linkGoogleAccount: vi.fn(),
  unlinkGoogleAccount: vi.fn(),
}));

describe('authService password recovery SDK integration (KAN-575)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('calls generated forgotPassword SDK with trimmed email and throwOnError without requiring session', async () => {
    vi.mocked(forgotPasswordSdk).mockResolvedValueOnce({
      data: {
        message: 'Si el correo está registrado, recibirás un enlace para recuperar tu contraseña.',
      },
    } as never);

    const message = await authService.forgotPassword('  atleta@protraining.app  ');

    expect(forgotPasswordSdk).toHaveBeenCalledWith({
      body: { email: 'atleta@protraining.app' },
      throwOnError: true,
    });
    expect(message).toBe(
      'Si el correo está registrado, recibirás un enlace para recuperar tu contraseña.',
    );
  });

  it('propagates 429 rate-limit ProblemDetails message from forgotPassword SDK', async () => {
    const rateLimitMessage =
      'Realizaste demasiadas solicitudes. Esperá unos minutos antes de volver a intentarlo.';
    vi.mocked(forgotPasswordSdk).mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        status: 429,
        data: {
          title: 'Demasiadas solicitudes',
          detail: rateLimitMessage,
          status: 429,
        },
      },
    });

    await expect(authService.forgotPassword('atleta@protraining.app')).rejects.toThrow(
      rateLimitMessage,
    );
  });

  it('calls generated resetPassword SDK with trimmed email, token, and newPassword', async () => {
    vi.mocked(resetPasswordSdk).mockResolvedValueOnce({
      data: { message: 'Contraseña actualizada exitosamente.' },
    } as never);

    const message = await authService.resetPassword({
      email: '  atleta@protraining.app ',
      token: 'tok-123',
      newPassword: 'Password123',
    });

    expect(resetPasswordSdk).toHaveBeenCalledWith({
      body: {
        email: 'atleta@protraining.app',
        token: 'tok-123',
        newPassword: 'Password123',
      },
      throwOnError: true,
    });
    expect(message).toBe('Contraseña actualizada exitosamente.');
  });
});
