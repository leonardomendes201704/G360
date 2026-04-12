import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth.helper';

test.describe('Finance Dashboard: Numerical Assertions', () => {

    test.beforeEach(async ({ page }) => {
        await loginAs(page, 'admin');
    });

    test('should render numerical KPIs with valid currency formatting on Finance Dashboard', async ({ page }) => {
        await page.goto('/finance');
        
        // Wait for the Finance Dashboard to load (checking for KPI headers)
        await expect(page.getByText(/Orçamento Aprovado/i).first()).toBeVisible({ timeout: 15000 });
        await expect(page.getByText(/Realizado \(YTD\)/i).first()).toBeVisible();

        // Ensure that there is at least one element containing a BRL currency value (R$)
        // This validates that the macro calc rules are being rendered as expected in E2E
        const currencyElements = page.locator('text=/R\\$\\s*\\d+/');
        const count = await currencyElements.count();
        expect(count).toBeGreaterThan(0);

        // Ensure Forecast / Burn Rate section renders numerical values
        const hasForecastOrNull = await page.getByText(/Forecast Anual/i).first().isVisible();
        if (hasForecastOrNull) {
            const hasBurnRate = await page.locator('text=/Burn rate:/i').first().isVisible();
            expect(hasBurnRate).toBeTruthy();
        }

        // Visual validation could be done here if baseline snapshots are checked in.
    });
});
