import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  compressAndConvertToWebp,
  MAX_FILE_SIZE_BYTES,
  MAX_IMAGE_DIMENSION,
  WEBP_QUALITY,
} from '../imageCompressor';

describe('imageCompressor utility', () => {
  let originalImage: typeof Image;

  beforeEach(() => {
    originalImage = global.Image;
    // Mock Image para jsdom
    class MockImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      width = 800;
      height = 600;
      set src(_val: string) {
        setTimeout(() => {
          if (this.onload) this.onload();
        }, 10);
      }
    }
    // @ts-expect-error mock en jsdom
    global.Image = MockImage;

    // Mock document.createElement('canvas')
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: vi.fn().mockReturnValue({
            drawImage: vi.fn(),
          }),
          toBlob: (cb: (b: Blob | null) => void) => {
            const blob = new Blob(['mock-webp-data'], { type: 'image/webp' });
            cb(blob);
          },
        } as unknown as HTMLCanvasElement;
      }
      return originalCreateElement(tagName);
    });
  });

  afterEach(() => {
    global.Image = originalImage;
    vi.restoreAllMocks();
  });

  it('defines correct technical limits', () => {
    expect(MAX_FILE_SIZE_BYTES).toBe(200 * 1024);
    expect(MAX_IMAGE_DIMENSION).toBe(500);
    expect(WEBP_QUALITY).toBe(0.85);
  });

  it('rejects files larger than 5 MB before sending or compressing', async () => {
    const hugeFile = new File(['a'.repeat(100)], 'huge-image.jpg', { type: 'image/jpeg' });
    Object.defineProperty(hugeFile, 'size', { value: 6 * 1024 * 1024 });

    await expect(compressAndConvertToWebp(hugeFile)).rejects.toThrow(
      'El archivo no puede superar los 5 MB',
    );
  });

  it('rejects non-image files with clear message', async () => {
    const textFile = new File(['dummy text content'], 'document.txt', { type: 'text/plain' });
    await expect(compressAndConvertToWebp(textFile)).rejects.toThrow(
      'El archivo seleccionado debe ser una imagen',
    );
  });

  it('accepts image files and processes successfully with square crop', async () => {
    const pngFile = new File(['fake-png-data'], 'test-avatar.png', { type: 'image/png' });
    const result = await compressAndConvertToWebp(pngFile);
    expect(result).toBeDefined();
    expect(result.name).toBe('test-avatar.webp');
    expect(result.type).toBe('image/webp');
  });
});
