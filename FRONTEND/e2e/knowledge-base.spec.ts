import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth.helper';

test.describe('Base de Conhecimento: Knowledge Base', () => {

    test.beforeEach(async ({ page }) => {
        await loginAs(page, 'admin');
        await page.goto('/knowledge');
    });

    test('should display knowledge base page', async ({ page }) => {
        await expect(page.getByText('Base de Conhecimento').first()).toBeVisible();
        await expect(page).toHaveScreenshot('knowledge-base-home.png', { fullPage: true });
    });

    test.describe('Knowledge Base CRUD Operations', () => {
        test('should create, update and delete an Article', async ({ page }) => {
            const timestamp = Date.now();
            const uniqueTitle = `Artigo de Teste E2E ${timestamp}`;
            const updatedTitle = `${uniqueTitle} - ATUALIZADO`;

            // Wait for elements to load
            await page.waitForTimeout(2000);

            // ========== CREATE ==========
            const createBtn = page.getByRole('button', { name: /novo|criar|adicionar|new/i }).first();
            await createBtn.click();

            const modal = page.locator('.MuiDialog-root, .MuiModal-root').first();
            await expect(modal).toBeVisible({ timeout: 5000 });
            await expect(page).toHaveScreenshot('knowledge-base-creation-modal.png', { fullPage: true });

            // Fill title
            await modal.locator('input[name="title"]').fill(uniqueTitle);

            // Fill content
            const contentInput = modal.locator('textarea[name="content"], textarea, .ql-editor, [contenteditable]').first();
            if (await contentInput.isVisible()) {
                await contentInput.fill('Conteúdo automatizado de Teste para E2E QA.');
            }

            // Submit
            const submitBtn = modal.getByRole('button', { name: /salvar|criar|publicar/i }).first();
            await submitBtn.click();

            // Verify success and modal close
            await expect(page.getByText(/sucesso|criado|publicado/i, { exact: false }).first()).toBeVisible({ timeout: 10000 });
            await expect(modal).not.toBeVisible();

            // Refresh to ensure it's in the list
            await page.reload();
            await page.waitForTimeout(2000);
            await expect(page).toHaveScreenshot('knowledge-base-list-with-new.png', { fullPage: true });

            // Searching for the article or finding it in the list (can be cards)
            const searchInput = page.locator('input[placeholder*="buscar" i], input[placeholder*="pesquis" i]').first();
            if (await searchInput.isVisible()) {
                await searchInput.fill(uniqueTitle);
                await page.waitForTimeout(1000);
            }

            // ========== UPDATE ==========
            // Base de conhecimento uses cards visually. Let's find the card or element by Text.
            const itemElement = page.locator('div, li, tr').filter({ hasText: uniqueTitle }).first();
            await expect(itemElement).toBeVisible({ timeout: 5000 });

            // Try clicking Edit directly or via Context Menu
            const editBtn = itemElement.getByRole('button', { name: /editar/i });
            if (await editBtn.isVisible()) {
                await editBtn.click();
            } else {
                await itemElement.getByRole('button', { name: /mais opções|more/i }).click();
                await page.getByRole('menuitem', { name: /editar/i }).click();
            }

            // Modal should open
            await expect(modal).toBeVisible({ timeout: 5000 });

            // Update title
            await modal.locator('input[name="title"]').fill(updatedTitle);
            await modal.getByRole('button', { name: /salvar|atualizar/i }).first().click();

            // Verify update
            await expect(page.getByText(/sucesso|atualizado/i, { exact: false }).first()).toBeVisible({ timeout: 10000 });
            await expect(modal).not.toBeVisible();

            // ========== DELETE ==========
            // Wait UI
            await page.waitForTimeout(1000);
            
            if (await searchInput.isVisible()) {
                // Clear the search field exactly
                await searchInput.clear();
                await page.waitForTimeout(1000);
                await searchInput.fill(updatedTitle);
                await page.waitForTimeout(1500); // Give backend more time to debounce & fetch
            }

            const updatedElement = page.locator('div, li, tr').filter({ hasText: updatedTitle }).first();
            await expect(updatedElement).toBeVisible({ timeout: 5000 });

            const deleteBtn = updatedElement.getByRole('button', { name: /excluir|deletar/i });
            if (await deleteBtn.isVisible()) {
                await deleteBtn.click();
            } else {
                await updatedElement.getByRole('button', { name: /mais opções|more/i }).click();
                await page.getByRole('menuitem', { name: /excluir|deletar/i }).click();
            }

            // Acknowledge Confirmation Dialog or Undo Toast
            const confirmBtn = page.getByRole('button', { name: /confirmar|sim|excluir/i }).filter({ hasText: /confirmar|sim|excluir/i }).first();
            if (await confirmBtn.isVisible({ timeout: 2000 })) {
                await confirmBtn.click();
            }

            // Verify Deletion
            await expect(page.getByText(/sucesso|excluído|removido/i, { exact: false }).first()).toBeVisible({ timeout: 10000 });
            await expect(updatedElement).not.toBeVisible();
        });
    });
});
