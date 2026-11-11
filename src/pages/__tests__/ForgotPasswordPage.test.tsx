import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ForgotPasswordPage } from '../ForgotPasswordPage';
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
    forgotPassword: vi.fn(),
  },
}));

describe('ForgotPasswordPage (#KAN-540)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Renderiza formulario de recuperación con campo de correo y botón de envío', () => {
    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Recuperar contraseña')).toBeDefined();
    expect(screen.getByLabelText(/Correo electrónico/i)).toBeDefined();
    expect(screen.getByTestId('btn-send-recovery')).toBeDefined();
    expect(screen.getByText(/Volver a iniciar sesión/i)).toBeDefined();
  });

  it('2. Valida correo vacío o formato inválido antes de invocar la API', async () => {
    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>,
    );

    const submitBtn = screen.getByTestId('btn-send-recovery');

    // Envío con campo vacío
    fireEvent.click(submitBtn);
    expect(screen.getByText('El correo electrónico es obligatorio.')).toBeDefined();
    expect(authService.forgotPassword).not.toHaveBeenCalled();

    // Envío con formato incorrecto
    const input = screen.getByTestId('recovery-email-input');
    fireEvent.change(input, { target: { value: 'formato-invalido' } });
    fireEvent.click(submitBtn);

    expect(screen.getByText('Ingresá un formato de correo electrónico válido.')).toBeDefined();
    expect(authService.forgotPassword).not.toHaveBeenCalled();
  });

  it('3. Envío exitoso muestra mensaje genérico de confirmación anti-enumeración', async () => {
    const successMsg =
      'Si el correo está registrado, recibirás un enlace para recuperar tu contraseña.';
    vi.mocked(authService.forgotPassword).mockResolvedValueOnce(successMsg);

    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>,
    );

    const input = screen.getByTestId('recovery-email-input');
    fireEvent.change(input, { target: { value: 'atleta@protraining.app' } });

    fireEvent.click(screen.getByTestId('btn-send-recovery'));

    await waitFor(() => {
      expect(authService.forgotPassword).toHaveBeenCalledWith('atleta@protraining.app');
      expect(screen.getByRole('status').textContent).toContain(successMsg);
      expect(screen.getByText('Volver al inicio de sesión')).toBeDefined();
    });
  });

  it('4. Manejo de error de red muestra mensaje descriptivo', async () => {
    vi.mocked(authService.forgotPassword).mockRejectedValueOnce(
      new Error('Servicio no disponible momentáneamente.'),
    );

    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>,
    );

    const input = screen.getByTestId('recovery-email-input');
    fireEvent.change(input, { target: { value: 'atleta@protraining.app' } });

    fireEvent.click(screen.getByTestId('btn-send-recovery'));

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain(
        'Servicio no disponible momentáneamente.',
      );
    });
  });
});
