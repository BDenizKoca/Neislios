import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        includeAssets: ['icons/*.png'],
        workbox: {
            globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
            runtimeCaching: [
                {
                    urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                    handler: 'CacheFirst',
                    options: {
                        cacheName: 'google-fonts-cache',
                        expiration: {
                            maxEntries: 10,
                            maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
                        },
                        cacheableResponse: {
                            statuses: [0, 200]
                        }
                    }
                }
            ]
        },
        manifest: {
            name: 'Neislios', // Updated App Name
            short_name: 'Neislios', // Updated Short Name
            description: 'Create, manage, and share movie watchlists with friends.',
            theme_color: '#a9312c', // Updated Theme Color
            background_color: '#ffffff', // Keep white background for splash screen
            display: 'standalone',
            orientation: 'portrait',
            scope: '/',
            start_url: '/',
            icons: [
                // Standard Android/PWA icons
                {
                    src: '/icons/icon-72x72.png',
                    sizes: '72x72',
                    type: 'image/png',
                    purpose: 'any'
                },
                {
                    src: '/icons/icon-96x96.png',
                    sizes: '96x96',
                    type: 'image/png',
                    purpose: 'any'
                },
                {
                    src: '/icons/icon-128x128.png',
                    sizes: '128x128',
                    type: 'image/png',
                    purpose: 'any'
                },
                {
                    src: '/icons/icon-144x144.png',
                    sizes: '144x144',
                    type: 'image/png',
                    purpose: 'any'
                },
                {
                    src: '/icons/icon-152x152.png',
                    sizes: '152x152',
                    type: 'image/png',
                    purpose: 'any'
                },
                {
                    src: '/icons/icon-192x192.png',
                    sizes: '192x192',
                    type: 'image/png',
                    purpose: 'any'
                },
                // Use available 348x348 icon instead of 384x384
                {
                    src: '/icons/icon-348x348.png',
                    sizes: '348x348',
                    type: 'image/png',
                    purpose: 'any'
                },
                {
                    src: '/icons/icon-512x512.png',
                    sizes: '512x512',
                    type: 'image/png',
                    purpose: 'any'
                },
                
                // iOS specific icons
                {
                    src: '/icons/icon-120x120.png',
                    sizes: '120x120',
                    type: 'image/png',
                    purpose: 'any'
                },
                {
                    src: '/icons/icon-167x167.png',
                    sizes: '167x167',
                    type: 'image/png',
                    purpose: 'any'
                },
                {
                    src: '/icons/icon-180x180.png',
                    sizes: '180x180',
                    type: 'image/png',
                    purpose: 'any'
                },
                  // Maskable icons (for Android adaptive icons)
                {
                    src: '/icons/maskable_icon_x192.png',
                    sizes: '192x192',
                    type: 'image/png',
                    purpose: 'maskable'
                },
                {
                    src: '/icons/maskable_icon_x512.png',
                    sizes: '512x512',
                    type: 'image/png',
                    purpose: 'maskable'
                }
            ]
        }
    })
  ],  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          ui: ['@heroicons/react', 'react-loading-skeleton', 'react-hot-toast'],
          dnd: ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
          utils: ['react-swipeable']
        }
      }
    },
    chunkSizeWarningLimit: 600
  }
});
