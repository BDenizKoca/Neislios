import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        workbox: {
            globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']
        },
        manifest: {
            name: 'Neislios', // Updated App Name
            short_name: 'Neislios', // Updated Short Name
            description: 'Create, manage, and share movie watchlists with friends.',
            theme_color: '#a9312c', // Updated Theme Color
            background_color: '#ffffff', // Keep white background for splash screen
            display: 'standalone',
            scope: '/',
            start_url: '/',
            icons: [
                {
                    src: '/icons/icon-72x72.png', // Added 72x72
                    sizes: '72x72',
                    type: 'image/png',
                    purpose: 'any maskable'
                },
                {
                    src: '/icons/icon-96x96.png', // Added 96x96
                    sizes: '96x96',
                    type: 'image/png',
                    purpose: 'any maskable'
                },
                {
                    src: '/icons/icon-144x144.png', // Added 144x144
                    sizes: '144x144',
                    type: 'image/png',
                    purpose: 'any maskable'
                },
                {
                    src: '/icons/icon-192x192.png',
                    sizes: '192x192',
                    type: 'image/png',
                    purpose: 'any maskable'
                },
                {
                    src: '/icons/icon-512x512.png',
                    sizes: '512x512',
                    type: 'image/png',
                    purpose: 'any maskable'
                }
                // Add 128x128, 152x152, 384x384 if you create them later
            ]
        }
    })
  ],
});
