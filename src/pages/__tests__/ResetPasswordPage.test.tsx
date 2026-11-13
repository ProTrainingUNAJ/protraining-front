import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ResetPasswordPage } from '../ResetPasswordPage';
import { authService } from '../../api/authService';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    themePreference: 'system',
    setThemePreference: vi.fn(),
  }),
}));

vi.mock('../../api/authService', () => ({
  authService: {
    resetPassword: vi.fn(),
  },
}));

describe('ResetPasswordPage (#KAN-540)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Muestra advertencia si los parámetros email o token faltan en la URL', () => {
    render(
      <MemoryRouter initialEntries={['/reset-password']}>
        <ResetPasswordPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Enlace no válido')).toBeDefined();
    expect(screen.getByText(/El enlace de recuperación es incompleto/i)).toBeDefined();
    expect(screen.getByText('Solicitar un nuevo enlace')).toBeDefined();
  });

  it('2. Renderiza formulario con parámetros válidos y checklist de política unificada', () => {
    render(
      <MemoryRouter
        initialEntries={['/reset-password?email=atleta%40protraining.app&token=tok123']}
      >
        <ResetPasswordPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Crear nueva contraseña')).toBeDefined();
    expect(screen.getByText(/atleta@protraining.app/i)).toBeDefined();
    expect(screen.getByLabelText(/^Nueva contraseña/i)).toBeDefined();
    expect(screen.getByLabelText(/Repetir nueva contraseña/i)).toBeDefined();
    expect(screen.getByText('Mínimo 8 caracteres y al menos un número')).toBeDefined();
    expect(screen.getByTestId('btn-reset-password-submit')).toBeDefined();
  });

  it('3. Valida política unificada de contraseñas (mínimo 8 caracteres y al menos un dígito)', async () => {
    render(
      <MemoryRouter
        initialEntries={['/reset-password?email=atleta%40protraining.app&token=tok123']}
      >
        <ResetPasswordPage />
      </MemoryRouter>,
    );

    const newPassInput = screen.getByTestId('reset-new-password-input');
    const confirmPassInput = screen.getByTestId('reset-confirm-password-input');
    const submitBtn = screen.getByTestId('btn-reset-password-submit');

    // Corta (< 8 caracteres)
    fireEvent.change(newPassInput, { target: { value: 'ab1' } });
    fireEvent.change(confirmPassInput, { target: { value: 'ab1' } });
    fireEvent.click(submitBtn);

    expect(
      screen.getByText(
        'La nueva contraseña debe tener al menos 8 caracteres y al menos un número.',
      ),
    ).toBeDefined();
    expect(authService.resetPassword).not.toHaveBeenCalled();

    // Sin dígito
    fireEvent.change(newPassInput, { target: { value: 'sololetras' } });
    fireEvent.change(confirmPassInput, { target: { value: 'sololetras' } });
    fireEvent.click(submitBtn);

    expect(
      screen.getByText(
        'La nueva contraseña debe tener al menos 8 caracteres y al menos un número.',
      ),
    ).toBeDefined();
    expect(authService.resetPassword).not.toHaveBeenCalled();
  });

  it('4. Valida que las contraseñas coincidan', async () => {
    render(
      <MemoryRouter
        initialEntries={['/reset-password?email=atleta%40protraining.app&token=tok123']}
      >
        <ResetPasswordPage />
      </MemoryRouter>,
    );

    const newPassInput = screen.getByTestId('reset-new-password-input');
    const confirmPassInput = screen.getByTestId('reset-confirm-password-input');
    const submitBtn = screen.getByTestId('btn-reset-password-submit');

    fireEvent.change(newPassInput, { target: { value: 'PasswordSegura1' } });
    fireEvent.change(confirmPassInput, { target: { value: 'OtraPasswordDistinta2' } });
    fireEvent.click(submitBtn);

    expect(screen.getByText('Las contraseñas no coinciden.')).toBeDefined();
    expect(authService.resetPassword).not.toHaveBeenCalled();
  });

  it('5. Restablecimiento exitoso invoca API y muestra confirmación con botón al login', async () => {
    vi.mocked(authService.resetPassword).mockResolvedValueOnce(
      'Contraseña actualizada exitosamente.',
    );

    render(
      <MemoryRouter
        initialEntries={['/reset-password?email=atleta%40protraining.app&token=tok123']}
      >
        <ResetPasswordPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByTestId('reset-new-password-input'), {
      target: { value: 'NuevaPassword123' },
    });
    fireEvent.change(screen.getByTestId('reset-confirm-password-input'), {
      target: { value: 'NuevaPassword123' },
    });

    fireEvent.click(screen.getByTestId('btn-reset-password-submit'));

    await waitFor(() => {
      expect(authService.resetPassword).toHaveBeenCalledWith({
        email: 'atleta@protraining.app',
        token: 'tok123',
        newPassword: 'NuevaPassword123',
      });
      expect(screen.getByRole('status').textContent).toContain(
        'Tu contraseña fue actualizada correctamente',
      );
      expect(screen.getByText('Iniciar sesión')).toBeDefined();
    });
  });

  it('6. Token inválido o vencido muestra mensaje de error y enlace para solicitar nuevo reseteo', async () => {
    vi.mocked(authService.resetPassword).mockRejectedValueOnce(
      new Error('El enlace de recuperación es inválido o ha vencido. Solicitá uno nuevo.'),
    );

    render(
      <MemoryRouter
        initialEntries={['/reset-password?email=atleta%40protraining.app&token=tokVencido']}
      >
        <ResetPasswordPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByTestId('reset-new-password-input'), {
      target: { value: 'NuevaPassword123' },
    });
    fireEvent.change(screen.getByTestId('reset-confirm-password-input'), {
      target: { value: 'NuevaPassword123' },
    });

    fireEvent.click(screen.getByTestId('btn-reset-password-submit'));

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain(
        'El enlace de recuperación es inválido o ha vencido. Solicitá uno nuevo.',
      );
      expect(screen.getByText('Solicitar otro enlace')).toBeDefined();
    });
  });
});
