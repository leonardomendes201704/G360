import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth.helper';
import { navigateTo } from './helpers/navigation.helper';

// Helper to generate a valid CNPJ for testing
function generateValidCNPJ() {
    const n = () => Math.floor(Math.random() * 9);
    let n1 = n(), n2 = n(), n3 = n(), n4 = n(), n5 = n(), n6 = n(), n7 = n(), n8 = n(), n9 = 0, n10 = 0, n11 = 0, n12 = 1;
    let d1 = n12*2+n11*3+n10*4+n9*5+n8*6+n7*7+n6*8+n5*9+n4*2+n3*3+n2*4+n1*5;
    d1 = 11 - (d1 % 11);
    if (d1 >= 10) d1 = 0;
    let d2 = d1*2+n12*3+n11*4+n10*5+n9*6+n8*7+n7*8+n6*9+n5*2+n4*3+n3*4+n2*5+n1*6;
    d2 = 11 - (d2 % 11);
    if (d2 >= 10) d2 = 0;
    const raw = `${n1}${n2}${n3}${n4}${n5}${n6}${n7}${n8}${n9}${n10}${n11}${n12}${d1}${d2}`;
    return raw.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

test.describe('Fornecedores: Supplier Management CRUD', () => {

    test.beforeEach(async ({ page }) => {
        page.on('response', async response => {
            if (response.url().includes('/suppliers') && response.request().method() === 'POST') {
                try {
                    const text = await response.text();
                    console.log('SUPPLIER POST API RESPONSE:', response.status(), text);
                } catch (e) {}
            }
        });
        await loginAs(page, 'admin');
        await navigateTo(page, 'suppliers');
    });

    test('should display suppliers page header', async ({ page }) => {
        await expect(page.getByText(/gestão de fornecedores|fornecedores/i).first()).toBeVisible();
        await expect(page).toHaveScreenshot('suppliers-dashboard.png', { fullPage: true });
    });

    test.describe('Supplier CRUD Operations', () => {
        test('should create, update and delete a supplier', async ({ page }) => {
            const timestamp = Date.now();
            const uniqueName = `Fornecedor Teste E2E ${timestamp}`;
            const uniqueDocument = generateValidCNPJ();
            const updatedName = `${uniqueName} - UPDATED`;

            // Wait for grid/table to stabilize
            await page.waitForTimeout(1000);

            // ========== CREATE ==========
            const createBtn = page.getByRole('button', { name: /novo|criar|adicionar/i }).first();
            await createBtn.click();

            const modal = page.locator('.MuiDialog-root, .MuiModal-root').first();
            await expect(modal).toBeVisible();
            await expect(page).toHaveScreenshot('suppliers-creation-modal.png', { fullPage: true });

            // Fill all fields to avoid backend rejecting null values
            await page.locator('input[name="name"]').first().fill(uniqueName);
            await page.locator('input[name="tradeName"]').first().fill('Fantasia Teste E2E');
            
            await page.locator('input[name="document"]').first().pressSequentially(uniqueDocument, { delay: 10 });
            
            // Address
            await page.locator('input[name="zipCode"]').first().fill('00000-000');
            await page.locator('input[name="address"]').first().fill('Rua Teste Backend Null Bug, 123');
            // We use standard input for state and city by avoiding the BR selection if possible, but default is Brasil
            await page.locator('select[name="state"]').first().selectOption('SP');
            // Wait for cities to load based on state SP
            await page.waitForTimeout(500); 
            await page.locator('select[name="city"]').first().selectOption('São Paulo');

            // Contact
            await page.locator('input[name="contactName"]').first().fill('Sr. Teste Contato');
            await page.locator('input[name="email"]').first().fill(`contato_${timestamp}@teste.com`);
            await page.locator('input[name="phone"]').first().fill('11999999999');

            // Bank
            await page.locator('select[name="bankName"]').first().selectOption('001');
            await page.locator('select[name="bankAccountType"]').first().selectOption('CORRENTE');
            await page.locator('input[name="bankAgency"]').first().fill('1234');
            await page.locator('input[name="bankAccount"]').first().fill('12345-6');

            // Notes
            await page.locator('textarea[name="notes"]').first().fill('Test notes avoiding null');

            // Save
            await modal.getByRole('button', { name: /salvar|criar/i }).first().click();

            // Verify Creation
            try {
                await expect(page.getByText(/sucesso|criado/i).first()).toBeVisible({ timeout: 5000 });
            } catch (e) {
                // If it fails, take a screenshot of the top of the modal
                await modal.locator('input[name="name"]').first().scrollIntoViewIfNeeded();
                await page.waitForTimeout(500);
                await modal.screenshot({ path: 'modal-error.png' });
                throw e;
            }

            await expect(page.getByText(uniqueName).first()).toBeVisible({ timeout: 10000 });
            await page.waitForTimeout(500); // UI estibilization
            await expect(page).toHaveScreenshot('suppliers-list-with-new.png', { fullPage: true });

            // ========== UPDATE ==========
            await page.waitForTimeout(1000);

            const row = page.locator('tr, .MuiDataGrid-row').filter({ hasText: uniqueName }).first();
            await expect(row).toBeVisible({ timeout: 10000 });

            const editBtn = row.getByRole('button', { name: /editar/i }).or(row.locator('.material-icons-round').filter({ hasText: 'edit' }));
            if (await editBtn.first().isVisible()) {
                await editBtn.first().click();
            } else {
                await row.getByRole('button', { name: /mais opções|more/i }).click();
                await page.getByRole('menuitem', { name: /editar/i }).click();
            }

            // Edit Modal Open
            await expect(modal).toBeVisible();
            await page.locator('input[name="name"], input[name="razaoSocial"]').first().fill(updatedName);
            await modal.getByRole('button', { name: /salvar alterações|salvar/i }).first().click();

            // Verify Update
            await expect(page.getByText(/sucesso|atualizado/i).first()).toBeVisible({ timeout: 10000 });
            await expect(page.getByText(updatedName).first()).toBeVisible({ timeout: 10000 });

            // ========== DELETE ==========
            await page.waitForTimeout(1000);
            const updatedRow = page.locator('tr, .MuiDataGrid-row').filter({ hasText: updatedName }).first();
            
            // Click Delete (Trigger delete-with-undo)
            const deleteBtn = updatedRow.getByRole('button', { name: /excluir/i }).or(updatedRow.locator('.material-icons-round').filter({ hasText: 'delete' }));
            if (await deleteBtn.first().isVisible()) {
                await deleteBtn.first().click();
            } else {
                await updatedRow.getByRole('button', { name: /mais opções|more/i }).click();
                await page.getByRole('menuitem', { name: /excluir/i }).click();
            }

            // Verify Deletion (Undo toast or success)
            await expect(page.getByText(/excluído/i).first()).toBeVisible({ timeout: 10000 });
            await expect(page.getByText(updatedName).first()).not.toBeVisible();
        });
    });

});
