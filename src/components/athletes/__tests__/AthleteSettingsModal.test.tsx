import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { AthleteSettingsModal } from '../AthleteSettingsModal';
import { structureService } from '../../../api/structureService';
import { Athlete } from '../../../types/structure';

vi.mock('../../common/PhotoUploadControl', () => ({
  PhotoUploadControl: () => <div data-testid="photo-upload-mock" />,
}));

describe('AthleteSettingsModal - Perfil Físico (KAN-479 / KAN-664)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockAthlete: Athlete = {
    id: 'ath-1',
    accountId: 'acc-1',
    firstName: 'Lucas',
    lastName: 'Gómez',
    fullName: 'Lucas Gómez',
    email: 'lucas@protraining.com',
    phone: '1150000001',
    weightKg: 75.5,
    athleticGoal: 'Rendimiento deportivo',
  };

  it('renderiza los campos de peso y objetivo deportivo con los valores actuales', () => {
    render(
      <AthleteSettingsModal athlete={mockAthlete} onAthleteUpdated={vi.fn()} onClose={vi.fn()} />,
    );

    const weightInput = screen.getByTestId('athlete-weight-input') as HTMLInputElement;
    const goalSelect = screen.getByTestId('athlete-goal-select') as HTMLSelectElement;

    expect(weightInput.value).toBe('75.5');
    expect(goalSelect.value).toBe('Rendimiento deportivo');
  });

  it('permite actualizar el peso y objetivo deportivo llamando a structureService', async () => {
    const onUpdated = vi.fn();
    const updateSpy = vi.spyOn(structureService, 'updateAthletePhysicalProfile').mockResolvedValue({
      ...mockAthlete,
      weightKg: 78,
      athleticGoal: 'Ganar masa muscular',
      physicalProfileUpdatedAt: '2026-11-24T12:00:00Z',
    });

    render(
      <AthleteSettingsModal athlete={mockAthlete} onAthleteUpdated={onUpdated} onClose={vi.fn()} />,
    );

    const weightInput = screen.getByTestId('athlete-weight-input');
    const goalSelect = screen.getByTestId('athlete-goal-select');
    const saveBtn = screen.getByTestId('save-physical-profile-btn');

    fireEvent.change(weightInput, { target: { value: '78' } });
    fireEvent.change(goalSelect, { target: { value: 'Ganar masa muscular' } });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith('ath-1', {
        weightKg: 78,
        heightCm: null,
        athleticGoal: 'Ganar masa muscular',
      });
    });

    expect(onUpdated).toHaveBeenCalledWith(
      expect.objectContaining({
        weightKg: 78,
        athleticGoal: 'Ganar masa muscular',
      }),
    );
    expect(screen.getByText('Perfil físico actualizado correctamente.')).toBeDefined();
  });

  it('permite actualizar la estatura llamando a structureService (KAN-664)', async () => {
    const onUpdated = vi.fn();
    const updateSpy = vi.spyOn(structureService, 'updateAthletePhysicalProfile').mockResolvedValue({
      ...mockAthlete,
      weightKg: 78,
      heightCm: 182,
      athleticGoal: 'Rendimiento deportivo',
      physicalProfileUpdatedAt: '2026-11-24T12:00:00Z',
    });

    render(
      <AthleteSettingsModal
        athlete={{ ...mockAthlete, weightKg: 78, heightCm: 180 }}
        onAthleteUpdated={onUpdated}
        onClose={vi.fn()}
      />,
    );

    const heightInput = screen.getByTestId('athlete-height-input') as HTMLInputElement;
    expect(heightInput.value).toBe('180');

    fireEvent.change(heightInput, { target: { value: '182' } });
    const saveBtn = screen.getByTestId('save-physical-profile-btn');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith('ath-1', {
        weightKg: 78,
        heightCm: 182,
        athleticGoal: 'Rendimiento deportivo',
      });
    });

    expect(onUpdated).toHaveBeenCalledWith(
      expect.objectContaining({
        heightCm: 182,
      }),
    );
  });

  it('valida que el peso sea un número positivo razonable', async () => {
    const updateSpy = vi.spyOn(structureService, 'updateAthletePhysicalProfile');

    render(
      <AthleteSettingsModal athlete={mockAthlete} onAthleteUpdated={vi.fn()} onClose={vi.fn()} />,
    );

    const weightInput = screen.getByTestId('athlete-weight-input');
    const saveBtn = screen.getByTestId('save-physical-profile-btn');

    fireEvent.change(weightInput, { target: { value: '-10' } });
    fireEvent.submit(saveBtn.closest('form')!);

    await waitFor(() => {
      expect(
        screen.getByText('Ingresá un peso válido en kilogramos (entre 30 y 300 kg).'),
      ).toBeDefined();
    });
    expect(updateSpy).not.toHaveBeenCalled();
  });
});
