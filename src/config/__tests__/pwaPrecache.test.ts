import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  pwaGlobIgnores,
  pwaGlobPatterns,
  pwaIncludedAssets,
  pwaManifestIcons,
  pwaOfflineCssChunks,
  pwaOfflineJsChunks,
} from '../pwaPrecache';

describe('configuración del precache de la PWA', () => {
  it('incluye los patrones de JS y CSS en el glob', () => {
    expect(pwaGlobPatterns.some((pattern) => pattern.includes('js'))).toBe(true);
    expect(pwaGlobPatterns.some((pattern) => pattern.includes('css'))).toBe(true);
  });

  it('excluye del glob los chunks que no son del flujo offline', () => {
    expect(pwaGlobIgnores.some((pattern) => pattern.includes('*.js'))).toBe(true);
    expect(pwaGlobIgnores.some((pattern) => pattern.includes('*.css'))).toBe(true);
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

const getAssetsDir = (): string => resolve(process.cwd(), 'dist/assets');

const getEntryFile = (): string => {
  const entry = readdirSync(getAssetsDir()).find((file) => /^index-.*\.js$/.test(file));
  if (!entry) throw new Error('no se generó el chunk entry');
  return entry;
};

describe.skipIf(!existsSync(serviceWorkerPath))('artefacto del service worker generado', () => {
  it('precachea el index, el manifest y el worker de notificaciones', () => {
    const precachedUrls = getPrecachedUrls();
    expect(precachedUrls).toContain('index.html');
    expect(precachedUrls).toContain('manifest.webmanifest');
    expect(precachedUrls).toContain('push-sw.js');
  });

  it('precachea el entry, el check-in, la rutina y sus dependencias', () => {
    const precachedUrls = getPrecachedUrls();
    const files = readdirSync(getAssetsDir());

    expect(precachedUrls).toContain(`assets/${getEntryFile()}`);

    // Un chunk de la lista puede no generarse si Vite lo integra dentro de otro
    // (depende del grafo de imports de cada rama). Si existe, tiene que estar en
    // el precache; si no existe, el test de dependencias dinámicas es el que
    // garantiza que no falte nada para el check-in y la rutina.
    for (const chunk of pwaOfflineJsChunks) {
      const file = files.find((name) => name.startsWith(`${chunk}-`) && name.endsWith('.js'));
      if (file) expect(precachedUrls, `falta ${file} en el precache`).toContain(`assets/${file}`);
    }

    for (const chunk of pwaOfflineCssChunks) {
      const file = files.find((name) => name.startsWith(`${chunk}-`) && name.endsWith('.css'));
      if (file) expect(precachedUrls, `falta ${file} en el precache`).toContain(`assets/${file}`);
    }
  });

  it('precachea las dependencias dinámicas del check-in y la rutina', () => {
    const precachedUrls = getPrecachedUrls();
    const entryCode = readFileSync(resolve(getAssetsDir(), getEntryFile()), 'utf8');
    const mapDepsList = entryCode.match(/m\.f\|\|\(m\.f=\[([^\]]+)\]\)/)?.[1] ?? '';
    const files = [...mapDepsList.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
    expect(files.length).toBeGreaterThan(0);

    for (const page of ['CheckInPage', 'RoutinePage']) {
      const pageIndexes = files.flatMap((file, index) =>
        file.startsWith(`assets/${page}-`) ? [index] : [],
      );
      expect(pageIndexes.length, `${page} no está en el mapa de dependencias`).toBeGreaterThan(0);

      for (const call of entryCode.matchAll(/__vite__mapDeps\(\[([^\]]+)\]\)/g)) {
        const indexes = call[1].split(',').map((value) => Number(value.trim()));
        if (!pageIndexes.some((index) => indexes.includes(index))) continue;

        for (const index of indexes) {
          const dependency = files[index];
          expect(dependency, `índice ${index} sin archivo`).toBeDefined();
          if (dependency) {
            expect(precachedUrls, `falta ${dependency} en el precache`).toContain(dependency);
          }
        }
      }
    }
  });

  it('no precachea los chunks de otras páginas', () => {
    const precachedUrls = getPrecachedUrls();
    const jsPermitidos = new Set<string>(pwaOfflineJsChunks);
    const cssPermitidos = new Set<string>(pwaOfflineCssChunks);

    for (const file of readdirSync(getAssetsDir())) {
      const js = file.match(/^(.*)-[A-Za-z0-9_-]{8}\.js$/);
      const css = file.match(/^(.*)-[A-Za-z0-9_-]{8}\.css$/);
      if (js && !jsPermitidos.has(js[1])) expect(precachedUrls).not.toContain(`assets/${file}`);
      if (css && !cssPermitidos.has(css[1])) expect(precachedUrls).not.toContain(`assets/${file}`);
    }
  });

  it('precachea el mapa muscular del check-in para que aparezca sin conexión', () => {
    const precachedUrls = getPrecachedUrls();
    const muscleImages = readdirSync(getAssetsDir())
      .filter((file) => /^(front|back)-.*(anatomy|silhouette).*\.webp$/.test(file))
      .map((file) => `assets/${file}`);

    expect(muscleImages.length).toBeGreaterThanOrEqual(4);
    for (const image of muscleImages) {
      expect(precachedUrls, `falta ${image} en el precache`).toContain(image);
    }
  });

  it('mantiene el precache por debajo de 1,5 MB', () => {
    const total = getPrecachedUrls().reduce((sum, url) => {
      const file = resolve(process.cwd(), 'dist', url);
      return existsSync(file) ? sum + statSync(file).size : sum;
    }, 0);

    expect(total).toBeLessThan(1_536 * 1024);
  });
});
