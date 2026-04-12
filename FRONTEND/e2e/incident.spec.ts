import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth.helper';

test.describe('ITSM Core: Incident Management', () => {

    test.beforeEach(async ({ page }) => {
        // Login as 'manager' to test incident creation
        await loginAs(page, 'manager');
    });

    test('should create a new incident successfully', async ({ page }) => {
        // 1. Navigate to Incidents module
        await page.goto('/incidents');
        await expect(page.getByText('Gestão de Incidentes')).toBeVisible();

        // 2. Open 'Novo Incidente' Modal
        await page.getByRole('button', { name: /novo incidente/i }).click();
        await expect(page.getByText('Novo Incidente').first()).toBeVisible();
        await expect(page).toHaveScreenshot('incident-creation-modal.png', { fullPage: true });

        // 3. Fill the form
        const uniqueTitle = `System Outage Test ${Date.now()}`;
        await page.locator('input[name="title"]').fill(uniqueTitle);
        await page.locator('textarea[name="description"]').fill('Conexão com o banco de dados falhando intermitentemente na branch de produção.');

        // Select Impact & Urgency (they have default values, but we change them to be sure)
        await page.locator('select[name="impact"]').selectOption('CRITICO');
        await page.locator('select[name="urgency"]').selectOption('CRITICA');

        // Handling the Category (InlineCreateSelect uses MUI Autocomplete/Select)
        // Since the DB might be empty, we proactively create a new category using the "+" button
        const uniqueCategory = `Infraestrutura OCI ${Date.now()}`;
        await page.getByRole('button', { name: /criar nova opção/i }).click();
        await page.getByPlaceholder('Nome da nova opção...').fill(uniqueCategory);
        await page.keyboard.press('Enter');
        
        // Very small delay to let the API save the category
        await page.waitForTimeout(1000);

        // 4. Submit Form
        await page.getByRole('button', { name: /registrar incidente/i }).click();

        // 5. Assert Success Snackbar and Modal Close
        await expect(page.getByText(/incidente criado com sucesso|sucesso/i)).toBeVisible({ timeout: 10000 });
        await expect(page.getByText(uniqueTitle)).toBeVisible({ timeout: 10000 });

        // ========== UPDATE ==========
        // Wait for UI to stabilize
        await page.waitForTimeout(1000);
        
        const row = page.locator('tr').filter({ hasText: uniqueTitle }).first();
        await expect(row).toBeVisible({ timeout: 10000 });
        await expect(page).toHaveScreenshot('incident-list-with-new.png', { fullPage: true });

        // Click Edit
        const editBtn = row.getByRole('button', { name: /editar/i }).or(row.locator('.material-icons-round').filter({ hasText: 'edit' }));
        if (await editBtn.first().isVisible()) {
            await editBtn.first().click();
        } else {
            await row.getByRole('button', { name: /mais opções|more/i }).click();
            await page.getByRole('menuitem', { name: /editar/i }).click();
        }

        // Edit Modal Opens
        await expect(page.getByText(/editar incidente/i).first()).toBeVisible();
        await expect(page).toHaveScreenshot('incident-edit-modal.png', { fullPage: true });

        const updatedTitle = `${uniqueTitle} - UPDATED`;
        await page.locator('input[name="title"]').fill(updatedTitle);
        await page.getByRole('button', { name: /salvar alterações/i }).click();

        // Wait for modal to close (the header 'Editar Incidente' should disappear)
        await expect(page.getByText(/editar incidente/i).first()).not.toBeVisible({ timeout: 10000 });

        // Verify Update
        await expect(page.getByText(/incidente atualizado com sucesso|sucesso/i, { exact: false }).first()).toBeVisible({ timeout: 10000 });
        await expect(page.getByText(updatedTitle)).toBeVisible({ timeout: 10000 });

        // ========== DELETE ==========
        await page.waitForTimeout(1000);
        const updatedRow = page.locator('tr').filter({ hasText: updatedTitle }).first();
        
        // Incidents use BulkActionsBar. We need to check the row's checkbox first.
        await updatedRow.locator('input[type="checkbox"]').first().check({ force: true });
        
        // Wait for BulkActionsBar to appear at the top
        await expect(page.getByRole('button', { name: /excluir/i }).first()).toBeVisible({ timeout: 5000 });

        // Click Delete button on BulkActionsBar
        await page.getByRole('button', { name: /excluir/i }).click();

        // Incidents uses UndoToast. Wait for the Undo text, or just success.
        await expect(page.getByText(/incidente excluído|excluído/i, { exact: false })).toBeVisible({ timeout: 10000 });
        await expect(page.getByText(updatedTitle)).not.toBeVisible();
    });
});
