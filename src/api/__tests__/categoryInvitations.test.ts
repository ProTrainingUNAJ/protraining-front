import { describe, it, expect, vi, beforeEach } from 'vitest';
import { categoryInvitationsService, buildInvitationUrl } from '../categoryInvitations';
import * as generatedApi from '../generated/estructura';

vi.mock('../generated/estructura', async () => {
  return {
    generateCategoryInvitationToken: vi.fn(),
    validateCategoryInvitationToken: vi.fn(),
  };
});

describe('categoryInvitationsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('buildInvitationUrl', () => {
    it('construye la URL de invitación con el origen y la ruta /invite/{token}', () => {
      const token = 'test-token-123';
      const expectedOrigin = window.location.origin;
      expect(buildInvitationUrl(token)).toBe(`${expectedOrigin}/invite/${token}`);
    });
  });

  describe('generate', () => {
    it('llama a generateCategoryInvitationToken y arma invitationUrl cuando viene en null', async () => {
      const mockDto = {
        token: 'token-xyz-789',
        expiresAt: '2026-11-07T15:00:00Z',
        categoryId: 'cat-1',
        categoryName: 'Primera División',
        invitationUrl: null,
      };

      vi.mocked(generatedApi.generateCategoryInvitationToken).mockResolvedValueOnce({
        data: mockDto,
      } as never);

      const result = await categoryInvitationsService.generate('cat-1');

      expect(generatedApi.generateCategoryInvitationToken).toHaveBeenCalledWith({
        path: { id: 'cat-1' },
        throwOnError: true,
      });

      expect(result).toEqual({
        token: 'token-xyz-789',
        expiresAt: '2026-11-07T15:00:00Z',
        categoryId: 'cat-1',
        categoryName: 'Primera División',
        invitationUrl: `${window.location.origin}/invite/token-xyz-789`,
      });
    });

    it('conserva invitationUrl si el backend ya devuelve una URL armada', async () => {
      const mockDto = {
        token: 'token-custom',
        expiresAt: '2026-11-07T15:00:00Z',
        categoryId: 'cat-2',
        categoryName: 'Reserva',
        invitationUrl: 'https://protraining.app/invite/token-custom',
      };

      vi.mocked(generatedApi.generateCategoryInvitationToken).mockResolvedValueOnce({
        data: mockDto,
      } as never);

      const result = await categoryInvitationsService.generate('cat-2');

      expect(result.invitationUrl).toBe('https://protraining.app/invite/token-custom');
    });

    it('lanza un error con el mensaje extraído si la API falla', async () => {
      vi.mocked(generatedApi.generateCategoryInvitationToken).mockRejectedValueOnce(
        new Error('No se pudo generar la invitación'),
      );

      await expect(categoryInvitationsService.generate('cat-error')).rejects.toThrow(
        'No se pudo generar la invitación',
      );
    });
  });

  describe('validate', () => {
    it('llama a validateCategoryInvitationToken y retorna los datos de la categoría', async () => {
      const mockDto = {
        token: 'valid-token',
        expiresAt: '2026-11-07T15:00:00Z',
        categoryId: 'cat-1',
        categoryName: 'Primera División',
        invitationUrl: null,
      };

      vi.mocked(generatedApi.validateCategoryInvitationToken).mockResolvedValueOnce({
        data: mockDto,
      } as never);

      const result = await categoryInvitationsService.validate('valid-token');

      expect(generatedApi.validateCategoryInvitationToken).toHaveBeenCalledWith({
        path: { token: 'valid-token' },
        throwOnError: true,
      });

      expect(result.token).toBe('valid-token');
      expect(result.categoryName).toBe('Primera División');
      expect(result.invitationUrl).toBe(`${window.location.origin}/invite/valid-token`);
    });

    it('propaga error al validar token vencido o inexistente', async () => {
      vi.mocked(generatedApi.validateCategoryInvitationToken).mockRejectedValueOnce(
        new Error('Invitación caducada.'),
      );

      await expect(categoryInvitationsService.validate('expired-token')).rejects.toThrow(
        'Invitación caducada.',
      );
    });
  });
});
