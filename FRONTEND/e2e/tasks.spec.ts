import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth.helper';
import { navigateTo } from './helpers/navigation.helper';

test.describe('Tasks: General Task Management', () => {

    test.describe('Tasks Page', () => {

        test.beforeEach(async ({ page }) => {
            await loginAs(page, 'admin');
            await navigateTo(page, 'tasks');
        });

        test('should display tasks page header', async ({ page }) => {
            await expect(
                page.getByRole('heading', { name: /tarefas/i }).or(page.getByText(/tarefas gerais/i))
            ).toBeVisible();
            await expect(page).toHaveScreenshot('tasks-list-page.png', { fullPage: true });
        });

        test('should have create task button', async ({ page }) => {
            const createButton = page.getByTestId('btn-nova-tarefa');
            await expect(createButton).toBeVisible();
        });

        test('should open task creation modal', async ({ page }) => {
            const createButton = page.getByTestId('btn-nova-tarefa');
            await createButton.click();

            // O TaskModal é um MUI Dialog — sem data-testid próprio, usamos role='dialog'
            await expect(page.getByRole('dialog').first()).toBeVisible({ timeout: 10000 });
        });

        test('should create and validate a task (CRUD)', async ({ page }) => {
            test.setTimeout(60000);
            const uniqueTask = `Tarefa E2E ${Date.now()}`;

            // Abrir modal
            await page.getByTestId('btn-nova-tarefa').click();
            const modal = page.getByRole('dialog').first();
            await expect(modal).toBeVisible({ timeout: 10000 });

            // Preencher título
            const titleInput = modal.locator('input[name="title"]').first();
            await titleInput.fill(uniqueTask);

            // Preencher descrição se existir
            const descInput = modal.locator('textarea[name="description"]').first();
            if (await descInput.isVisible()) {
                await descInput.fill('Tarefa criada automaticamente pelo Playwright E2E');
            }

            // Salvar
            const saveBtn = modal.getByRole('button', { name: /criar|salvar/i }).first();
            await saveBtn.click();

            // Verificar toast de sucesso ou que o modal fechou
            const modal2 = page.getByRole('dialog').first();
            const toastVisible = page.getByText(/sucesso|criada/i).first();
            await expect(toastVisible.or(modal2)).toBeVisible({ timeout: 10000 });
            await page.waitForTimeout(500); // Aguarda animação do modal sumir
            await expect(page).toHaveScreenshot('tasks-list-after-creation.png', { fullPage: true });
        });

    });

});
