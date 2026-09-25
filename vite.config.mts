import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// HT-01 del backlog: scaffold del PWA con soporte offline.
// Precachea el shell de la app; los DATOS (intervenciones, fotos) van
// aparte en IndexedDB via Dexie (ver src/lib/db.ts), no en este cache.
export default defineConfig({
  // host:true = escucha en todas las interfaces (no solo localhost), para
  // poder probar la PWA desde un celular real en la misma red.
  // allowedHosts: acepta los enlaces temporales de Cloudflare Tunnel
  // (`cloudflared tunnel --url ...`) para demos con HTTPS; Vite bloquea
  // por defecto cualquier dominio que no sea localhost o una IP.
  server: { host: true, port: 5173, allowedHosts: ['.trycloudflare.com'] },
  resolve: {
    alias: {
      '@pas-sjl/shared-types': path.resolve(__dirname, '../../packages/shared-types/src/index.ts'),
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico'],
      manifest: {
        name: 'PAS SJL - Fiscalización de Campo',
        short_name: 'PAS Campo',
        description: 'Registro de intervenciones de fiscalización - MDSJL',
        theme_color: '#101f4d',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        // shell de la app cacheado; las llamadas API se manejan con la cola
        // de sincronizacion propia (ver src/lib/sync-queue.ts), no con
        // runtimeCaching generico, porque necesitamos control fino sobre
        // reintentos y sobre que se purga cuando se confirma la subida.
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
    }),
  ],
});
