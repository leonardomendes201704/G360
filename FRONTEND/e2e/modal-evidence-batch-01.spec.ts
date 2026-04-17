import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth.helper';
import { navigateTo } from './helpers/navigation.helper';
import { installModalEvidenceBatch01ApiMocks } from './helpers/modal-evidence-batch-01-api-mocks';

/**
 * Rodada 1 — evidências visuais (US-022 / dossiê QA): modais 01–05.
 * Usa `installModalEvidenceBatch01ApiMocks` (sem backend), no mesmo padrão dos specs de Organização.
 *
 * Após validar os PNG em `*-snapshots/`, atualizar `docs/qa/_gen-modal-grid.mjs` (map `snaps`) e regenerar o fragmento + handbook.
 */
test.describe('Modal evidence batch 01 (01–05)', () => {
    test.beforeEach(async ({ page }) => {
        await installModalEvidenceBatch01ApiMocks(page);
    });

    test('01 — AccountModal (Plano de Contas)', async ({ page }) => {
        await loginAs(page, 'admin');
        await navigateTo(page, 'finance');

        await page.getByRole('button', { name: /plano de contas/i }).click();
        await page.waitForTimeout(400);

        await page.getByRole('button', { name: /nova conta/i }).last().click();

        const dlg = page.getByRole('dialog');
        await expect(dlg.getByText('Nova conta contábil')).toBeVisible({ timeout: 15000 });

        await expect(dlg).toHaveScreenshot('modal-evidence-01-account-shell.png');
    });

    test('02 — AddendumFormModal (aditivo rápido na lista)', async ({ page }) => {
        await loginAs(page, 'admin');
        await navigateTo(page, 'contracts');

        await page.waitForTimeout(800);
        const firstRow = page.locator('tbody tr').first();
        await expect(firstRow).toBeVisible({ timeout: 20000 });

        await firstRow.locator('td').last().locator('button').nth(2).click();

        const dlg = page.getByRole('dialog');
        await expect(dlg.getByText('Novo termo aditivo', { exact: true })).toBeVisible({ timeout: 15000 });

        await expect(dlg).toHaveScreenshot('modal-evidence-02-addendum-form-shell.png');
    });

    test('03 — AddendumViewModal (contrato → Aditivos → ver)', async ({ page }) => {
        await loginAs(page, 'admin');
        await navigateTo(page, 'contracts');

        await page.waitForTimeout(800);
        const firstRow = page.locator('tbody tr').first();
        await expect(firstRow).toBeVisible({ timeout: 20000 });

        await firstRow.locator('td').last().locator('button').nth(1).click();

        const contractDlg = page.getByRole('dialog');
        await expect(contractDlg).toBeVisible({ timeout: 15000 });

        await contractDlg.getByRole('tab', { name: /aditivos/i }).click();
        await page.waitForTimeout(500);

        await contractDlg.locator('tbody tr').first().locator('td').last().locator('button').first().click();

        const viewDlg = page.getByRole('dialog').last();
        await expect(viewDlg.getByText('Aditivo AD-001')).toBeVisible({ timeout: 15000 });
        await page.waitForTimeout(400);

        await expect(viewDlg).toHaveScreenshot('modal-evidence-03-addendum-view-shell.png');
    });

    test('04 — AddMemberModal (projeto → equipas)', async ({ page }) => {
        await loginAs(page, 'admin');
        await page.goto(`/projects/e2e-project-1?tab=teams`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(600);

        await page.getByRole('button', { name: /adicionar membro/i }).click();

        const dlg = page.getByRole('dialog');
        await expect(dlg.getByText(/adicionar membro ao projeto/i)).toBeVisible({ timeout: 15000 });

        await expect(dlg).toHaveScreenshot('modal-evidence-04-add-member-shell.png');
    });

    test('05 — ApprovalDetailsModal (lista mockada)', async ({ page }) => {
        await loginAs(page, 'manager');
        await navigateTo(page, 'approvals');

        await page.waitForTimeout(600);
        await page.getByRole('button', { name: 'Ver Detalhes' }).first().click();

        const dlg = page.getByRole('dialog').last();
        await expect(dlg.getByText('Detalhes da aprovação', { exact: false })).toBeVisible({ timeout: 15000 });
        await expect(dlg.getByText(/informações gerais|descrição de teste/i).first()).toBeVisible({ timeout: 15000 });

        await expect(dlg).toHaveScreenshot('modal-evidence-05-approval-details-shell.png');
    });
});
