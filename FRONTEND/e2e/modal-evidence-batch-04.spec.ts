import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth.helper';
import { navigateTo } from './helpers/navigation.helper';
import { installModalEvidenceBatch04ApiMocks } from './helpers/modal-evidence-batch-04-api-mocks';

/**
 * Rodada 4 — evidências visuais (US-022 / dossiê QA): modais 16–20.
 * Depois de validar os PNG em `*-snapshots/`, atualizar `docs/qa/_gen-modal-grid.mjs` (map `snaps`) e regenerar o fragmento + handbook.
 */
test.describe('Modal evidence batch 04 (16–20)', () => {
    test.beforeEach(async ({ page }) => {
        await installModalEvidenceBatch04ApiMocks(page);
    });

    test('16 — ContractCreationWizard (Contratos → Novo Contrato — assistente)', async ({ page }) => {
        await loginAs(page, 'manager');
        await page.goto('/contracts');
        await page.waitForURL(/\/contracts/, { timeout: 30000 });
        await page.waitForLoadState('networkidle');
        await expect(page.getByText('Gestão de Contratos')).toBeVisible({ timeout: 20000 });

        await page.getByTestId('btn-novo-contrato').click();
        const dlg = page.getByRole('dialog');
        await expect(dlg.getByText('Novo Contrato')).toBeVisible({ timeout: 15000 });
        await expect(dlg.getByText('Identificação e fornecedor')).toBeVisible({ timeout: 10000 });

        await expect(dlg).toHaveScreenshot('modal-evidence-16-contract-creation-wizard-shell.png');
    });

    test('17 — ContractModal (Contratos → editar contrato existente)', async ({ page }) => {
        await loginAs(page, 'manager');
        await page.goto('/contracts');
        await page.waitForURL(/\/contracts/, { timeout: 30000 });
        await page.waitForLoadState('networkidle');
        await expect(page.getByText('Gestão de Contratos')).toBeVisible({ timeout: 20000 });

        const row = page.locator('tbody tr').filter({ hasText: 'CTR-E2E' });
        await expect(row).toBeVisible({ timeout: 15000 });
        await row.getByRole('button').nth(1).click();

        const dlg = page.getByRole('dialog');
        await expect(dlg.getByText('Contrato: CTR-E2E')).toBeVisible({ timeout: 15000 });

        await expect(dlg).toHaveScreenshot('modal-evidence-17-contract-modal-shell.png');
    });

    test('18 — CostCenterModal (Config → Centros de Custo → Novo)', async ({ page }) => {
        await loginAs(page, 'manager');
        await navigateTo(page, 'config');

        await expect(page.getByText(/estrutura organizacional/i)).toBeVisible({ timeout: 20000 });
        await page.getByTestId('org-tab-centros-custo').click();
        await page.waitForTimeout(300);

        await page.getByRole('button', { name: /novo centro de custo/i }).click();
        const dlg = page.getByRole('dialog');
        await expect(dlg.getByText('Novo Centro de Custo')).toBeVisible({ timeout: 15000 });

        await expect(dlg).toHaveScreenshot('modal-evidence-18-cost-center-shell.png');
    });

    test('19 — DepartmentModal (Config → Diretorias → Nova)', async ({ page }) => {
        await loginAs(page, 'manager');
        await navigateTo(page, 'config');

        await expect(page.getByText(/estrutura organizacional/i)).toBeVisible({ timeout: 20000 });
        await page.getByTestId('org-tab-diretorias').click();
        await page.waitForTimeout(300);

        await page.getByRole('button', { name: /nova diretoria/i }).click();
        const dlg = page.getByRole('dialog');
        await expect(dlg.getByText('Nova Diretoria')).toBeVisible({ timeout: 15000 });

        await expect(dlg).toHaveScreenshot('modal-evidence-19-department-shell.png');
    });

    test('20 — ExpenseApprovalModal (Financeiro → Despesas → aprovar)', async ({ page }) => {
        await loginAs(page, 'manager');
        await page.goto('/finance');
        await page.waitForURL(/\/finance/, { timeout: 30000 });
        await page.waitForLoadState('networkidle');
        await expect(page.getByText(/gestão financeira/i)).toBeVisible({ timeout: 20000 });

        await page.getByTestId('tab-1').click();
        await page.waitForTimeout(400);

        const row = page.locator('tbody tr').filter({ hasText: 'Despesa aguardando aprovação E2E' });
        await expect(row).toBeVisible({ timeout: 20000 });
        await row.getByRole('button').first().click();

        const dlg = page.getByRole('dialog');
        await expect(dlg.getByText('Aprovar Despesa')).toBeVisible({ timeout: 15000 });

        await expect(dlg).toHaveScreenshot('modal-evidence-20-expense-approval-shell.png');
    });
});
