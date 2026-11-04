import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { CategoryInvitationModal } from '../CategoryInvitationModal';
import { categoryInvitationsService } from '../../../api/categoryInvitations';

vi.mock('../../../api/categoryInvitations', () => {
  const generate = vi.fn();
  const getOrGenerate = vi.fn((id: string, opts?: { forceRefresh?: boolean }) => {
    return generate(id, opts);
  });
  return {
    categoryInvitationsService: {
      generate,
      getOrGenerate,
      clearCached: vi.fn(),
    },
  };
});

describe('CategoryInvitationModal (KAN-400)', () => {
  const defaultProps = {
    categoryId: 'cat-123',
    categoryName: 'Primera División',
    onClose: vi.fn(),
  };

  const mockInvitation = {
    token: 'token-456',
    expiresAt: '2026-11-07T15:00:00.000Z',
    categoryId: 'cat-123',
    categoryName: 'Primera División',
    invitationUrl: 'http://localhost:5173/invite/token-456',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra estado de carga inicial mientras se obtiene o genera la invitación', () => {
    vi.mocked(categoryInvitationsService.getOrGenerate).mockReturnValue(new Promise(() => {}));

    render(<CategoryInvitationModal {...defaultProps} />);

    expect(screen.getByText('Generando código QR y enlace seguro...')).toBeDefined();
  });

  it('reutiliza o genera la invitación y renderiza el QR, vencimiento en hora Argentina y enlace copiable', async () => {
    vi.mocked(categoryInvitationsService.getOrGenerate).mockResolvedValueOnce(mockInvitation);

    render(<CategoryInvitationModal {...defaultProps} />);

    // Verifica que se haya llamado a getOrGenerate con forceRefresh false
    expect(categoryInvitationsService.getOrGenerate).toHaveBeenCalledWith('cat-123', {
      forceRefresh: false,
    });

    // Espera a que termine la carga
    await waitFor(() => {
      expect(screen.getByText('Invitar Atletas')).toBeDefined();
    });

    // Muestra nombre de categoría
    expect(screen.getByText('Primera División')).toBeDefined();

    // Muestra código QR en SVG
    const qrSvg = screen.getByLabelText('Código QR para unirse a la categoría Primera División');
    expect(qrSvg).toBeDefined();

    // Muestra fecha de vencimiento en hora Argentina (15:00 UTC = 12:00 AR)
    expect(screen.getByText(/Vence el 07\/11\/2026 a las 12:00 hs/)).toBeDefined();

    // Muestra el input de solo lectura con la URL
    const input = screen.getByLabelText('URL de invitación a la categoría') as HTMLInputElement;
    expect(input.value).toBe('http://localhost:5173/invite/token-456');
    expect(input.hasAttribute('readonly')).toBe(true);

    // Muestra el botón de copiar
    expect(screen.getByRole('button', { name: /Copiar enlace/i })).toBeDefined();

    // Muestra la opción de generar un nuevo enlace
    expect(
      screen.getByRole('button', { name: /Generar un nuevo enlace de invitación/i }),
    ).toBeDefined();
  });

  it('permite al usuario solicitar un nuevo enlace mediante el botón "Generar un nuevo enlace"', async () => {
    const regeneratedInvitation = {
      ...mockInvitation,
      token: 'token-nuevo-789',
      invitationUrl: 'http://localhost:5173/invite/token-nuevo-789',
    };

    vi.mocked(categoryInvitationsService.getOrGenerate)
      .mockResolvedValueOnce(mockInvitation)
      .mockResolvedValueOnce(regeneratedInvitation);

    render(<CategoryInvitationModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Copiar enlace/i })).toBeDefined();
    });

    const regenerateBtn = screen.getByRole('button', {
      name: /Generar un nuevo enlace de invitación/i,
    });
    fireEvent.click(regenerateBtn);

    await waitFor(() => {
      const input = screen.getByLabelText('URL de invitación a la categoría') as HTMLInputElement;
      expect(input.value).toBe('http://localhost:5173/invite/token-nuevo-789');
    });

    expect(categoryInvitationsService.getOrGenerate).toHaveBeenLastCalledWith('cat-123', {
      forceRefresh: true,
    });
  });

  it('copia el enlace al portapapeles y conmuta el botón a "¡Copiado!"', async () => {
    vi.mocked(categoryInvitationsService.getOrGenerate).mockResolvedValueOnce(mockInvitation);

    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(<CategoryInvitationModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Copiar enlace/i })).toBeDefined();
    });

    const copyBtn = screen.getByRole('button', { name: /Copiar enlace/i });
    fireEvent.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalledWith('http://localhost:5173/invite/token-456');

    await waitFor(() => {
      expect(screen.getByText('¡Copiado!')).toBeDefined();
    });
  });

  it('muestra mensaje de error y permite reintentar si la obtención/generación falla', async () => {
    vi.mocked(categoryInvitationsService.getOrGenerate)
      .mockRejectedValueOnce(new Error('Error de conexión con el servicio.'))
      .mockResolvedValueOnce(mockInvitation);

    render(<CategoryInvitationModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Error de conexión con el servicio.')).toBeDefined();
    });

    const retryBtn = screen.getByRole('button', { name: /Reintentar generación/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText(/Vence el 07\/11\/2026 a las 12:00 hs/)).toBeDefined();
    });

    expect(categoryInvitationsService.getOrGenerate).toHaveBeenLastCalledWith('cat-123', {
      forceRefresh: true,
    });
  });

  it('cierra el modal al hacer clic en el botón de cerrar (X) o en "Cerrar"', async () => {
    vi.mocked(categoryInvitationsService.getOrGenerate).mockResolvedValueOnce(mockInvitation);

    render(<CategoryInvitationModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Invitar Atletas')).toBeDefined();
    });

    const closeIconBtn = screen.getByLabelText('Cerrar modal de invitación');
    fireEvent.click(closeIconBtn);
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);

    const footerCloseBtn = screen.getByRole('button', { name: 'Cerrar' });
    fireEvent.click(footerCloseBtn);
    expect(defaultProps.onClose).toHaveBeenCalledTimes(2);
  });

  it('cierra el modal al presionar la tecla Escape', async () => {
    vi.mocked(categoryInvitationsService.getOrGenerate).mockResolvedValueOnce(mockInvitation);

    render(<CategoryInvitationModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Invitar Atletas')).toBeDefined();
    });

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('cierra el modal al hacer clic en el overlay de fondo', async () => {
    vi.mocked(categoryInvitationsService.getOrGenerate).mockResolvedValueOnce(mockInvitation);

    render(<CategoryInvitationModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('invitation-modal-overlay')).toBeDefined();
    });

    const overlay = screen.getByTestId('invitation-modal-overlay');
    fireEvent.click(overlay);
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });
});
