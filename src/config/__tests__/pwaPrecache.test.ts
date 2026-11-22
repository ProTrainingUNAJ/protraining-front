import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  pwaGlobIgnores,
  pwaGlobPatterns,
  pwaIncludedAssets,
  pwaManifestIcons,
} from '../pwaPrecache';

describe('configuración del precache de la PWA', () => {
  it('incluye los chunks JS y no los excluye', () => {
    expect(pwaGlobPatterns.some((pattern) => pattern.includes('js'))).toBe(true);
    expect(pwaGlobIgnores.some((pattern) => pattern.includes('.js'))).toBe(false);
  });

  it('excluye del glob los assets que ya entran con revisión propia', () => {
    const assetsConRevision = [...pwaIncludedAssets, ...pwaManifestIcons.map((icon) => icon.src)];

    for (const asset of assetsConRevision) {
      expect(pwaGlobIgnores).toContain(asset);
    }
  });

  it('no repite patrones de exclusión', () => {
    expect(new Set(pwaGlobIgnores).size).toBe(pwaGlobIgnores.length);
  });
});

describe.skipIf(!existsSync(resolve(process.cwd(), 'dist/sw.js')))(
  'artefacto del service worker generado',
  () => {
    const sw = readFileSync(resolve(process.cwd(), 'dist/sw.js'), 'utf8');
    const precachedUrls = [...sw.matchAll(/url:"([^"]+)"/g)].map((match) => match[1]);

    it('precachea el index, el manifest y el worker de notificaciones', () => {
      expect(precachedUrls).toContain('index.html');
      expect(precachedUrls).toContain('manifest.webmanifest');
      expect(precachedUrls).toContain('push-sw.js');
    });

    it('incluye el entry point y todos los chunks JS del build', () => {
      const jsChunks = readdirSync(resolve(process.cwd(), 'dist/assets'))
        .filter((file) => file.endsWith('.js'))
        .map((file) => `assets/${file}`);

      expect(jsChunks.length).toBeGreaterThan(0);
      expect(precachedUrls.some((url) => /^assets\/index-.*\.js$/.test(url))).toBe(true);
      for (const chunk of jsChunks) {
        expect(precachedUrls, `falta ${chunk} en el precache`).toContain(chunk);
      }
    });
  },
);
