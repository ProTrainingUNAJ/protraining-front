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

const serviceWorkerPath = resolve(process.cwd(), 'dist/sw.js');

// La lectura se hace dentro de cada prueba: describe.skipIf omite la ejecución de las
// pruebas, pero la función del describe sí corre al cargar el archivo. Si el readFileSync
// estuviera ahí, CI (que corre npm test sin dist/) fallaría antes de poder saltar el suite.
const getPrecachedUrls = (): string[] => {
  const sw = readFileSync(serviceWorkerPath, 'utf8');
  return [...sw.matchAll(/url:"([^"]+)"/g)].map((match) => match[1]);
};

describe.skipIf(!existsSync(serviceWorkerPath))('artefacto del service worker generado', () => {
  it('precachea el index, el manifest y el worker de notificaciones', () => {
    const precachedUrls = getPrecachedUrls();
    expect(precachedUrls).toContain('index.html');
    expect(precachedUrls).toContain('manifest.webmanifest');
    expect(precachedUrls).toContain('push-sw.js');
  });

  it('incluye el entry point y todos los chunks JS del build', () => {
    const precachedUrls = getPrecachedUrls();
    const jsChunks = readdirSync(resolve(process.cwd(), 'dist/assets'))
      .filter((file) => file.endsWith('.js'))
      .map((file) => `assets/${file}`);

    expect(jsChunks.length).toBeGreaterThan(0);
    expect(precachedUrls.some((url) => /^assets\/index-.*\.js$/.test(url))).toBe(true);
    for (const chunk of jsChunks) {
      expect(precachedUrls, `falta ${chunk} en el precache`).toContain(chunk);
    }
  });
});
