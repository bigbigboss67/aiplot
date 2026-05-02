import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
// import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // VitePWA temporarily disabled to prevent service worker caching issues
    // VitePWA({
    //   registerType: 'autoUpdate',
    //   includeAssets: ['favicon.ico', 'favicon.svg', 'icons/*.png', 'icons/*.svg'],
    //   manifest: {
    //     name: 'AI Plot - Smart Plot Management',
    //     short_name: 'AI Plot',
    //     description: 'Real Estate CRM & Plot Management Portal',
    //     theme_color: '#0a1628',
    //     background_color: '#0a1628',
    //     display: 'standalone',
    //     orientation: 'portrait-primary',
    //     start_url: '/',
    //     icons: [
    //       { src: '/icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
    //       { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    //       { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    //       { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    //     ]
    //   },
    //   workbox: {
    //     globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
    //     navigateFallback: '/index.html',
    //     navigateFallbackAllowlist: [/^\/$/,  /^\/login/, /^\/register/, /^\/verify/, /^\/plots/, /^\/cis/, /^\/leads/, /^\/deals/, /^\/followup/, /^\/import/, /^\/call/, /^\/admin/],
    //     navigateFallbackDenylist: [/^\/api/],
    //     runtimeCaching: [
    //       {
    //         urlPattern: /^https:\/\/plot-ai-87781-default-rtdb\.firebaseio\.com/,
    //         handler: 'NetworkFirst',
    //         options: { cacheName: 'firebase-data', expiration: { maxEntries: 100, maxAgeSeconds: 86400 } }
    //       },
    //       {
    //         urlPattern: /^https:\/\/fonts\.googleapis\.com/,
    //         handler: 'CacheFirst',
    //         options: { cacheName: 'google-fonts', expiration: { maxEntries: 20, maxAgeSeconds: 31536000 } }
    //       }
    //     ]
    //   }
    // })
  ],
  resolve: {
    alias: { '@': '/src' }
  },
  build: {
    chunkSizeWarningLimit: 1000,
  }
})
