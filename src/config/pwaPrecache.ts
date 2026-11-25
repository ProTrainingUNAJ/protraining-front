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

/**
 * KAN-514: solo entran al precache el entry, las dos pantallas del flujo offline
 * (check-in y rutina de hoy) y sus dependencias. El resto se descarga con
 * StaleWhileRevalidate cuando se visita, para no pagar ~1,2 MB de más en el install.
 * Los tests verifican que esta lista siga cubriendo las dependencias reales del build.
 */
export const pwaOfflineJsChunks = [
  'index',
  'CheckInPage',
  'RoutinePage',
  'PageHeader',
  'pushNotifications',
  'MuscleMapBack',
  'rotate-ccw',
  'exerciseMuscleMapper',
  'pen-line',
  'send',
  'heart-pulse',
  'message-square',
  'chevron-up',
  'ConfettiCelebration',
  'circle',
  'youtube',
  'external-link',
  'RpeSliderBar',
  'flame',
  'clock',
  'award',
  'upload',
  'play',
  'shield-alert',
] as const;

export const pwaOfflineCssChunks = ['index', 'RoutinePage'] as const;

export const pwaGlobIgnores = [
  `assets/!(${pwaOfflineJsChunks.join('|')})-*.js`,
  `assets/!(${pwaOfflineCssChunks.join('|')})-*.css`,
  'assets/isotype-gradient.png',
  'assets/*runner*.webp',
  'assets/protraining-logo*.webp',
  'assets/protraining-official-isotype*.webp',
  'assets/protraining-3d*.webp',
  'assets/montserrat-cyrillic*.woff2',
  'assets/montserrat-vietnamese*.woff2',
  // El mapa muscular del check-in (anatomía + silueta) SÍ se precachea: se muestra
  // en la confirmación del check-in y tiene que estar disponible sin conexión.
  // Estos assets ya entran al precache con su propia revisión. Si globPatterns los
  // agrega de nuevo sin revisión, Workbox aborta con add-to-cache-list-conflicting-entries.
  ...pwaIncludedAssets,
  ...pwaManifestIcons.map((icon) => icon.src),
] as const;
