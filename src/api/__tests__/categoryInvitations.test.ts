import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  categoryInvitationsService,
  buildInvitationUrl,
  getCachedInvitation,
  storeCachedInvitation,
  clearCachedInvitation,
  getHttpErrorStatus,
} from '../categoryInvitations';
import * as generatedApi from '../generated/estructura';

vi.mock('../generated/estructura', async () => {
  return {
    generateCategoryInvitationToken: vi.fn(),
    validateCategoryInvitationToken: vi.fn(),
    acceptCategoryInvitation: vi.fn(),
  };
});

describe('categoryInvitationsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  describe('buildInvitationUrl', () => {
    it('construye la URL de invitación con el origen y la ruta /invite/{token}', () => {
      const token = 'test-token-123';
      const expectedOrigin = window.location.origin;
      expect(buildInvitationUrl(token)).toBe(`${expectedOrigin}/invite/${token}`);
    });
  });

  describe('cache helpers', () => {
    it('almacena y recupera una invitación vigente de localStorage', () => {
      const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
      const invitation = {
        token: 'cached-token-1',
        expiresAt: futureDate,
        categoryId: 'cat-cache-1',
        categoryName: 'Primera',
        invitationUrl: 'http://localhost/invite/cached-token-1',
      };

      storeCachedInvitation(invitation);
      const retrieved = getCachedInvitation('cat-cache-1');

      expect(retrieved).toEqual(invitation);
    });

    it('retorna null y limpia el storage si la invitación almacenada ya expiró', () => {
      const pastDate = new Date(Date.now() - 60 * 1000).toISOString();
      const expiredInvitation = {
        token: 'expired-token',
        expiresAt: pastDate,
        categoryId: 'cat-expired',
        categoryName: 'Reserva',
        invitationUrl: 'http://localhost/invite/expired-token',
      };

      storeCachedInvitation(expiredInvitation);
      const retrieved = getCachedInvitation('cat-expired');

      expect(retrieved).toBeNull();
      expect(getCachedInvitation('cat-expired')).toBeNull();
    });

    it('permite limpiar explícitamente la invitación de una categoría', () => {
      const futureDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
      storeCachedInvitation({
        token: 'to-clear',
        expiresAt: futureDate,
        categoryId: 'cat-clear',
        categoryName: 'Sub-20',
        invitationUrl: 'http://localhost/invite/to-clear',
      });

      clearCachedInvitation('cat-clear');
      expect(getCachedInvitation('cat-clear')).toBeNull();
    });
  });

  describe('getOrGenerate', () => {
    it('reutiliza el token vigente almacenado sin llamar a generateCategoryInvitationToken', async () => {
      const futureDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
      const cached = {
        token: 'token-existente',
        expiresAt: futureDate,
        categoryId: 'cat-reuse',
        categoryName: 'Primera',
        invitationUrl: 'http://localhost/invite/token-existente',
      };
      storeCachedInvitation(cached);

      const result = await categoryInvitationsService.getOrGenerate('cat-reuse');

      expect(result).toEqual(cached);
      expect(generatedApi.generateCategoryInvitationToken).not.toHaveBeenCalled();
    });

    it('genera un token nuevo si no hay ninguno en storage', async () => {
      const mockDto = {
        token: 'token-nuevo',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        categoryId: 'cat-fresh',
        categoryName: 'Juveniles',
        invitationUrl: null,
      };

      vi.mocked(generatedApi.generateCategoryInvitationToken).mockResolvedValueOnce({
        data: mockDto,
      } as never);

      const result = await categoryInvitationsService.getOrGenerate('cat-fresh');

      expect(generatedApi.generateCategoryInvitationToken).toHaveBeenCalledTimes(1);
      expect(result.token).toBe('token-nuevo');

      // Comprueba que además quedó almacenado en cache
      const stored = getCachedInvitation('cat-fresh');
      expect(stored?.token).toBe('token-nuevo');
    });

    it('fuerza la generación de un nuevo token si forceRefresh es true', async () => {
      const oldFutureDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
      storeCachedInvitation({
        token: 'token-viejo-aun-valido',
        expiresAt: oldFutureDate,
        categoryId: 'cat-refresh',
        categoryName: 'Primera',
        invitationUrl: 'http://localhost/invite/token-viejo-aun-valido',
      });

      const newFutureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      vi.mocked(generatedApi.generateCategoryInvitationToken).mockResolvedValueOnce({
        data: {
          token: 'token-regenerado',
          expiresAt: newFutureDate,
          categoryId: 'cat-refresh',
          categoryName: 'Primera',
          invitationUrl: null,
        },
      } as never);

      const result = await categoryInvitationsService.getOrGenerate('cat-refresh', {
        forceRefresh: true,
      });

      expect(generatedApi.generateCategoryInvitationToken).toHaveBeenCalledTimes(1);
      expect(result.token).toBe('token-regenerado');
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

  describe('accept', () => {
    it('llama a acceptCategoryInvitation y retorna los datos del atleta creado', async () => {
      const mockAthlete = {
        id: 'ath-123',
        firstName: 'Mateo',
        lastName: 'Fernández',
        email: 'mateo@ejemplo.com',
      };

      vi.mocked(generatedApi.acceptCategoryInvitation).mockResolvedValueOnce({
        data: mockAthlete,
      } as never);

      const payload = {
        firstName: 'Mateo',
        lastName: 'Fernández',
        email: 'mateo@ejemplo.com',
        phone: '+5491112345678',
        birthDate: '2005-05-15',
      };

      const result = await categoryInvitationsService.accept('tok-abc', payload);

      expect(generatedApi.acceptCategoryInvitation).toHaveBeenCalledWith({
        path: { token: 'tok-abc' },
        body: payload,
        throwOnError: true,
      });

      expect(result).toEqual(mockAthlete);
    });

    it('propaga error cuando falla la aceptación', async () => {
      vi.mocked(generatedApi.acceptCategoryInvitation).mockRejectedValueOnce(
        new Error('Debe proporcionar tutor.'),
      );

      await expect(
        categoryInvitationsService.accept('tok-abc', {
          firstName: 'Mateo',
          lastName: 'Fernández',
          phone: '+5491112345678',
          birthDate: '2010-05-15',
        }),
      ).rejects.toThrow('Debe proporcionar tutor.');
    });
  });

  describe('getHttpErrorStatus', () => {
    it('obtiene el status de un AxiosError', () => {
      const axiosErr = {
        isAxiosError: true,
        response: { status: 410 },
      };
      expect(getHttpErrorStatus(axiosErr)).toBe(410);
    });

    it('obtiene el status de un error con propiedad status directa', () => {
      const err = { status: 404 };
      expect(getHttpErrorStatus(err)).toBe(404);
    });

    it('obtiene el status anidado en cause', () => {
      const inner = { response: { status: 409 } };
      const err = new Error('Conflicto', { cause: inner });
      expect(getHttpErrorStatus(err)).toBe(409);
    });

    it('devuelve undefined si no hay status', () => {
      expect(getHttpErrorStatus(new Error('Simple'))).toBeUndefined();
      expect(getHttpErrorStatus(null)).toBeUndefined();
    });
  });
});
