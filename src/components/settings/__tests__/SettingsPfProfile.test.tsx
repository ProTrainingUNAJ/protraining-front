import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SettingsView } from '../SettingsView';
import { usersService } from '../../../api/users';

const mockUpdateCurrentUser = vi.fn();
const mockLogout = vi.fn();

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'pf-01',
      fullName: 'Profe Inicial',
      email: 'profe@protraining.com',
      role: 'PreparadorFisico',
      phoneNumber: '+54 9 11 1111-2222',
      pfId: null,
      mustChangePassword: false,
    },
    updateCurrentUser: mockUpdateCurrentUser,
    logout: mockLogout,
    themePreference: 'system',
    setThemePreference: vi.fn(),
  }),
}));

vi.mock('../../../api/users', () => ({
  usersService: {
    updateProfile: vi.fn(),
    deactivateAccount: vi.fn(),
    getMyPhotoUrl: vi.fn(() => '/photo.webp'),
    uploadMyPhoto: vi.fn(),
    deleteMyPhoto: vi.fn(),
    updatePfHabitsRecommendations: vi.fn().mockResolvedValue({ enabled: true }),
    getPfHabitsRecommendations: vi.fn().mockResolvedValue({ enabled: true }),
  },
}));

vi.mock('../../../api/pushNotifications', () => ({
  isPushSupported: () => false,
  isUserSubscribed: vi.fn().mockResolvedValue(false),
  getNotificationPermission: () => 'default',
}));

describe('Perfil y baja del PF en Configuración (KAN-601 / KAN-602)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('permite editar nombre y teléfono y guarda los cambios llamando a updateProfile', async () => {
    vi.mocked(usersService.updateProfile).mockResolvedValueOnce({
      id: 'pf-01',
      email: 'profe@protraining.com',
      fullName: 'Profe Actualizado',
      phoneNumber: '5491199887766',
    });

    render(
      <MemoryRouter>
        <SettingsView role="pf" />
      </MemoryRouter>,
    );

    const nameInput = screen.getByLabelText(/Nombre Completo/i);
    expect(nameInput).toBeDefined();
    expect((nameInput as HTMLInputElement).readOnly).toBe(false);

    fireEvent.change(nameInput, { target: { value: 'Profe Actualizado' } });

    const phoneInput = screen.getByLabelText(/WhatsApp/i);
    fireEvent.change(phoneInput, { target: { value: '+54 9 11 9988-7766' } });

    const saveBtn = screen.getByRole('button', { name: /Guardar Cambios/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(usersService.updateProfile).toHaveBeenCalledWith({
        fullName: 'Profe Actualizado',
        phone: '+54 9 11 9988-7766',
        telegramUsername: '',
      });
    });

    expect(mockUpdateCurrentUser).toHaveBeenCalledWith({
      fullName: 'Profe Actualizado',
      phoneNumber: '5491199887766',
      telegramUsername: undefined,
    });
  });

  it('valida y guarda el username de Telegram del PF', async () => {
    vi.mocked(usersService.updateProfile).mockResolvedValueOnce({
      id: 'pf-1',
      email: 'profe@test.com',
      fullName: 'Profe Test',
      phoneNumber: '5491122334455',
      telegramUsername: 'profe_telegram',
    });

    render(
      <MemoryRouter>
        <SettingsView role="pf" />
      </MemoryRouter>,
    );

    const tgInput = screen.getByLabelText(/Telegram \(opcional\)/i);
    fireEvent.change(tgInput, { target: { value: 'ab' } });
    fireEvent.click(screen.getByRole('button', { name: /Guardar Cambios/i }));

    expect(await screen.findByText(/entre 5 y 32 caracteres/i)).toBeDefined();
    expect(usersService.updateProfile).not.toHaveBeenCalled();

    fireEvent.change(tgInput, { target: { value: '@profe_telegram' } });
    fireEvent.click(screen.getByRole('button', { name: /Guardar Cambios/i }));

    await waitFor(() => {
      expect(usersService.updateProfile).toHaveBeenCalledWith({
        fullName: 'Profe Inicial',
        phone: '+54 9 11 1111-2222',
        telegramUsername: '@profe_telegram',
      });
    });

    expect(mockUpdateCurrentUser).toHaveBeenCalledWith({
      fullName: 'Profe Test',
      phoneNumber: '5491122334455',
      telegramUsername: 'profe_telegram',
    });
  });

  it('muestra la Zona de Peligro y solicita contraseña en un modal para confirmar desactivación', async () => {
    vi.mocked(usersService.deactivateAccount).mockResolvedValueOnce();

    render(
      <MemoryRouter>
        <SettingsView role="pf" />
      </MemoryRouter>,
    );

    expect(screen.getByText('Zona de Peligro')).toBeDefined();
    const openModalBtn = screen.getByRole('button', { name: /Desactivar mi cuenta/i });
    fireEvent.click(openModalBtn);

    expect(screen.getByText('¿Desactivar tu cuenta?')).toBeDefined();
    expect(screen.getByLabelText(/Confirmá con tu contraseña actual/i)).toBeDefined();

    const passwordInput = screen.getByPlaceholderText('Tu contraseña');
    fireEvent.change(passwordInput, { target: { value: 'Secret123!' } });

    const confirmBtn = screen.getByRole('button', { name: /Confirmar Desactivación/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(usersService.deactivateAccount).toHaveBeenCalledWith('Secret123!');
    });

    expect(mockLogout).toHaveBeenCalled();
  });
});
