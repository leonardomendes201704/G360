import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth.helper';
import { navigateTo } from './helpers/navigation.helper';

test.describe('Assets: Asset Management', () => {

    test.describe('Asset List', () => {

        test.beforeEach(async ({ page }) => {
            await loginAs(page, 'admin');
            await navigateTo(page, 'assets');
        });

        test('should display assets page header', async ({ page }) => {
            await expect(
                page.getByText(/gestão de ativos/i)
            ).toBeVisible();
        });

        test('should display assets list or table', async ({ page }) => {
            // Check for any content on the page (dashboard view is default)
            await expect(
                page.getByText(/total de ativos|distribuição|categoria/i).first()
            ).toBeVisible();
            await expect(page).toHaveScreenshot('assets-dashboard-view.png', { fullPage: true });
        });

        test('should have create asset button', async ({ page }) => {
            const createButton = page.getByTestId('btn-novo-ativo');
            await expect(createButton).toBeVisible();
        });

    });

    test.describe('Asset CRUD Operations', () => {

        test.beforeEach(async ({ page }) => {
            await loginAs(page, 'admin');
            await navigateTo(page, 'assets');
            
            // Switch to the 'List / Hardware' tab where the 'Novo Ativo' button is immediately visible in both views
            // Wait, actually the button is visible in both views, but table is in 'list' mode
            await page.getByRole('button', { name: /hardware/i }).click();
        });

        test('should create, update and delete a Hardware Asset', async ({ page }) => {
            const timestamp = Date.now();
            const uniqueCode = `PAT-${timestamp}`;
            const uniqueName = `MacBook Pro ${timestamp}`;
            const updatedName = `${uniqueName} - UPDATED`;
            const uniqueCategory = `Notebooks ${timestamp}`;

            // ========== CREATE ==========
            await page.getByTestId('btn-novo-ativo').click();
            await expect(page.getByText('Novo Ativo').first()).toBeVisible();
            await expect(page).toHaveScreenshot('assets-creation-modal.png', { fullPage: true });

            await page.locator('input[name="code"]').fill(uniqueCode);
            await page.locator('input[name="name"]').fill(uniqueName);

            // Create new category inline
            const createCategoryBtn = page.getByRole('button', { name: /criar nova opção/i });
            await createCategoryBtn.click();
            await page.getByPlaceholder('Nome da nova opção...').fill(uniqueCategory);
            // Wait for hydration or rendering issues
            await page.waitForTimeout(500);
            await page.keyboard.press('Enter');
            
            // Wait for category to save on backend
            await page.waitForTimeout(1000);

            // Save Asset
            await page.getByRole('button', { name: /salvar ativo/i }).click();
            
            // Verify creation via Snackbar and List
            await expect(page.getByText(/ativo criado/i)).toBeVisible({ timeout: 10000 });
            await expect(page.getByText(uniqueCode)).toBeVisible({ timeout: 10000 });
            await expect(page).toHaveScreenshot('assets-list-with-new.png', { fullPage: true });

            // ========== UPDATE ==========
            // Locate the row using the unique code
            const row = page.locator('tr').filter({ hasText: uniqueCode }).first();
            
            // Click Edit button inside that row
            await row.getByRole('button', { name: /editar/i }).click();
            await expect(page.getByText('Editar Ativo')).toBeVisible();
            
            // Update name
            await page.locator('input[name="name"]').clear();
            await page.locator('input[name="name"]').fill(updatedName);
            await page.getByRole('button', { name: /salvar ativo/i }).click();

            // Verify update
            await expect(page.getByText(/ativo atualizado/i)).toBeVisible({ timeout: 10000 });
            await expect(page.getByText(updatedName)).toBeVisible({ timeout: 10000 });

            // ========== DELETE ==========
            // The row text changed to updatedName
            const updatedRow = page.locator('tr').filter({ hasText: updatedName }).first();
            
            // Open Context Menu (Mais opções)
            await updatedRow.getByRole('button', { name: /mais opcoes/i }).click();
            
            // Click Excluir in the Menu
            await page.getByRole('menuitem', { name: /excluir/i }).click();

            // Verify deletion - In ITBM frontend, `useUndoToast` is used so it disappears instantly
            await expect(page.getByText(/ativo excluído/i)).toBeVisible({ timeout: 10000 });
            await expect(page.getByText(updatedName)).not.toBeVisible();
        });
    });

});
