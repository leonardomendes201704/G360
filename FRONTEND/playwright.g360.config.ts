/**
 * Playwright alinhado à porta do Vite do G360 (predefinida 5176; evita conflito com outro frontend na 5173).
 * Uso: npm run test:e2e  (package.json aponta para este ficheiro)
 * Overrides: PLAYWRIGHT_PORT=5180 ou VITE_DEV_PORT=5177
 */
import { defineConfig, devices } from '@playwright/test';

const PORT =
  process.env.PLAYWRIGHT_PORT ||
  process.env.VITE_DEV_PORT ||
  '5176';
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: '.',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? 'html' : 'list',
  timeout: 120000,
  expect: {
    timeout: 30000,
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.05,
      animations: 'disabled',
    },
  },
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    ignoreHTTPSErrors: true,
    actionTimeout: 30000,
    navigationTimeout: 60000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: `npx vite --host --strictPort --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
