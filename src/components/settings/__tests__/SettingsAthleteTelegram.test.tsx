import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SettingsView } from '../SettingsView';
import { usersService } from '../../../api/users';

const mockUpdateCurrentUser = vi.fn();

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'ath-user-01',
      fullName: 'Lucas Gómez',
      email: 'lucas@protraining.com',
      role: 'Atleta',
      phoneNumber: '+54 9 11 2222-3333',
      telegramUsername: 'lucas_prev',
      pfId: 'pf-01',
      mustChangePassword: false,
    },
    updateCurrentUser: mockUpdateCurrentUser,
    logout: vi.fn(),
    themePreference: 'system',
    setThemePreference: vi.fn(),
  }),
}));

vi.mock('../../../api/users', () => ({
  usersService: {
    updateProfile: vi.fn(),
    updateMyTelegram: vi.fn(),
    deactivateAccount: vi.fn(),
    getMyPhotoUrl: vi.fn(() => '/photo.webp'),
    uploadMyPhoto: vi.fn(),
    deleteMyPhoto: vi.fn(),
    updatePfHabitsRecommendations: vi.fn(),
    getPfHabitsRecommendations: vi.fn(),
  },
}));

vi.mock('../../../api/pushNotifications', () => ({
  isPushSupported: () => false,
  isUserSubscribed: vi.fn().mockResolvedValue(false),
  getNotificationPermission: () => 'default',
}));

describe('Autogestión de Telegram del atleta en Configuración (KAN-503)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra Usuario de Telegram editable para atleta manteniendo nombre y teléfono solo lectura', async () => {
    vi.mocked(usersService.updateMyTelegram).mockResolvedValueOnce({
      id: 'ath-user-01',
      email: 'lucas@protraining.com',
      fullName: 'Lucas Gómez',
      phoneNumber: '+54 9 11 2222-3333',
      telegramUsername: 'lucas_nuevo',
    });

    render(
      <MemoryRouter>
        <SettingsView role="athlete" />
      </MemoryRouter>,
    );

    const nameInput = screen.getByLabelText(/Nombre Completo/i) as HTMLInputElement;
    const phoneInput = screen.getByLabelText(/Teléfono de Contacto/i) as HTMLInputElement;
    const tgInput = screen.getByLabelText(/Usuario de Telegram/i) as HTMLInputElement;

    expect(nameInput.readOnly).toBe(true);
    expect(phoneInput.readOnly).toBe(true);
    expect(tgInput.readOnly).toBe(false);
    expect(tgInput.value).toBe('lucas_prev');

    fireEvent.change(tgInput, { target: { value: '@lucas_nuevo' } });
    fireEvent.click(screen.getByRole('button', { name: /Guardar Cambios/i }));

    await waitFor(() => {
      expect(usersService.updateMyTelegram).toHaveBeenCalledWith('@lucas_nuevo');
    });
    expect(usersService.updateProfile).not.toHaveBeenCalled();
    expect(mockUpdateCurrentUser).toHaveBeenCalledWith({
      telegramUsername: 'lucas_nuevo',
    });
  });

  it('valida formato de Telegram antes de enviar y muestra error si falla la sincronización', async () => {
    render(
      <MemoryRouter>
        <SettingsView role="athlete" />
      </MemoryRouter>,
    );

    const tgInput = screen.getByLabelText(/Usuario de Telegram/i) as HTMLInputElement;
    fireEvent.change(tgInput, { target: { value: 'ab' } });
    fireEvent.click(screen.getByRole('button', { name: /Guardar Cambios/i }));

    expect(await screen.findByText(/entre 5 y 32 caracteres/i)).toBeTruthy();
    expect(usersService.updateMyTelegram).not.toHaveBeenCalled();

    vi.mocked(usersService.updateMyTelegram).mockRejectedValueOnce(
      new Error('No se pudo sincronizar el usuario de Telegram con Estructura.'),
    );
    fireEvent.change(tgInput, { target: { value: '@lucas_valido' } });
    fireEvent.click(screen.getByRole('button', { name: /Guardar Cambios/i }));

    expect(
      await screen.findByText(/No se pudo sincronizar el usuario de Telegram con Estructura/i),
    ).toBeTruthy();
    expect(mockUpdateCurrentUser).not.toHaveBeenCalled();
  });
});
