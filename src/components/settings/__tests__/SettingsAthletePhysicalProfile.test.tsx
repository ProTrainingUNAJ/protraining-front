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
        heightCm: null,
        athleticGoal: 'Ganar masa muscular',
      });
    });

    expect(screen.getByText('Perfil físico actualizado correctamente.')).toBeDefined();
  });

  it('permite cargar y actualizar la estatura en centímetros (KAN-664)', async () => {
    vi.spyOn(structureService, 'getMe').mockResolvedValue({
      athleteId: 'ath-1',
      firstName: 'Lucas',
      lastName: 'Gómez',
      fullName: 'Lucas Gómez',
      active: true,
      categories: [],
      weightKg: 78,
      heightCm: 178,
      athleticGoal: 'Rendimiento deportivo',
    });

    const updateSpy = vi.spyOn(structureService, 'updateMyPhysicalProfile').mockResolvedValue({
      weightKg: 78,
      heightCm: 180,
      athleticGoal: 'Rendimiento deportivo',
      physicalProfileUpdatedAt: '2026-11-24T12:00:00Z',
    });

    render(
      <MemoryRouter>
        <SettingsView role="athlete" />
      </MemoryRouter>,
    );

    const heightInput = (await screen.findByTestId('athlete-height-input')) as HTMLInputElement;
    expect(heightInput.value).toBe('178');

    fireEvent.change(heightInput, { target: { value: '180' } });
    const saveBtn = screen.getByTestId('save-athlete-physical-btn');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith({
        weightKg: 78,
        heightCm: 180,
        athleticGoal: 'Rendimiento deportivo',
      });
    });

    expect(screen.getByText('Perfil físico actualizado correctamente.')).toBeDefined();
  });

  it('permite cargar y actualizar fecha de nacimiento y género (KAN-660)', async () => {
    vi.spyOn(structureService, 'getMe').mockResolvedValue({
      athleteId: 'ath-1',
      firstName: 'Lucas',
      lastName: 'Gómez',
      fullName: 'Lucas Gómez',
      active: true,
      categories: [],
      weightKg: 78,
      athleticGoal: 'Rendimiento deportivo',
      birthDate: '2001-08-20',
      gender: 'Masculino',
    });

    const updateSpy = vi.spyOn(structureService, 'updateMyPhysicalProfile').mockResolvedValue({
      weightKg: 78,
      athleticGoal: 'Rendimiento deportivo',
      birthDate: '2000-05-15',
      gender: 'Femenino',
      physicalProfileUpdatedAt: '2026-11-24T12:00:00Z',
    });

    render(
      <MemoryRouter>
        <SettingsView role="athlete" />
      </MemoryRouter>,
    );

    const birthDateInput = (await screen.findByTestId(
      'athlete-birthdate-input',
    )) as HTMLInputElement;
    const genderSelect = (await screen.findByTestId('athlete-gender-select')) as HTMLSelectElement;
    const saveBtn = screen.getByTestId('save-athlete-physical-btn');

    expect(birthDateInput.value).toBe('2001-08-20');
    expect(genderSelect.value).toBe('Masculino');

    fireEvent.change(birthDateInput, { target: { value: '2000-05-15' } });
    fireEvent.change(genderSelect, { target: { value: 'Femenino' } });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith({
        weightKg: 78,
        heightCm: null,
        athleticGoal: 'Rendimiento deportivo',
        birthDate: '2000-05-15',
        gender: 'Femenino',
      });
    });

    expect(screen.getByText('Perfil físico actualizado correctamente.')).toBeDefined();
  });

  it('no muestra éxito falso en "Guardar Cambios" si el backend no confirma la estatura', async () => {
    vi.spyOn(structureService, 'getMe').mockResolvedValue({
      athleteId: 'ath-1',
      firstName: 'Lucas',
      lastName: 'Gómez',
      fullName: 'Lucas Gómez',
      active: true,
      categories: [],
      weightKg: 76,
      athleticGoal: 'Rendimiento deportivo',
    });

    const { usersService } = await import('../../../api/users');
    vi.mocked(usersService.updateMyTelegram).mockResolvedValue({ telegramUsername: null } as never);
    // Simula un backend desactualizado que devuelve 200 sin campo heightCm
    vi.spyOn(structureService, 'updateMyPhysicalProfile').mockResolvedValue({
      weightKg: 76,
      athleticGoal: 'Rendimiento deportivo',
    });

    render(
      <MemoryRouter>
        <SettingsView role="athlete" />
      </MemoryRouter>,
    );

    const heightInput = await screen.findByTestId('athlete-height-input');
    fireEvent.change(heightInput, { target: { value: '179' } });

    const headerSaveBtn = screen.getByRole('button', { name: /Guardar Cambios/i });
    fireEvent.click(headerSaveBtn);

    await waitFor(() => {
      expect(
        screen.getAllByText(/El servidor no confirmó la actualización de la estatura/i).length,
      ).toBeGreaterThan(0);
    });
    expect(screen.queryByText(/Cambios guardados/i)).toBeNull();
  });
});
