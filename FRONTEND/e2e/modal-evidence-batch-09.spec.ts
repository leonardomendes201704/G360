import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth.helper';
import { navigateTo } from './helpers/navigation.helper';
import { installModalEvidenceBatch09ApiMocks } from './helpers/modal-evidence-batch-09-api-mocks';

/**
 * Rodada 9 — evidências visuais (US-022 / dossiê QA): modais 41–45.
 * Depois de validar os PNG em `*-snapshots/`, atualizar `docs/qa/_gen-modal-grid.mjs` (map `snaps`) e regenerar o fragmento + handbook.
 */
test.describe('Modal evidence batch 09 (41–45)', () => {
    test.beforeEach(async ({ page }) => {
        await installModalEvidenceBatch09ApiMocks(page);
    });

    test('41 — SmtpConfigModal (Config → Integrações → Servidor SMTP)', async ({ page }) => {
        await loginAs(page, 'manager');
        await navigateTo(page, 'config');

        await expect(page.getByText(/estrutura organizacional/i)).toBeVisible({ timeout: 20000 });
        await page.getByTestId('org-tab-integracoes').click();
        await page.waitForTimeout(400);

        await page.getByTestId('integration-open-SMTP').click();
        const dlg = page.getByRole('dialog');
        await expect(dlg.getByText('Configuração de e-mail (SMTP)')).toBeVisible({ timeout: 15000 });

        await expect(dlg).toHaveScreenshot('modal-evidence-41-smtp-config-modal-shell.png');
    });

    test('42 — SubmitExpenseModal (Financeiro → Despesas e Contas → enviar)', async ({ page }) => {
        await loginAs(page, 'manager');
        await page.goto('/finance');
        await page.waitForURL(/\/finance/, { timeout: 30000 });
        await page.waitForLoadState('networkidle');

        await page.getByTestId('tab-1').click();
        await page.waitForTimeout(400);
        await expect(page.getByText('Despesa E2E submeter')).toBeVisible({ timeout: 20000 });

        const row = page.locator('tbody tr').filter({ hasText: 'Despesa E2E submeter' });
        await row.locator('td').last().locator('button').first().click();

        const dlg = page.getByRole('dialog');
        // Título e botão primário repetem o mesmo texto — restringir ao DialogTitle (id g360-modal-title-*).
        await expect(
            dlg.locator('[id^="g360-modal-title-"]').getByText('Enviar para Aprovação'),
        ).toBeVisible({ timeout: 15000 });

        await expect(dlg).toHaveScreenshot('modal-evidence-42-submit-expense-modal-shell.png');
    });

    test('43 — SupplierModal (Fornecedores → Novo Fornecedor)', async ({ page }) => {
        await loginAs(page, 'manager');
        await page.goto('/suppliers');
        await page.waitForURL(/\/suppliers/, { timeout: 30000 });
        await page.waitForLoadState('networkidle');
        await expect(page.getByText('Lista de Fornecedores')).toBeVisible({ timeout: 20000 });

        await page.getByRole('button', { name: /novo fornecedor/i }).first().click();
        const dlg = page.getByRole('dialog');
        await expect(dlg.getByText('Novo fornecedor')).toBeVisible({ timeout: 15000 });

        await expect(dlg).toHaveScreenshot('modal-evidence-43-supplier-modal-shell.png');
    });

    test('44 — SupplierViewModal (Fornecedores → visualizar)', async ({ page }) => {
        await loginAs(page, 'manager');
        await page.goto('/suppliers');
        await page.waitForURL(/\/suppliers/, { timeout: 30000 });
        await page.waitForLoadState('networkidle');
        await expect(page.getByText('Fornecedor E2E Visual')).toBeVisible({ timeout: 20000 });

        const row = page.locator('tbody tr').filter({ hasText: 'Fornecedor E2E Visual' });
        await row.locator('td').last().locator('button').first().click();

        const dlg = page.getByRole('dialog');
        await expect(dlg.getByText('Fornecedor E2E Visual')).toBeVisible({ timeout: 15000 });

        await expect(dlg).toHaveScreenshot('modal-evidence-44-supplier-view-modal-shell.png');
    });

    test('45 — TaskModal (Tarefas → Nova Tarefa / tarefa geral)', async ({ page }) => {
        await loginAs(page, 'manager');
        await page.goto('/tasks');
        await page.waitForURL(/\/tasks/, { timeout: 30000 });
        await page.waitForLoadState('networkidle');
        await expect(page.getByText('Tarefas Gerais')).toBeVisible({ timeout: 20000 });

        await page.getByTestId('btn-nova-tarefa').click();
        const dlg = page.getByRole('dialog');
        await expect(dlg.getByText('Nova Tarefa')).toBeVisible({ timeout: 15000 });

        await expect(dlg).toHaveScreenshot('modal-evidence-45-task-modal-shell.png');
    });
});
