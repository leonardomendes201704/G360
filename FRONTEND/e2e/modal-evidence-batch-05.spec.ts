import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth.helper';
import { navigateTo } from './helpers/navigation.helper';
import {
    E2E_PROJECT_ID,
    installModalEvidenceBatch05ApiMocks,
} from './helpers/modal-evidence-batch-05-api-mocks';

/**
 * Rodada 5 — evidências visuais (US-022 / dossiê QA): modais 21–25.
 * Depois de validar os PNG em `*-snapshots/`, atualizar `docs/qa/_gen-modal-grid.mjs` (map `snaps`) e regenerar o fragmento + handbook.
 */
test.describe('Modal evidence batch 05 (21–25)', () => {
    test.beforeEach(async ({ page }) => {
        await installModalEvidenceBatch05ApiMocks(page);
    });

    test('21 — ExpenseModal (Financeiro → Despesas → Lançar Despesa)', async ({ page }) => {
        await loginAs(page, 'manager');
        await page.goto('/finance');
        await page.waitForURL(/\/finance/, { timeout: 30000 });
        await page.waitForLoadState('networkidle');
        await expect(page.getByText('Gestão Financeira')).toBeVisible({ timeout: 20000 });

        await page.getByTestId('tab-1').click();
        await page.waitForTimeout(400);

        await page.getByRole('button', { name: /lançar despesa/i }).click();
        const dlg = page.getByRole('dialog');
        await expect(dlg.getByText('Nova Despesa')).toBeVisible({ timeout: 15000 });

        await expect(dlg).toHaveScreenshot('modal-evidence-21-expense-modal-shell.png');
    });

    test('22 — FiscalYearModal (Config → Ano Fiscal → Novo Ano Fiscal)', async ({ page }) => {
        await loginAs(page, 'manager');
        await navigateTo(page, 'config');

        await expect(page.getByText(/estrutura organizacional/i)).toBeVisible({ timeout: 20000 });
        await page.getByTestId('org-tab-fiscal').click();
        await page.waitForTimeout(300);

        await page.getByTestId('fiscal-year-add').click();
        const dlg = page.getByRole('dialog');
        await expect(dlg.getByText('Novo Ano Fiscal')).toBeVisible({ timeout: 15000 });

        await expect(dlg).toHaveScreenshot('modal-evidence-22-fiscal-year-modal-shell.png');
    });

    test('23 — FollowUpModal (Projeto → visão geral → Follow-Up)', async ({ page }) => {
        await loginAs(page, 'manager');
        await page.goto(`/projects/${E2E_PROJECT_ID}`);
        await page.waitForURL(new RegExp(`/projects/${E2E_PROJECT_ID}`), { timeout: 30000 });
        await page.waitForLoadState('networkidle');

        await page.locator('.fade-in-up').getByText('Follow-Up', { exact: true }).click();
        const dlg = page.getByRole('dialog');
        await expect(dlg.getByText('Novo follow-up')).toBeVisible({ timeout: 15000 });

        await expect(dlg).toHaveScreenshot('modal-evidence-23-follow-up-modal-shell.png');
    });

    test('24 — GlobalRiskModal (Riscos → Novo Risco)', async ({ page }) => {
        await loginAs(page, 'manager');
        await page.goto('/risks');
        await page.waitForURL(/\/risks/, { timeout: 30000 });
        await page.waitForLoadState('networkidle');

        await page.getByRole('button', { name: /novo risco/i }).first().click();
        const dlg = page.getByRole('dialog');
        await expect(dlg.getByText('Novo Registro de Risco')).toBeVisible({ timeout: 15000 });

        await expect(dlg).toHaveScreenshot('modal-evidence-24-global-risk-modal-shell.png');
    });

    test('25 — IncidentCreateModal (Dashboard → Incidente)', async ({ page }) => {
        await loginAs(page, 'manager');
        await page.goto('/dashboard');
        await page.waitForURL(/\/dashboard/, { timeout: 30000 });
        await page.waitForLoadState('networkidle');

        const incidentQuickAction = page
            .getByText('Incidente', { exact: true })
            .or(page.getByText('Novo Incidente', { exact: true }));
        await incidentQuickAction.first().scrollIntoViewIfNeeded();
        await incidentQuickAction.first().click();
        const dlg = page.getByRole('dialog');
        await expect(dlg.getByText('Novo Incidente')).toBeVisible({ timeout: 15000 });

        await expect(dlg).toHaveScreenshot('modal-evidence-25-incident-create-modal-shell.png');
    });
});
