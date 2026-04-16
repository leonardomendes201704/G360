import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth.helper';
import { navigateTo } from './helpers/navigation.helper';
import { installApiMocksForConfigIntegrationFlows } from './helpers/mock-api-for-config-pages';

/**
 * Evidência visual: modal Azure AD em StandardModal (Integrações).
 * Com mocks de API — não exige backend; use credenciais reais só para validação manual.
 */
test.describe('Integrações: modal Azure AD (StandardModal)', () => {
    test('abre Configuração Azure AD a partir da aba Integrações', async ({ page }) => {
        await installApiMocksForConfigIntegrationFlows(page);

        await loginAs(page, 'manager');
        await navigateTo(page, 'config');

        await page.getByRole('button', { name: /Integracoes/i }).click();
        await page.waitForTimeout(300);

        await page.getByTestId('integration-open-AZURE').click();

        await expect(page.getByText('Configuração Azure AD')).toBeVisible();
        await expect(page.getByText('Integração Microsoft Entra ID')).toBeVisible();

        await expect(page).toHaveScreenshot('integrations-azure-modal-shell.png', { fullPage: true });
    });
});
