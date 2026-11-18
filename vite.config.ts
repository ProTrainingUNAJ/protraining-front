/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['assets/favicon.ico', 'assets/apple-touch-icon-180x180.png'],
      manifest: {
        name: 'ProTraining',
        short_name: 'ProTraining',
        description: 'Planificación y seguimiento para preparadores físicos y atletas.',
        theme_color: '#023050',
        background_color: '#FFFFFF',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        lang: 'es',
        icons: [
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
        ],
      },
      workbox: {
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api/],
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
        // Exclude non-essential heavy images from initial PWA precache
        globIgnores: [
          'assets/isotype-gradient.png',
          'assets/*Page-*.js',
          'assets/EvolutionRangeSelector-*.js',
          'assets/*anatomy*.webp',
          'assets/*silhouette*.webp',
          'assets/*runner*.webp',
          'assets/protraining-logo*.webp',
          'assets/protraining-official-isotype*.webp',
          'assets/protraining-3d*.webp',
          'assets/montserrat-cyrillic*.woff2',
          'assets/montserrat-vietnamese*.woff2',
        ],
        runtimeCaching: [
          {
            urlPattern: /\.(?:js|css)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-resources',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 60,
              },
            },
          },
          {
            urlPattern: /\.(?:woff2?)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'fonts',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
        ],
        importScripts: ['/push-sw.js'],
      },
      devOptions: { enabled: false },
    }),
  ],
  server: {
    port: 5173,
    host: '127.0.0.1',
    proxy: {
      '/api': {
        target: process.env.DEV_API_TARGET || 'http://127.0.0.1:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/identidad': {
        target: process.env.DEV_API_TARGET || 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/estructura': {
        target: process.env.DEV_API_TARGET || 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/entrenamiento': {
        target: process.env.DEV_API_TARGET || 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/seguimiento': {
        target: process.env.DEV_API_TARGET || 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/asistente': {
        target: process.env.DEV_API_TARGET || 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    // Cloudflare Tunnel expone el preview con hostnames *.trycloudflare.com.
    // Vite 6 bloquea hosts desconocidos por defecto, por eso se permiten.
    allowedHosts: ['.trycloudflare.com'],
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
