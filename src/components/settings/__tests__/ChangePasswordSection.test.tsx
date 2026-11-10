import React from 'react';
import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
import { fireEvent, render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ChangePasswordSection } from '../ChangePasswordSection';
import { SettingsView } from '../SettingsView';
import { authService } from '../../../api/authService';

const mockNavigate = vi.fn();
const mockLogout = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'test@protraining.com', fullName: 'Usuario Test' },
    logout: mockLogout,
    themePreference: 'system',
    setThemePreference: vi.fn(),
  }),
}));

vi.mock('../../../api/authService', () => ({
  authService: {
    changePassword: vi.fn(),
    logout: vi.fn(),
  },
}));

vi.mock('../../../api/users', () => ({
  usersService: {
    updateWhatsAppPhone: vi.fn().mockResolvedValue({ phoneNumber: '5491123456789' }),
  },
}));

vi.mock('../../../api/pushNotifications', () => ({
  isPushSupported: () => false,
  isUserSubscribed: () => Promise.resolve(false),
  getNotificationPermission: () => 'default',
  subscribeUserToPush: vi.fn(),
  unsubscribeUserFromPush: vi.fn(),
}));

describe('ChangePasswordSection (KAN-538)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('1. Visualización del formulario para Preparador Físico (PF) dentro de SettingsView', () => {
    render(
      <MemoryRouter>
        <SettingsView role="pf" />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('change-password-section')).toBeDefined();
    expect(screen.getByText('Cambiar Contraseña')).toBeDefined();
    expect(screen.getByTestId('current-password-input')).toBeDefined();
    expect(screen.getByTestId('new-password-input')).toBeDefined();
    expect(screen.getByTestId('confirm-password-input')).toBeDefined();
  });

  it('2. Visualización del formulario para Atleta dentro de SettingsView', () => {
    render(
      <MemoryRouter>
        <SettingsView role="athlete" />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('change-password-section')).toBeDefined();
    expect(screen.getByText('Cambiar Contraseña')).toBeDefined();
    expect(screen.getByTestId('current-password-input')).toBeDefined();
    expect(screen.getByTestId('new-password-input')).toBeDefined();
    expect(screen.getByTestId('confirm-password-input')).toBeDefined();
  });

  it('3. Campos obligatorios: el botón de enviar permanece deshabilitado hasta completar los tres campos', () => {
    render(
      <MemoryRouter>
        <ChangePasswordSection />
      </MemoryRouter>,
    );

    const submitBtn = screen.getByTestId('change-password-submit-btn') as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);

    fireEvent.change(screen.getByTestId('current-password-input'), {
      target: { value: 'PasswordActual123!' },
    });
    expect(submitBtn.disabled).toBe(true);

    fireEvent.change(screen.getByTestId('new-password-input'), {
      target: { value: 'NuevaPassword456!' },
    });
    expect(submitBtn.disabled).toBe(true);

    fireEvent.change(screen.getByTestId('confirm-password-input'), {
      target: { value: 'NuevaPassword456!' },
    });
    expect(submitBtn.disabled).toBe(false);
  });

  it('4. Nueva contraseña inválida: rechaza contraseñas cortas, sin dígitos o iguales a la actual', async () => {
    render(
      <MemoryRouter>
        <ChangePasswordSection />
      </MemoryRouter>,
    );

    // Corta (< 8 caracteres)
    fireEvent.change(screen.getByTestId('current-password-input'), {
      target: { value: 'PasswordActual123!' },
    });
    fireEvent.change(screen.getByTestId('new-password-input'), {
      target: { value: 'Ab1!' },
    });
    fireEvent.change(screen.getByTestId('confirm-password-input'), {
      target: { value: 'Ab1!' },
    });

    fireEvent.click(screen.getByTestId('change-password-submit-btn'));

    expect(screen.getByText(/La nueva contraseña debe tener al menos 8 caracteres y al menos un número/i)).toBeDefined();
    expect(authService.changePassword).not.toHaveBeenCalled();

    // Sin número / dígito
    fireEvent.change(screen.getByTestId('new-password-input'), {
      target: { value: 'sololetras' },
    });
    fireEvent.change(screen.getByTestId('confirm-password-input'), {
      target: { value: 'sololetras' },
    });
    fireEvent.click(screen.getByTestId('change-password-submit-btn'));
    expect(screen.getByText(/La nueva contraseña debe tener al menos 8 caracteres y al menos un número/i)).toBeDefined();

    // Igual a la actual
    fireEvent.change(screen.getByTestId('new-password-input'), {
      target: { value: 'PasswordActual123!' },
    });
    fireEvent.change(screen.getByTestId('confirm-password-input'), {
      target: { value: 'PasswordActual123!' },
    });
    fireEvent.click(screen.getByTestId('change-password-submit-btn'));
    expect(screen.getByText('La nueva contraseña no puede ser igual a la anterior.')).toBeDefined();
  });

  it('5. Contraseñas nuevas diferentes: muestra error antes de enviar', async () => {
    render(
      <MemoryRouter>
        <ChangePasswordSection />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByTestId('current-password-input'), {
      target: { value: 'PasswordActual123!' },
    });
    fireEvent.change(screen.getByTestId('new-password-input'), {
      target: { value: 'NuevaPassword456!' },
    });
    fireEvent.change(screen.getByTestId('confirm-password-input'), {
      target: { value: 'OtraPasswordDistinta789!' },
    });

    expect(screen.getByText('Las contraseñas no coinciden.')).toBeDefined();

    fireEvent.click(screen.getByTestId('change-password-submit-btn'));
    expect(screen.getByText('Las contraseñas no coinciden.')).toBeDefined();
    expect(authService.changePassword).not.toHaveBeenCalled();
  });

  it('6. Botón deshabilitado durante el envío', async () => {
    let resolveChange!: () => void;
    vi.mocked(authService.changePassword).mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveChange = resolve;
        }),
    );

    render(
      <MemoryRouter>
        <ChangePasswordSection />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByTestId('current-password-input'), {
      target: { value: 'PasswordActual123!' },
    });
    fireEvent.change(screen.getByTestId('new-password-input'), {
      target: { value: 'NuevaPassword456!' },
    });
    fireEvent.change(screen.getByTestId('confirm-password-input'), {
      target: { value: 'NuevaPassword456!' },
    });

    const submitBtn = screen.getByTestId('change-password-submit-btn') as HTMLButtonElement;
    fireEvent.click(submitBtn);

    expect(submitBtn.disabled).toBe(true);
    expect(screen.getByText('Actualizando...')).toBeDefined();

    await act(async () => {
      resolveChange();
    });
  });

  it('7. Error 400 por contraseña actual incorrecta: muestra mensaje en español sin limpiar los campos', async () => {
    vi.mocked(authService.changePassword).mockRejectedValueOnce(
      new Error('La contraseña actual es incorrecta.'),
    );

    render(
      <MemoryRouter>
        <ChangePasswordSection />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByTestId('current-password-input'), {
      target: { value: 'PasswordErronea123!' },
    });
    fireEvent.change(screen.getByTestId('new-password-input'), {
      target: { value: 'NuevaPassword456!' },
    });
    fireEvent.change(screen.getByTestId('confirm-password-input'), {
      target: { value: 'NuevaPassword456!' },
    });

    fireEvent.click(screen.getByTestId('change-password-submit-btn'));

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain(
        'La contraseña actual es incorrecta.',
      );
    });

    // Los campos no se limpian tras un fallo para que el usuario pueda corregirlos
    expect((screen.getByTestId('current-password-input') as HTMLInputElement).value).toBe(
      'PasswordErronea123!',
    );
    expect((screen.getByTestId('new-password-input') as HTMLInputElement).value).toBe(
      'NuevaPassword456!',
    );
  });

  it('8. Cambio exitoso: muestra mensaje de confirmación "Contraseña actualizada correctamente."', async () => {
    vi.mocked(authService.changePassword).mockResolvedValueOnce(undefined);

    render(
      <MemoryRouter>
        <ChangePasswordSection />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByTestId('current-password-input'), {
      target: { value: 'PasswordActual123!' },
    });
    fireEvent.change(screen.getByTestId('new-password-input'), {
      target: { value: 'NuevaPassword456!' },
    });
    fireEvent.change(screen.getByTestId('confirm-password-input'), {
      target: { value: 'NuevaPassword456!' },
    });

    fireEvent.click(screen.getByTestId('change-password-submit-btn'));

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain(
        'Contraseña actualizada correctamente',
      );
    });
  });

  it('9. Limpieza de campos después del éxito', async () => {
    vi.mocked(authService.changePassword).mockResolvedValueOnce(undefined);

    render(
      <MemoryRouter>
        <ChangePasswordSection />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByTestId('current-password-input'), {
      target: { value: 'PasswordActual123!' },
    });
    fireEvent.change(screen.getByTestId('new-password-input'), {
      target: { value: 'NuevaPassword456!' },
    });
    fireEvent.change(screen.getByTestId('confirm-password-input'), {
      target: { value: 'NuevaPassword456!' },
    });

    fireEvent.click(screen.getByTestId('change-password-submit-btn'));

    await waitFor(() => {
      expect((screen.getByTestId('current-password-input') as HTMLInputElement).value).toBe('');
      expect((screen.getByTestId('new-password-input') as HTMLInputElement).value).toBe('');
      expect((screen.getByTestId('confirm-password-input') as HTMLInputElement).value).toBe('');
    });
  });

  it('10. Comportamiento de sesión posterior al cambio: cierra sesión y redirige a /login tras temporizador', async () => {
    vi.useFakeTimers();
    vi.mocked(authService.changePassword).mockResolvedValueOnce(undefined);

    render(
      <MemoryRouter>
        <ChangePasswordSection />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByTestId('current-password-input'), {
      target: { value: 'PasswordActual123!' },
    });
    fireEvent.change(screen.getByTestId('new-password-input'), {
      target: { value: 'NuevaPassword456!' },
    });
    fireEvent.change(screen.getByTestId('confirm-password-input'), {
      target: { value: 'NuevaPassword456!' },
    });

    fireEvent.click(screen.getByTestId('change-password-submit-btn'));

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockLogout).not.toHaveBeenCalled();

    // Avanzar temporizador de 2.5s
    act(() => {
      vi.advanceTimersByTime(2500);
    });

    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
  });

  it('11. Ausencia de contraseñas en almacenamiento persistente', async () => {
    vi.mocked(authService.changePassword).mockResolvedValueOnce(undefined);

    render(
      <MemoryRouter>
        <ChangePasswordSection />
      </MemoryRouter>,
    );

    const secretCurrent = 'SecretCurrent123!';
    const secretNew = 'SecretNew456!';

    fireEvent.change(screen.getByTestId('current-password-input'), {
      target: { value: secretCurrent },
    });
    fireEvent.change(screen.getByTestId('new-password-input'), {
      target: { value: secretNew },
    });
    fireEvent.change(screen.getByTestId('confirm-password-input'), {
      target: { value: secretNew },
    });

    fireEvent.click(screen.getByTestId('change-password-submit-btn'));

    await waitFor(() => {
      expect(authService.changePassword).toHaveBeenCalled();
    });

    // Comprobar que ninguna de las contraseñas está en localStorage o sessionStorage
    const localStorageDump = JSON.stringify(localStorage);
    const sessionStorageDump = JSON.stringify(sessionStorage);

    expect(localStorageDump).not.toContain(secretCurrent);
    expect(localStorageDump).not.toContain(secretNew);
    expect(sessionStorageDump).not.toContain(secretCurrent);
    expect(sessionStorageDump).not.toContain(secretNew);
  });

  it('12. Integración correcta con el cliente de autenticación (authService.changePassword)', async () => {
    vi.mocked(authService.changePassword).mockResolvedValueOnce(undefined);

    render(
      <MemoryRouter>
        <ChangePasswordSection />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByTestId('current-password-input'), {
      target: { value: 'PasswordActual123!' },
    });
    fireEvent.change(screen.getByTestId('new-password-input'), {
      target: { value: 'NuevaPassword456!' },
    });
    fireEvent.change(screen.getByTestId('confirm-password-input'), {
      target: { value: 'NuevaPassword456!' },
    });

    fireEvent.click(screen.getByTestId('change-password-submit-btn'));

    await waitFor(() => {
      expect(authService.changePassword).toHaveBeenCalledWith({
        currentPassword: 'PasswordActual123!',
        newPassword: 'NuevaPassword456!',
      });
    });
  });
});
