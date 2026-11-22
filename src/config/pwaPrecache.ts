/**
 * Configuración del precache compartida entre la build de Vite y sus pruebas.
 */

export const pwaIncludedAssets = [
  'assets/favicon.ico',
  'assets/apple-touch-icon-180x180.png',
] as const;

export const pwaManifestIcons = [
  { src: 'assets/pwa-64x64.png', sizes: '64x64', type: 'image/png' },
  {
    src: 'assets/pwa-192x192.png',
    sizes: '192x192',
    type: 'image/png',
  },
  {
    src: 'assets/pwa-512x512.png',
    sizes: '512x512',
    type: 'image/png',
  },
  {
    src: 'assets/maskable-icon-512x512.png',
    sizes: '512x512',
    type: 'image/png',
    purpose: 'maskable',
  },
] as const;

export const pwaGlobPatterns = ['**/*.{js,css,html,ico,png,svg,webp,woff2}'] as const;

export const pwaGlobIgnores = [
  'assets/isotype-gradient.png',
  'assets/*anatomy*.webp',
  'assets/*silhouette*.webp',
  'assets/*runner*.webp',
  'assets/protraining-logo*.webp',
  'assets/protraining-official-isotype*.webp',
  'assets/protraining-3d*.webp',
  'assets/montserrat-cyrillic*.woff2',
  'assets/montserrat-vietnamese*.woff2',
  // Estos assets ya entran al precache con su propia revisión. Si globPatterns los
  // agrega de nuevo sin revisión, Workbox aborta con add-to-cache-list-conflicting-entries.
  ...pwaIncludedAssets,
  ...pwaManifestIcons.map((icon) => icon.src),
] as const;
