import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth.helper';
import { navigateTo, canAccessModule } from './helpers/navigation.helper';

test.describe('Config: System Configuration', () => {

    test.describe('Configuration Access', () => {

        test('should allow Admin to access config', async ({ page }) => {
            await loginAs(page, 'admin');
            await navigateTo(page, 'config');

            await expect(
                page.getByText(/configuração|administração|estrutura organizacional/i).first()
            ).toBeVisible();
            await expect(page).toHaveScreenshot('config-admin-view.png', { fullPage: true });
        });

    });

    test.describe('RBAC: Config Access', () => {

        test('should restrict Collaborator from config', async ({ page }) => {
            await loginAs(page, 'collaborator');

            // Try to access config directly
            await page.goto('/config/organization');
            await page.waitForTimeout(2000);

            // Check if access denied message appears OR if redirected away from config
            const accessDeniedVisible = await page.getByText(/acesso negado/i).first().isVisible().catch(() => false);
            const url = page.url();
            const isRestricted =
                accessDeniedVisible ||
                url.includes('login') ||
                url.includes('dashboard') ||
                !url.includes('config');

            expect(accessDeniedVisible || isRestricted).toBeTruthy();
            await expect(page).toHaveScreenshot('config-collaborator-restricted.png', { fullPage: true });
        });

    });

});
