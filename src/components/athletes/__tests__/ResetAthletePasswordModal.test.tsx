import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ResetAthletePasswordModal } from '../ResetAthletePasswordModal';
import { authService } from '../../../api/authService';
import { Athlete } from '../../../types/structure';

vi.mock('../../../api/authService', () => ({
  authService: {
    resetAthletePassword: vi.fn(),
  },
}));

describe('ResetAthletePasswordModal (KAN-539 / F-01 a F-06)', () => {
  const mockAthlete: Athlete = {
    id: 'athlete-123',
    firstName: 'Mateo',
    lastName: 'Gómez',
    fullName: 'Mateo Gómez',
    email: 'mateo.gomez@protraining.com',
    phone: '1123456789',
    categories: [],
  };

  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('F-02: muestra modal de confirmación con advertencia antes de ejecutar el reseteo', () => {
    render(<ResetAthletePasswordModal athlete={mockAthlete} onClose={mockOnClose} />);

    expect(screen.getByText('Resetear contraseña')).toBeDefined();
    expect(
      screen.getByText(/¿Estás seguro de que querés restablecer la contraseña de/i),
    ).toBeDefined();
    expect(screen.getByText('Mateo Gómez')).toBeDefined();
    expect(screen.getByText('Confirmar reseteo')).toBeDefined();
    expect(screen.getByText('Cancelar')).toBeDefined();
  });

  it('cancela el reseteo al hacer clic en Cancelar', () => {
    render(<ResetAthletePasswordModal athlete={mockAthlete} onClose={mockOnClose} />);

    fireEvent.click(screen.getByText('Cancelar'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(authService.resetAthletePassword).not.toHaveBeenCalled();
  });

  it('F-03 y F-04: al confirmar, invoca authService y muestra la clave temporal generada con advertencia y opción de copiado', async () => {
    vi.mocked(authService.resetAthletePassword).mockResolvedValueOnce({
      athleteId: mockAthlete.id,
      temporaryPassword: 'TempPassword#2026',
      mustChangePassword: true,
    });

    // Mock de clipboard
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(<ResetAthletePasswordModal athlete={mockAthlete} onClose={mockOnClose} />);

    // Click en confirmar
    fireEvent.click(screen.getByTestId('confirm-reset-btn'));

    await waitFor(() => {
      expect(authService.resetAthletePassword).toHaveBeenCalledWith(mockAthlete.id);
      expect(screen.getByTestId('temporary-password-display')).toBeDefined();
    });

    // F-03: Clave temporal visible y advertencia clara
    expect(screen.getByTestId('temporary-password-display').textContent).toBe('TempPassword#2026');
    expect(screen.getByText(/solo se mostrará esta única vez/i)).toBeDefined();

    // F-04: Copiar contraseña
    const copyBtn = screen.getByTestId('copy-password-btn');
    fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith('TempPassword#2026');
      expect(screen.getByText('¡Copiada!')).toBeDefined();
    });

    // F-05: Cierre del modal
    const closeBtn = screen.getByTestId('close-reset-modal-btn');
    fireEvent.click(closeBtn);
    expect(mockOnClose).toHaveBeenCalledTimes(1);

    // Verificar que nunca se almacenó en localStorage ni sessionStorage
    expect(localStorage.getItem('temporaryPassword')).toBeNull();
    expect(sessionStorage.getItem('temporaryPassword')).toBeNull();
  });

  it('F-06: ante error HTTP de la API, muestra mensaje en español claro', async () => {
    vi.mocked(authService.resetAthletePassword).mockRejectedValueOnce(
      new Error('Atleta no encontrado.'),
    );

    render(<ResetAthletePasswordModal athlete={mockAthlete} onClose={mockOnClose} />);

    fireEvent.click(screen.getByTestId('confirm-reset-btn'));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
      expect(screen.getByText('Atleta no encontrado.')).toBeDefined();
    });

    // Permite reintentar
    expect(screen.getByTestId('confirm-reset-btn')).toBeDefined();
  });
});
