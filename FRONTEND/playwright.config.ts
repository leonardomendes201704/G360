import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: '.',
    testMatch: '**/*.spec.ts',
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : 1,
    reporter: 'html',
    timeout: 120000, // 120s per test (increased for slow login)
    expect: {
        timeout: 30000, // 30s for assertions (increased)
        toHaveScreenshot: { 
            maxDiffPixelRatio: 0.05, 
            animations: "disabled" 
        }
    },
    use: {
        baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5176',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        ignoreHTTPSErrors: true,
        actionTimeout: 30000, // 30s for actions (increased)
        navigationTimeout: 60000, // 60s for navigation (increased)
    },

    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        }
    ],

    webServer: {
        command: 'npm run dev',
        url: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5176',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
    },
});
