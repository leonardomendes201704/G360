import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

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
    port: 5173, // Standard Vite Port
    https: {
      key: fs.readFileSync(path.resolve(__dirname, '../backend/src/certs/server.key')),
      cert: fs.readFileSync(path.resolve(__dirname, '../backend/src/certs/server.cert')),
    }
  }
})
