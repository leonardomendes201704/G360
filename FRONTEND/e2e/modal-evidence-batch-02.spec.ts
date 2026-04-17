import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth.helper';
import { navigateTo } from './helpers/navigation.helper';
import { installModalEvidenceBatch02ApiMocks } from './helpers/modal-evidence-batch-02-api-mocks';

/**
 * Rodada 2 — evidências visuais (US-022 / dossiê QA): modais 06–10.
 * Depois de validar os PNG em `*-snapshots/`, atualizar `docs/qa/_gen-modal-grid.mjs` (map `snaps`) e regenerar o fragmento + handbook.
 */
test.describe('Modal evidence batch 02 (06–10)', () => {
    test.beforeEach(async ({ page }) => {
        await installModalEvidenceBatch02ApiMocks(page);
    });

    test('06 — AssetCategoryModal (Ativos → Categorias)', async ({ page }) => {
        await loginAs(page, 'manager');
        await page.goto('/assets');
        await page.waitForURL(/\/assets/, { timeout: 30000 });
        await page.waitForLoadState('networkidle');
        await expect(page.getByText(/gestão de ativos/i)).toBeVisible({ timeout: 20000 });

        await page.getByTestId('btn-gerir-categorias').click();
        const dlg = page.getByRole('dialog');
        await expect(dlg.getByText('Nova categoria')).toBeVisible({ timeout: 15000 });

        await expect(dlg).toHaveScreenshot('modal-evidence-06-asset-category-shell.png');
    });

    test('07 — AssetMaintenanceModal (editar ativo → Manutenções)', async ({ page }) => {
        await loginAs(page, 'manager');
        await page.goto('/assets');
        await page.waitForURL(/\/assets/, { timeout: 30000 });
        await page.waitForLoadState('networkidle');
        await expect(page.getByText(/gestão de ativos/i)).toBeVisible({ timeout: 20000 });

        const assetsRoot = page.locator('.assets-page');
        await assetsRoot.locator('button').filter({ hasText: 'Hardware' }).click();
        await page.waitForTimeout(400);

        const row = assetsRoot.locator('tbody tr').filter({ hasText: 'PAT-E2E' });
        await expect(row).toBeVisible({ timeout: 20000 });
        await row.getByRole('button', { name: 'Editar' }).click();

        await expect(page.getByText(/editar ativo/i).first()).toBeVisible({ timeout: 15000 });

        const assetDlg = page.getByRole('dialog').first();
        await assetDlg.getByRole('button', { name: /manutenções/i }).click();
        await page.waitForTimeout(300);
        await assetDlg.getByRole('button', { name: /registrar manutenção/i }).click();

        const maintDlg = page.getByRole('dialog').last();
        await expect(maintDlg.getByText('Nova manutenção')).toBeVisible({ timeout: 15000 });

        await expect(maintDlg).toHaveScreenshot('modal-evidence-07-asset-maintenance-shell.png');
    });

    test('08 — AssetModal (novo hardware)', async ({ page }) => {
        await loginAs(page, 'manager');
        await page.goto('/assets');
        await page.waitForURL(/\/assets/, { timeout: 30000 });
        await page.waitForLoadState('networkidle');
        await expect(page.getByText(/gestão de ativos/i)).toBeVisible({ timeout: 20000 });

        await page.getByTestId('btn-novo-ativo').click();
        const dlg = page.getByRole('dialog');
        await expect(dlg.getByText('Novo ativo')).toBeVisible({ timeout: 15000 });

        await expect(dlg).toHaveScreenshot('modal-evidence-08-asset-modal-shell.png');
    });

    test('09 — AssetViewModal (visualizar)', async ({ page }) => {
        await loginAs(page, 'manager');
        await page.goto('/assets');
        await page.waitForURL(/\/assets/, { timeout: 30000 });
        await page.waitForLoadState('networkidle');
        await expect(page.getByText(/gestão de ativos/i)).toBeVisible({ timeout: 20000 });

        const assetsRoot = page.locator('.assets-page');
        await assetsRoot.locator('button').filter({ hasText: 'Hardware' }).click();
        await page.waitForTimeout(400);

        const row = assetsRoot.locator('tbody tr').filter({ hasText: 'PAT-E2E' });
        await row.getByRole('button', { name: 'Visualizar' }).click();

        const dlg = page.getByRole('dialog');
        await expect(dlg.getByText('Notebook evidência E2E', { exact: true })).toBeVisible({ timeout: 15000 });

        await expect(dlg).toHaveScreenshot('modal-evidence-09-asset-view-shell.png');
    });

    test('10 — AzureConfigModal (Config → Integrações)', async ({ page }) => {
        await loginAs(page, 'manager');
        await navigateTo(page, 'config');

        await page.getByTestId('org-tab-integracoes').click();
        await page.waitForTimeout(300);

        await page.getByTestId('integration-open-AZURE').click();

        const dlg = page.getByRole('dialog');
        await expect(dlg.getByText('Configuração Azure AD')).toBeVisible({ timeout: 15000 });

        await expect(dlg).toHaveScreenshot('modal-evidence-10-azure-config-shell.png');
    });
});
