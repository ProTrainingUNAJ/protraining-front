import { describe, it, expect } from 'vitest';
import { extractYouTubeId, getYouTubeEmbedUrl, getYouTubeWatchUrl } from '../youtube';

describe('YouTube utilities (KAN-380)', () => {
  describe('extractYouTubeId', () => {
    it('extrae el ID de una URL estándar de YouTube (watch?v=...)', () => {
      const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      expect(extractYouTubeId(url)).toBe('dQw4w9WgXcQ');
    });

    it('extrae el ID cuando hay parámetros adicionales', () => {
      const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s&feature=shared';
      expect(extractYouTubeId(url)).toBe('dQw4w9WgXcQ');
    });

    it('extrae el ID de una URL corta youtu.be', () => {
      const url = 'https://youtu.be/dQw4w9WgXcQ';
      expect(extractYouTubeId(url)).toBe('dQw4w9WgXcQ');
    });

    it('extrae el ID de una URL corta youtu.be con parámetros', () => {
      const url = 'https://youtu.be/dQw4w9WgXcQ?t=10';
      expect(extractYouTubeId(url)).toBe('dQw4w9WgXcQ');
    });

    it('extrae el ID de una URL de YouTube Shorts', () => {
      const url = 'https://www.youtube.com/shorts/dQw4w9WgXcQ';
      expect(extractYouTubeId(url)).toBe('dQw4w9WgXcQ');
    });

    it('extrae el ID de una URL embebida embed/', () => {
      const url = 'https://www.youtube.com/embed/dQw4w9WgXcQ';
      expect(extractYouTubeId(url)).toBe('dQw4w9WgXcQ');
    });

    it('retorna null para URLs vacías o inválidas', () => {
      expect(extractYouTubeId(null)).toBeNull();
      expect(extractYouTubeId(undefined)).toBeNull();
      expect(extractYouTubeId('')).toBeNull();
      expect(extractYouTubeId('   ')).toBeNull();
      expect(extractYouTubeId('https://vimeo.com/123456')).toBeNull();
      expect(extractYouTubeId('https://google.com')).toBeNull();
    });
  });

  describe('getYouTubeEmbedUrl', () => {
    it('genera la URL de embed con youtube-nocookie y rel=0', () => {
      expect(getYouTubeEmbedUrl('dQw4w9WgXcQ')).toBe(
        'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0',
      );
    });
  });

  describe('getYouTubeWatchUrl', () => {
    it('construye la URL estándar de watch a partir de una URL corta o ID', () => {
      expect(getYouTubeWatchUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      );
    });

    it('mantiene la URL si no es un ID reconocible', () => {
      expect(getYouTubeWatchUrl('https://otra-plataforma.com/video')).toBe(
        'https://otra-plataforma.com/video',
      );
    });
  });
});
