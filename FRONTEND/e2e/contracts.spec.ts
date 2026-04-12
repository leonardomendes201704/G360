import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth.helper';
import { navigateTo } from './helpers/navigation.helper';

test.describe('Contracts: Contract Management', () => {

    test.beforeEach(async ({ page }) => {
        page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));
        page.on('response', async response => {
            if (response.url().includes('/contracts') && response.request().method() === 'POST') {
                try {
                    const text = await response.text();
                    console.log('CONTRACT POST API RESPONSE:', response.status(), text);
                } catch (e) {}
            }
        });
        await loginAs(page, 'admin');
        await navigateTo(page, 'contracts');
    });

    test('should display contracts page header', async ({ page }) => {
        await expect(page.getByText(/gestão de contratos/i).first()).toBeVisible();
        await expect(page).toHaveScreenshot('contracts-dashboard.png', { fullPage: true });
    });

    test.describe('Contract CRUD Operations', () => {
        test('should create, update and delete a contract', async ({ page }) => {
            const timestamp = Date.now();
            const uniqueDescription = `E2E Test Contract ${timestamp}`;
            const updatedDescription = `${uniqueDescription} - UPDATED`;

            // Wait for grid/table to stabilize
            await page.waitForTimeout(1000);

            // ========== CREATE ==========
            await page.getByTestId('btn-novo-contrato').or(page.getByRole('button', { name: /novo contrato/i })).first().click();
            await expect(page.getByText('Preencha os dados do contrato').first()).toBeVisible();
            await expect(page).toHaveScreenshot('contracts-wizard-step1.png', { fullPage: true });

            // STEP 0: Identificação
            await page.getByLabel(/NÚMERO/i).click();
            await page.getByLabel(/NÚMERO/i).fill(`CTR-${timestamp}`);

            await page.getByLabel(/tipo de contrato/i).click();
            await page.getByRole('option', { name: /serviço/i }).click();

            await page.getByLabel(/fornecedor/i).first().click();
            const supplierOptions = page.getByRole('option');
            // Assuming there is at least one supplier. Skip 'Selecione...' if it's the first.
            if (await supplierOptions.nth(1).isVisible()) {
                await supplierOptions.nth(1).click();
            } else if (await supplierOptions.first().isVisible()) {
                await supplierOptions.first().click(); // Fallback
            }

            await page.getByLabel(/objeto do contrato/i).click();
            await page.getByLabel(/objeto do contrato/i).fill(uniqueDescription);
            
            await page.getByRole('button', { name: /próximo/i }).click();

            // STEP 1: Financeiro & Vigência
            await page.waitForTimeout(500); // Wait for transition
            await page.getByLabel(/valor mensal/i).click();
            await page.getByLabel(/valor mensal/i).fill('1500');
            
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const nextYear = new Date();
            nextYear.setFullYear(nextYear.getFullYear() + 1);

            const formatDate = (d: Date) => d.toISOString().split('T')[0];

            await page.getByLabel(/início vigência/i).fill(formatDate(tomorrow));
            await page.getByLabel(/fim vigência/i).fill(formatDate(nextYear));

            await page.getByRole('button', { name: /próximo/i }).click();

            // STEP 2: Classificação
            await expect(page.getByText('Classificação').first()).toBeVisible({ timeout: 5000 });
            await page.waitForTimeout(300);
            await page.getByRole('button', { name: /próximo/i }).click();

            // STEP 3: Documentos
            await expect(page.getByText('Documentos Anexados').first()).toBeVisible({ timeout: 5000 });
            await page.waitForTimeout(300);
            await page.getByRole('button', { name: /criar contrato/i }).click();

            // Verify Creation
            await expect(page.getByText('Contrato salvo com sucesso!', { exact: false })).toBeVisible({ timeout: 10000 });
            await page.waitForTimeout(500); // UI stabilization
            await expect(page).toHaveScreenshot('contracts-list-with-new.png', { fullPage: true });

            // ========== UPDATE ==========
            // Wait for grid to stabilize
            await page.waitForTimeout(1000);
            
            // Search or find the row
            const row = page.locator('tr').filter({ hasText: uniqueDescription }).first();
            
            // Wait until it appears
            await expect(row).toBeVisible({ timeout: 10000 });

            const editBtn = row.getByRole('button', { name: /editar/i }).or(row.locator('.material-icons-round').filter({ hasText: 'edit' }));
            if (await editBtn.first().isVisible()) {
                await editBtn.first().click();
            } else {
                await row.getByRole('button', { name: /mais opções|more/i }).click();
                await page.getByRole('menuitem', { name: /editar/i }).click();
            }

            // Edit Modal Opens
            await expect(page.getByText(/salvar alterações/i).first()).toBeVisible();

            // Expand Accordion if collapsed (Panel 1 - Identificação)
            const accordionHeader = page.getByText(/dados do contrato/i, { exact: true }).first();
            if (await accordionHeader.isVisible()) {
                await accordionHeader.click();
            }

            await page.getByLabel(/objeto do contrato/i).fill(updatedDescription);
            await page.getByRole('button', { name: /salvar alterações/i }).click();

            // Verify Update
            await expect(page.getByText(/atualizado com sucesso|sucesso/i)).toBeVisible({ timeout: 10000 });
            await expect(page.getByText(updatedDescription)).toBeVisible({ timeout: 10000 });

            // ========== DELETE ==========
            await page.waitForTimeout(1000); // stabilizing UI
            const updatedRow = page.locator('tr').filter({ hasText: updatedDescription }).first();
            
            const deleteBtn = updatedRow.getByRole('button', { name: /excluir/i }).or(updatedRow.locator('.material-icons-round').filter({ hasText: 'delete' }));
            if (await deleteBtn.first().isVisible()) {
                await deleteBtn.first().click();
            } else {
                await updatedRow.getByRole('button', { name: /mais opções|more/i }).click();
                await page.getByRole('menuitem', { name: /excluir/i }).click();
            }

            // Confirm Dialog
            await page.getByRole('button', { name: /confirmar|sim|excluir/i }).filter({ hasText: /confirmar|sim|excluir/i }).first().click();

            // Verify Deletion
            await expect(page.getByText(/excluído|sucesso/i)).toBeVisible({ timeout: 10000 });
            await expect(page.getByText(updatedDescription)).not.toBeVisible();
        });
    });

});
