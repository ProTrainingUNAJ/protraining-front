import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ContactPfButton } from '../ContactPfButton';
import { usersService } from '../../../api/users';

vi.mock('../../../api/users', () => ({
  usersService: {
    getPfContact: vi.fn(),
  },
}));

describe('ContactPfButton (KAN-562)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('no muestra el botón si el PF no tiene número cargado (retorna null)', async () => {
    vi.mocked(usersService.getPfContact).mockResolvedValue(null);

    const { container } = render(<ContactPfButton />);

    // Espera a que termine la llamada al servicio
    await waitFor(() => {
      expect(usersService.getPfContact).toHaveBeenCalledTimes(1);
    });

    // Criterio de aceptación: el botón no aparece en la pantalla
    expect(container.firstChild).toBeNull();
    expect(screen.queryByRole('link', { name: /contactar a mi preparador/i })).toBeNull();
  });

  it('no muestra el botón si la llamada a la API falla con error', async () => {
    vi.mocked(usersService.getPfContact).mockRejectedValue(new Error('Network error'));

    const { container } = render(<ContactPfButton />);

    await waitFor(() => {
      expect(usersService.getPfContact).toHaveBeenCalledTimes(1);
    });

    expect(container.firstChild).toBeNull();
  });

  it('muestra el botón con el enlace wa.me cuando el PF tiene número cargado', async () => {
    vi.mocked(usersService.getPfContact).mockResolvedValue({
      phoneNumber: '5491123456789',
    });

    render(<ContactPfButton initialText="Hola profe" />);

    const button = await screen.findByRole('link', {
      name: /contactar a mi preparador/i,
    });

    expect(button).toBeDefined();
    expect(button.getAttribute('href')).toBe('https://wa.me/5491123456789?text=Hola%20profe');
    expect(button.getAttribute('target')).toBe('_blank');
    expect(button.getAttribute('rel')).toBe('noopener noreferrer');
  });
});
