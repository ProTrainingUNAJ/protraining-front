import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';
import { SettingsView } from '../SettingsView';
import { structureService } from '../../../api/structureService';

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'ath-user-01',
      fullName: 'Lucas Gómez',
      email: 'lucas@protraining.com',
      role: 'Atleta',
      phoneNumber: '+54 9 11 2222-3333',
      telegramUsername: 'lucas_atleta',
      pfId: 'pf-01',
      mustChangePassword: false,
    },
    updateCurrentUser: vi.fn(),
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

describe('Autogestión de Perfil Físico del atleta en SettingsView (KAN-479 / KAN-664)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('carga y muestra el peso y objetivo deportivo del atleta desde getMe()', async () => {
    vi.spyOn(structureService, 'getMe').mockResolvedValue({
      athleteId: 'ath-1',
      firstName: 'Lucas',
      lastName: 'Gómez',
      fullName: 'Lucas Gómez',
      active: true,
      categories: [],
      weightKg: 76.5,
      athleticGoal: 'Rendimiento deportivo',
    });

    render(
      <MemoryRouter>
        <SettingsView role="athlete" />
      </MemoryRouter>,
    );

    const weightInput = (await screen.findByTestId('athlete-weight-input')) as HTMLInputElement;
    const goalSelect = (await screen.findByTestId('athlete-goal-select')) as HTMLSelectElement;

    expect(weightInput.value).toBe('76.5');
    expect(goalSelect.value).toBe('Rendimiento deportivo');
  });

  it('permite actualizar el peso y objetivo deportivo mediante updateMyPhysicalProfile', async () => {
    vi.spyOn(structureService, 'getMe').mockResolvedValue({
      athleteId: 'ath-1',
      firstName: 'Lucas',
      lastName: 'Gómez',
      fullName: 'Lucas Gómez',
      active: true,
      categories: [],
      weightKg: 75,
      athleticGoal: 'Objetivo no informado',
    });

    const updateSpy = vi.spyOn(structureService, 'updateMyPhysicalProfile').mockResolvedValue({
      weightKg: 79,
      athleticGoal: 'Ganar masa muscular',
      physicalProfileUpdatedAt: '2026-11-24T12:00:00Z',
    });

    render(
      <MemoryRouter>
        <SettingsView role="athlete" />
      </MemoryRouter>,
    );

    const weightInput = await screen.findByTestId('athlete-weight-input');
    const goalSelect = await screen.findByTestId('athlete-goal-select');
    const saveBtn = screen.getByTestId('save-athlete-physical-btn');

    fireEvent.change(weightInput, { target: { value: '79' } });
    fireEvent.change(goalSelect, { target: { value: 'Ganar masa muscular' } });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith({
        weightKg: 79,
        athleticGoal: 'Ganar masa muscular',
      });
    });

    expect(screen.getByText('Perfil físico actualizado correctamente.')).toBeDefined();
  });
});
