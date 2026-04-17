import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth.helper';
import { navigateTo } from './helpers/navigation.helper';
import { E2E_PROJECT_ID, installModalEvidenceBatch08ApiMocks } from './helpers/modal-evidence-batch-08-api-mocks';

/**
 * Rodada 8 — evidências visuais (US-022 / dossiê QA): modais 36–40.
 * Depois de validar os PNG em `*-snapshots/`, atualizar `docs/qa/_gen-modal-grid.mjs` (map `snaps`) e regenerar o fragmento + handbook.
 */
test.describe('Modal evidence batch 08 (36–40)', () => {
    test.beforeEach(async ({ page }) => {
        await installModalEvidenceBatch08ApiMocks(page);
    });

    test('36 — ProposalModal (Projeto → Propostas → Nova Proposta)', async ({ page }) => {
        await loginAs(page, 'manager');
        await page.goto(`/projects/${E2E_PROJECT_ID}?tab=proposals`);
        await page.waitForURL(new RegExp(`/projects/${E2E_PROJECT_ID}`), { timeout: 30000 });
        await page.waitForLoadState('networkidle');
        await expect(page.getByText('Propostas Recebidas')).toBeVisible({ timeout: 20000 });

        await page.getByRole('button', { name: /nova proposta/i }).first().click();
        const dlg = page.getByRole('dialog');
        await expect(dlg.getByText('Nova Proposta')).toBeVisible({ timeout: 15000 });

        await expect(dlg).toHaveScreenshot('modal-evidence-36-proposal-modal-shell.png');
    });

    test('37 — RescheduleModal (Projeto → Follow-up → Reagendar)', async ({ page }) => {
        await loginAs(page, 'manager');
        await page.goto(`/projects/${E2E_PROJECT_ID}?tab=followup`);
        await page.waitForURL(new RegExp(`/projects/${E2E_PROJECT_ID}`), { timeout: 30000 });
        await page.waitForLoadState('networkidle');
        await expect(page.getByText('Follow-up E2E reagendar')).toBeVisible({ timeout: 20000 });

        await page.getByRole('button', { name: /reagendar/i }).first().click();
        const dlg = page.getByRole('dialog');
        await expect(dlg.getByText('Reagendar Follow-up')).toBeVisible({ timeout: 15000 });
        await expect(dlg.getByText('Selecione a nova data para o follow-up')).toBeVisible({ timeout: 10000 });

        await expect(dlg).toHaveScreenshot('modal-evidence-37-reschedule-modal-shell.png');
    });

    test('38 — RiskModal (Projeto → Riscos → Novo Risco)', async ({ page }) => {
        await loginAs(page, 'manager');
        await page.goto(`/projects/${E2E_PROJECT_ID}?tab=risks`);
        await page.waitForURL(new RegExp(`/projects/${E2E_PROJECT_ID}`), { timeout: 30000 });
        await page.waitForLoadState('networkidle');
        await expect(page.getByText('Riscos do Projeto')).toBeVisible({ timeout: 20000 });

        await page.getByRole('button', { name: /novo risco/i }).click();
        const dlg = page.getByRole('dialog');
        await expect(dlg.getByText('Novo Risco')).toBeVisible({ timeout: 15000 });

        await expect(dlg).toHaveScreenshot('modal-evidence-38-risk-modal-shell.png');
    });

    test('39 — RiskViewModal (Projeto → Riscos → visualizar)', async ({ page }) => {
        await loginAs(page, 'manager');
        await page.goto(`/projects/${E2E_PROJECT_ID}?tab=risks`);
        await page.waitForURL(new RegExp(`/projects/${E2E_PROJECT_ID}`), { timeout: 30000 });
        await page.waitForLoadState('networkidle');
        await expect(page.getByText('Lista de Riscos')).toBeVisible({ timeout: 20000 });

        const row = page.locator('tbody tr').filter({ hasText: 'Risco E2E para visualização' });
        await expect(row).toBeVisible({ timeout: 15000 });
        await row.getByRole('button').first().click();

        const dlg = page.getByRole('dialog');
        await expect(dlg.getByText('Detalhes do Risco')).toBeVisible({ timeout: 15000 });

        await expect(dlg).toHaveScreenshot('modal-evidence-39-risk-view-modal-shell.png');
    });

    test('40 — RoleModal (Config → Organização → Perfis → Novo)', async ({ page }) => {
        await loginAs(page, 'manager');
        await navigateTo(page, 'config');

        await expect(page.getByText(/estrutura organizacional/i)).toBeVisible({ timeout: 20000 });
        await page.getByTestId('org-tab-perfis').click();
        await page.waitForTimeout(400);

        await page.getByTestId('role-add').click();
        const dlg = page.getByRole('dialog');
        await expect(dlg.getByText('Novo Perfil de Governança')).toBeVisible({ timeout: 15000 });

        await expect(dlg).toHaveScreenshot('modal-evidence-40-role-modal-shell.png');
    });
});
