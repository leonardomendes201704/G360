import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

const certsDir = path.resolve(__dirname, '../BACKEND/src/certs')
const keyPath = path.join(certsDir, 'server.key')
const certPath = path.join(certsDir, 'server.cert')
const devHttps =
  fs.existsSync(keyPath) && fs.existsSync(certPath)
    ? {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
      }
    : undefined

/** Raiz do monorepo (G360): `import … from '../../../../docs/…?raw'` fora de `FRONTEND/`. */
const repoRoot = path.resolve(__dirname, '..')

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    assetsDir: 'resources', // Changed from default 'assets' to avoid conflict with /assets route on IIS
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    css: true,
    include: ['src/**/*.test.{js,jsx,ts,tsx}'],
    exclude: ['**/e2e/**', '**/node_modules/**', '**/tests/**', '**/*.spec.ts'],
  },
  server: {
    host: true, // Listen on all addresses (0.0.0.0)
    // Predefinido 5176 para nao colidir com outro Vite comum na 5173; override: VITE_DEV_PORT
    port: Number(process.env.VITE_DEV_PORT || 5176),
    strictPort: true,
    fs: {
      allow: [repoRoot],
    },
    ...(devHttps ? { https: devHttps } : {}),
  },
})
