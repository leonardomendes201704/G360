import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth.helper';
import { installModalEvidenceBatch03ApiMocks, E2E_BUDGET_ID } from './helpers/modal-evidence-batch-03-api-mocks';

/**
 * Rodada 3 — evidências visuais (US-022 / dossiê QA): modais 11–15.
 * Depois de validar os PNG em `*-snapshots/`, atualizar `docs/qa/_gen-modal-grid.mjs` (map `snaps`) e regenerar o fragmento + handbook.
 */
test.describe('Modal evidence batch 03 (11–15)', () => {
    test.beforeEach(async ({ page }) => {
        await installModalEvidenceBatch03ApiMocks(page);
    });

    test('11 — BudgetImportModal (detalhe orçamento → Importar Excel)', async ({ page }) => {
        await loginAs(page, 'manager');
        await page.goto(`/finance/budget/${E2E_BUDGET_ID}`);
        await page.waitForURL(new RegExp(`/finance/budget/${E2E_BUDGET_ID}`), { timeout: 30000 });
        await page.waitForLoadState('networkidle');
        await expect(page.getByText('Orçamento evidência E2E')).toBeVisible({ timeout: 20000 });

        await page.getByRole('button', { name: /importar excel/i }).click();
        const dlg = page.getByRole('dialog');
        await expect(dlg.getByText('Importar itens de orçamento')).toBeVisible({ timeout: 15000 });

        await expect(dlg).toHaveScreenshot('modal-evidence-11-budget-import-shell.png');
    });

    test('12 — BudgetItemModal (Novo lançamento)', async ({ page }) => {
        await loginAs(page, 'manager');
        await page.goto(`/finance/budget/${E2E_BUDGET_ID}`);
        await page.waitForURL(new RegExp(`/finance/budget/${E2E_BUDGET_ID}`), { timeout: 30000 });
        await page.waitForLoadState('networkidle');
        await expect(page.getByText('Orçamento evidência E2E')).toBeVisible({ timeout: 20000 });

        await page.getByRole('button', { name: /novo lançamento/i }).click();
        const dlg = page.getByRole('dialog');
        await expect(dlg.getByText('Novo lançamento')).toBeVisible({ timeout: 15000 });

        await expect(dlg).toHaveScreenshot('modal-evidence-12-budget-item-shell.png');
    });

    test('13 — BudgetModal (Financeiro → Orçamentos → Novo Orçamento)', async ({ page }) => {
        await loginAs(page, 'manager');
        await page.goto('/finance');
        await page.waitForURL(/\/finance/, { timeout: 30000 });
        await page.waitForLoadState('networkidle');
        await expect(page.getByText(/gestão financeira/i)).toBeVisible({ timeout: 20000 });

        await page.getByTestId('tab-2').click();
        await page.waitForTimeout(300);

        await page.getByTestId('btn-new-budget').click();
        const dlg = page.getByRole('dialog');
        await expect(dlg.getByText('Novo orçamento')).toBeVisible({ timeout: 15000 });

        await expect(dlg).toHaveScreenshot('modal-evidence-13-budget-modal-shell.png');
    });

    test('14 — ChangeModal (GMUD → Nova GMUD)', async ({ page }) => {
        await loginAs(page, 'manager');
        await page.goto('/changes');
        await page.waitForURL(/\/changes/, { timeout: 30000 });
        await page.waitForLoadState('networkidle');
        await expect(page.getByText('Gestão de Mudança (GMUD)')).toBeVisible({ timeout: 20000 });

        await page.getByRole('button', { name: /nova gmud/i }).click();
        const dlg = page.getByRole('dialog');
        await expect(dlg.getByText('Nova solicitação')).toBeVisible({ timeout: 20000 });

        await expect(dlg).toHaveScreenshot('modal-evidence-14-change-modal-shell.png');
    });

    test('15 — Detalhe GMUD (lista → /changes/:id)', async ({ page }) => {
        await loginAs(page, 'manager');
        await page.goto('/changes');
        await page.waitForURL(/\/changes/, { timeout: 30000 });
        await page.waitForLoadState('networkidle');
        await expect(page.getByText('Gestão de Mudança (GMUD)')).toBeVisible({ timeout: 20000 });

        await page.getByRole('button', { name: 'Lista' }).click();
        await page.waitForTimeout(400);

        await page.locator('tbody tr').first().click();

        await expect(page).toHaveURL(/\/changes\/[0-9a-f-]{36}/i, { timeout: 15000 });
        await expect(page.getByText('GMUD-E2E-001')).toBeVisible({ timeout: 15000 });

        await expect(page.locator('body')).toHaveScreenshot('modal-evidence-15-change-view-shell.png');
    });
});
