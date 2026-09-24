import path from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const env = loadEnv(mode, projectRoot, '')
  const apiTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:3001'

  return {
    // Rutas relativas para que el mismo dist funcione en un hosting con
    // subcarpeta, en Electron servido por HTTP y dentro de Capacitor.
    base: './',
    envDir: projectRoot,
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'prompt',
        injectRegister: null,
        manifest: false,
        devOptions: { enabled: false },
        workbox: {
          globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'],
          navigateFallback: 'index.html',
          navigateFallbackDenylist: [/^\/api\//],
          cleanupOutdatedCaches: true,
          clientsClaim: false,
          skipWaiting: false,
        },
      }),
    ],
    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
      headers: {
        'Permissions-Policy': 'microphone=(self), camera=(), geolocation=()',
      },
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
    preview: {
      host: '0.0.0.0',
      port: 4173,
    },
  }
})
