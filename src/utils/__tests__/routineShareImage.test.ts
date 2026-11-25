import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  shareToInstagram,
  shareToFacebook,
  shareToWhatsApp,
  shareToAnyApp,
  downloadImageFile,
} from '../routineShareImage';

describe('routineShareImage (KAN-623)', () => {
  const dummyFile = new File(['dummy content'], 'protraining-entrenamiento.png', {
    type: 'image/png',
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('downloadImageFile', () => {
    it('crea un elemento anchor para descargar el archivo en el navegador', () => {
      const createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
      const revokeObjectURL = vi.fn();
      vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });

      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

      downloadImageFile(dummyFile);

      expect(clickSpy).toHaveBeenCalled();
      expect(createObjectURL).toHaveBeenCalledWith(dummyFile);
    });
  });

  describe('shareToInstagram', () => {
    it('utiliza Web Share API si está soportada en el dispositivo móvil', async () => {
      const shareMock = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal('navigator', {
        canShare: vi.fn().mockReturnValue(true),
        share: shareMock,
      });

      const result = await shareToInstagram(dummyFile);

      expect(result.success).toBe(true);
      expect(shareMock).toHaveBeenCalledWith(
        expect.objectContaining({
          files: [dummyFile],
        }),
      );
    });

    it('ejecuta fallback en escritorio descargando la imagen y abriendo Instagram web', async () => {
      vi.stubGlobal('navigator', {
        canShare: undefined,
        share: undefined,
      });
      const openMock = vi.fn();
      vi.stubGlobal('open', openMock);

      const createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
      const revokeObjectURL = vi.fn();
      vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });

      const result = await shareToInstagram(dummyFile);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Instagram');
      expect(openMock).toHaveBeenCalledWith(
        'https://www.instagram.com/',
        '_blank',
        'noopener,noreferrer',
      );
    });
  });

  describe('shareToFacebook', () => {
    it('utiliza Web Share API cuando es posible', async () => {
      const shareMock = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal('navigator', {
        canShare: vi.fn().mockReturnValue(true),
        share: shareMock,
      });

      const result = await shareToFacebook(dummyFile);

      expect(result.success).toBe(true);
      expect(shareMock).toHaveBeenCalled();
    });

    it('ejecuta fallback abriendo Facebook', async () => {
      vi.stubGlobal('navigator', {
        canShare: undefined,
        share: undefined,
      });
      const openMock = vi.fn();
      vi.stubGlobal('open', openMock);
      vi.stubGlobal('URL', { createObjectURL: vi.fn(), revokeObjectURL: vi.fn() });

      const result = await shareToFacebook(dummyFile);

      expect(result.success).toBe(true);
      expect(openMock).toHaveBeenCalledWith(
        'https://www.facebook.com/',
        '_blank',
        'noopener,noreferrer',
      );
    });
  });

  describe('shareToWhatsApp', () => {
    it('utiliza Web Share API en dispositivos compatibles', async () => {
      const shareMock = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal('navigator', {
        canShare: vi.fn().mockReturnValue(true),
        share: shareMock,
      });

      const result = await shareToWhatsApp(dummyFile);

      expect(result.success).toBe(true);
      expect(shareMock).toHaveBeenCalled();
    });

    it('ejecuta fallback abriendo enlace wa.me con mensaje prellenado', async () => {
      vi.stubGlobal('navigator', {
        canShare: undefined,
        share: undefined,
      });
      const openMock = vi.fn();
      vi.stubGlobal('open', openMock);
      vi.stubGlobal('URL', { createObjectURL: vi.fn(), revokeObjectURL: vi.fn() });

      const result = await shareToWhatsApp(dummyFile);

      expect(result.success).toBe(true);
      expect(openMock).toHaveBeenCalledWith(
        expect.stringContaining('api.whatsapp.com'),
        '_blank',
        'noopener,noreferrer',
      );
    });
  });

  describe('shareToAnyApp', () => {
    it('comparte el archivo PNG a cualquier app mediante el menú nativo', async () => {
      const shareMock = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal('navigator', {
        canShare: vi.fn().mockReturnValue(true),
        share: shareMock,
      });

      const result = await shareToAnyApp(dummyFile);

      expect(result.success).toBe(true);
      expect(shareMock).toHaveBeenCalledWith(
        expect.objectContaining({
          files: [dummyFile],
        }),
      );
    });

    it('descarga el archivo PNG si Web Share API no está disponible', async () => {
      vi.stubGlobal('navigator', {
        canShare: undefined,
        share: undefined,
      });
      vi.stubGlobal('URL', { createObjectURL: vi.fn(), revokeObjectURL: vi.fn() });

      const result = await shareToAnyApp(dummyFile);

      expect(result.success).toBe(true);
      expect(result.message).toContain('PNG descargada');
    });
  });
});
