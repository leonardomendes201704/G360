import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth.helper';

test.describe('US-018/019: Tenant admin modal', () => {
    test.beforeEach(async ({ page }) => {
        await loginAs(page, 'admin');
    });

    test('footer stays inside dialog and action buttons are visible', async ({ page }) => {
        await page.goto('/config/tenants');
        await expect(page.getByText('Gerenciamento de Tenants')).toBeVisible();

        await page.getByRole('button', { name: /novo tenant/i }).click();
        await expect(page.getByRole('dialog').getByText('Novo Tenant', { exact: true })).toBeVisible();

        const footer = page.getByTestId('tenant-modal-footer');
        await expect(footer).toBeVisible();

        const dialog = page.locator('[role="dialog"]');
        await expect(dialog).toBeVisible();

        const footerBox = await footer.boundingBox();
        const dialogBox = await dialog.boundingBox();
        expect(footerBox).toBeTruthy();
        expect(dialogBox).toBeTruthy();
        if (footerBox && dialogBox) {
            expect(footerBox.y + footerBox.height).toBeLessThanOrEqual(dialogBox.y + dialogBox.height + 4);
        }

        await expect(page.getByRole('button', { name: /cancelar/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /criar tenant/i })).toBeVisible();

        await page.getByRole('button', { name: /cancelar/i }).click();
        await expect(page.locator('[role="dialog"]')).toHaveCount(0);
    });
});

/**
 * US-020: titulos sem quebra — coberto por Vitest em StatsCard.test.jsx (StatsCard e usado no ManagerOverview).
 * Evita dependencia de usuario gestor.ti existir no banco de cada ambiente.
 */
