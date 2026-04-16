import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth.helper';
import { navigateTo } from './helpers/navigation.helper';

/**
 * Evidência visual: modal Azure AD em StandardModal (Integrações).
 * Requer backend + seed com credenciais em auth.helper.
 */
test.describe('Integrações: modal Azure AD (StandardModal)', () => {
    test('abre Configuração Azure AD a partir da aba Integrações', async ({ page }) => {
        await loginAs(page, 'admin');
        await navigateTo(page, 'config');

        await page.getByRole('button', { name: /Integracoes/i }).click();
        await page.waitForTimeout(300);

        await page.getByTestId('integration-open-AZURE').click();

        await expect(page.getByText('Configuração Azure AD')).toBeVisible();
        await expect(page.getByText('Integração Microsoft Entra ID')).toBeVisible();

        await expect(page).toHaveScreenshot('integrations-azure-modal-shell.png', { fullPage: true });
    });
});
