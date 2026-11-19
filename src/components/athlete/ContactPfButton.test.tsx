import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ContactPfButton } from './ContactPfButton';

const mockGetPfContact = vi.fn();

vi.mock('../../api/users', () => ({
  usersService: {
    getPfContact: () => mockGetPfContact(),
    getPfPhotoUrl: () => undefined,
  },
}));

vi.mock('../../api/axiosClient', () => ({
  getStoredSession: () => ({
    user: { id: 'u1', fullName: 'Lucas Fernández', pfId: 'pf1' },
  }),
}));

describe('ContactPfButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('no se renderiza si el PF no tiene canales cargados', async () => {
    mockGetPfContact.mockResolvedValue(null);
    const { container } = render(<ContactPfButton />);
    await waitFor(() => {
      expect(mockGetPfContact).toHaveBeenCalled();
    });
    expect(container.innerHTML).toBe('');
  });

  it('renderiza enlace directo de WhatsApp cuando solo tiene teléfono', async () => {
    mockGetPfContact.mockResolvedValue({ phoneNumber: '5491123456789', telegramUsername: null });
    render(<ContactPfButton />);

    const link = await screen.findByRole('link', { name: /Contactar a mi preparador/i });
    expect(link.getAttribute('href')).toContain('https://wa.me/5491123456789?text=');
  });

  it('renderiza enlace directo de Telegram y copia el mensaje al hacer clic', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    mockGetPfContact.mockResolvedValue({ phoneNumber: null, telegramUsername: 'profe_juan' });

    render(<ContactPfButton />);

    const link = await screen.findByRole('link', {
      name: /Contactar a mi preparador por Telegram/i,
    });
    expect(link.getAttribute('href')).toBe('https://t.me/profe_juan');

    fireEvent.click(link);
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(expect.stringContaining('Lucas Fernández'));
    });
    expect(
      await screen.findByText(/Mensaje copiado al portapapeles para pegar en Telegram/i),
    ).toBeTruthy();
  });

  it('muestra fallback manual si falla el portapapeles al hacer clic en Telegram', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('Clipboard denied'));
    Object.assign(navigator, { clipboard: { writeText } });
    mockGetPfContact.mockResolvedValue({ phoneNumber: null, telegramUsername: 'profe_juan' });

    render(<ContactPfButton />);

    const link = await screen.findByRole('link', {
      name: /Contactar a mi preparador por Telegram/i,
    });
    fireEvent.click(link);

    expect(await screen.findByText(/Copiá este mensaje manualmente para Telegram/i)).toBeTruthy();
    expect(screen.queryByText(/Mensaje copiado al portapapeles/i)).toBeNull();
  });

  it('muestra selector de WhatsApp y Telegram cuando ambos canales están disponibles', async () => {
    mockGetPfContact.mockResolvedValue({
      phoneNumber: '5491123456789',
      telegramUsername: 'profe_juan',
    });

    render(<ContactPfButton />);

    const trigger = await screen.findByRole('button', { name: /Contactar a mi preparador/i });
    fireEvent.click(trigger);

    expect(screen.getByRole('menuitem', { name: /WhatsApp/i }).getAttribute('href')).toContain(
      'https://wa.me/5491123456789',
    );
    expect(screen.getByRole('menuitem', { name: /Telegram/i }).getAttribute('href')).toBe(
      'https://t.me/profe_juan',
    );
  });
});
