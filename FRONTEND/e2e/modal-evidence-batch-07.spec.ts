import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth.helper';
import { E2E_PROJECT_ID, installModalEvidenceBatch07ApiMocks } from './helpers/modal-evidence-batch-07-api-mocks';

/**
 * Rodada 7 — evidências visuais (US-022 / dossiê QA): modais 31–35.
 * Depois de validar os PNG em `*-snapshots/`, atualizar `docs/qa/_gen-modal-grid.mjs` (map `snaps`) e regenerar o fragmento + handbook.
 */
test.describe('Modal evidence batch 07 (31–35)', () => {
    test.beforeEach(async ({ page }) => {
        await installModalEvidenceBatch07ApiMocks(page);
    });

    test('31 — MinuteModal (Projeto → Atas → Nova Ata)', async ({ page }) => {
        await loginAs(page, 'manager');
        await page.goto(`/projects/${E2E_PROJECT_ID}?tab=minutes`);
        await page.waitForURL(new RegExp(`/projects/${E2E_PROJECT_ID}`), { timeout: 30000 });
        await page.waitForLoadState('networkidle');
        await expect(page.getByText('Atas de Reunião')).toBeVisible({ timeout: 20000 });

        await page.getByRole('button', { name: /nova ata/i }).click();
        const dlg = page.getByRole('dialog');
        await expect(dlg.getByText('Nova ata de reunião')).toBeVisible({ timeout: 15000 });

        await expect(dlg).toHaveScreenshot('modal-evidence-31-minute-modal-shell.png');
    });

    test('32 — NotificationsModal (Topo → notificações → Ver todas)', async ({ page }) => {
        await loginAs(page, 'manager');
        await page.goto('/dashboard');
        await page.waitForURL(/\/dashboard/, { timeout: 30000 });
        await page.waitForLoadState('networkidle');

        await page.locator('header .top-bar-icon').nth(1).click();
        // Evitar colisão com «Ver todas →» do dashboard (substring).
        await page.getByText('Ver todas', { exact: true }).click();

        const dlg = page.getByRole('dialog');
        await expect(dlg.getByText('Todas as Notificações')).toBeVisible({ timeout: 15000 });

        await expect(dlg).toHaveScreenshot('modal-evidence-32-notifications-modal-shell.png');
    });

    test('33 — PaymentConditionModal (Projeto → Propostas → Definir Condição)', async ({ page }) => {
        await loginAs(page, 'manager');
        await page.goto(`/projects/${E2E_PROJECT_ID}?tab=proposals`);
        await page.waitForURL(new RegExp(`/projects/${E2E_PROJECT_ID}`), { timeout: 30000 });
        await page.waitForLoadState('networkidle');
        await expect(page.getByText('Propostas Recebidas')).toBeVisible({ timeout: 20000 });

        await page.getByRole('button', { name: /definir condição/i }).click();
        const dlg = page.getByRole('dialog');
        await expect(dlg.getByText('Condição comercial')).toBeVisible({ timeout: 15000 });

        await expect(dlg).toHaveScreenshot('modal-evidence-33-payment-condition-modal-shell.png');
    });

    test('34 — Project form page (Projetos → Novo Projeto)', async ({ page }) => {
        await loginAs(page, 'manager');
        await page.goto('/projects');
        await page.waitForURL(/\/projects/, { timeout: 30000 });
        await page.waitForLoadState('networkidle');
        await expect(page.getByRole('heading', { name: 'Projetos' })).toBeVisible({ timeout: 20000 });

        const novo = page.getByTestId('btn-novo-projeto');
        if (await novo.isVisible().catch(() => false)) {
            await novo.click();
        } else {
            await page.goto('/dashboard');
            await page.waitForLoadState('networkidle');
            await page.getByText('Criar projeto ágil').click();
        }

        await expect(page).toHaveURL(/\/projects\/new/, { timeout: 15000 });
        await expect(page.getByRole('heading', { name: 'Novo projeto' })).toBeVisible({ timeout: 15000 });
        await expect(page.getByText('Identificação')).toBeVisible({ timeout: 10000 });

        await expect(page).toHaveScreenshot('modal-evidence-34-project-modal-shell.png');
    });

    test('35 — ProjectTaskModal (Projeto → Tarefas → Nova Tarefa)', async ({ page }) => {
        await loginAs(page, 'manager');
        await page.goto(`/projects/${E2E_PROJECT_ID}?tab=tasks`);
        await page.waitForURL(new RegExp(`/projects/${E2E_PROJECT_ID}`), { timeout: 30000 });
        await page.waitForLoadState('networkidle');
        await expect(page.getByText('Nova Tarefa')).toBeVisible({ timeout: 20000 });

        await page.getByRole('button', { name: /^Nova Tarefa$/i }).click();
        const dlg = page.getByTestId('modal-project-task');
        await expect(dlg.getByText('Nova tarefa')).toBeVisible({ timeout: 15000 });

        await expect(dlg).toHaveScreenshot('modal-evidence-35-project-task-modal-shell.png');
    });
});
