import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth.helper';

test.describe('Risks CRUD Operations', () => {
    test.setTimeout(120000);

    test.beforeEach(async ({ page }) => {
        await loginAs(page, 'admin');
    });

    test('should create, update and delete a Risk', async ({ page }) => {
        const uniqueSuffix = Date.now().toString();
        const testName = `Risco E2E Automatizado ${uniqueSuffix}`;
        const updatedName = `${testName} - ATUALIZADO`;

        // Configure slow mo approach for MUI interactions
        await page.goto('/risks');
        await expect(page.getByText(/Gestão de Riscos Corporativos/i).first()).toBeVisible({ timeout: 15000 });
        await expect(page).toHaveScreenshot('risks-dashboard.png', { fullPage: true });

        // Change view to LIST view
        const listViewBtn = page.getByRole('button').filter({ has: page.locator('svg[data-testid="ListIcon"]') }).first();
        if (await listViewBtn.isVisible()) {
            await listViewBtn.click();
            await page.waitForTimeout(1000);
        }

        // ========== CREATE ==========
        const createBtn = page.getByRole('button', { name: /Novo Risco/i }).first();
        await expect(createBtn).toBeVisible({ timeout: 5000 });
        await createBtn.click();

        // Step 1: Identificação
        const modalDialog = page.getByRole('dialog').first();
        await expect(modalDialog).toBeVisible({ timeout: 5000 });

        // Fill Title
        const titleInput = modalDialog.locator('input[placeholder*="Resumo curto" i], input[type="text"]').first();
        await titleInput.fill(testName);

        // Selecionar os elementos do Step 1 (Ativo)
        const activeStep1 = modalDialog.locator('.wizard-step.active');
        
        // Select Department (Required to unlock Cost Centers)
        const deptSelect = activeStep1.locator('select').nth(0);
        await expect(deptSelect.locator('option').nth(1)).toBeAttached({ timeout: 10000 });
        await deptSelect.selectOption({ index: 1 });
        await page.waitForTimeout(1000); // Wait for Cost Centers to fetch/unlock

        // Select Cost Center
        const ccSelect = activeStep1.locator('select').nth(1);
        await expect(ccSelect).toBeEnabled({ timeout: 5000 });
        await expect(ccSelect.locator('option').nth(1)).toBeAttached({ timeout: 10000 });
        await ccSelect.selectOption({ index: 1 });

        const descTextarea = activeStep1.locator('textarea').first();
        await descTextarea.fill('Descrição automatizada de risco crítico para validação do CRUD via Playwright.');

        // Next Step
        const nextBtn = modalDialog.getByRole('button', { name: /Próximo/i });
        await nextBtn.click();
        await page.waitForTimeout(500);

        // Selecionar os elementos do Step 2 (Novo Ativo)
        const activeStep2 = modalDialog.locator('.wizard-step.active');

        // Step 2: Avaliação
        const catSelect = activeStep2.locator('select').nth(0);
        await catSelect.selectOption('SEGURANCA');

        const probSelect = activeStep2.locator('select').nth(1);
        await probSelect.selectOption('4'); // Muito Alta

        const impactSelect = activeStep2.locator('select').nth(2);
        await impactSelect.selectOption('4'); // Crítico

        const saveBtn = modalDialog.getByRole('button', { name: /Concluir/i });
        await saveBtn.click();

        await expect(page.getByText(/sucesso|criado/i).first()).toBeVisible({ timeout: 10000 });
        await page.waitForTimeout(2000); // aguarda o fetch de reload fechar
        await expect(page).toHaveScreenshot('risks-list-with-new.png', { fullPage: true });

        // Find the newly created risk in the table
        // Ensure LIST mode is active (it might have switched back or persisted)
        if (await listViewBtn.isVisible()) {
            await listViewBtn.click();
        }

        // Search for it to filter the table
        const searchInput = page.getByPlaceholder(/Buscar por título/i).first();
        await searchInput.clear();
        await page.waitForTimeout(500);
        await searchInput.fill(testName);
        await searchInput.press('Enter');
        await page.waitForTimeout(2000);

        const riskItem = page.locator('div, li, tr').filter({ hasText: testName }).first();
        await expect(riskItem).toBeVisible({ timeout: 5000 });

        // ========== UPDATE ==========
        // Since RisksPage has inline actions
        const editBtn = riskItem.getByTestId('EditIcon').first().locator('..'); // targeting the button wrapping the SVG
        if (await editBtn.isVisible()) {
            await editBtn.click();
        } else {
             await riskItem.getByRole('button').filter({ has: page.locator('svg[data-testid="EditIcon"]') }).first().click();
        }

        await expect(modalDialog).toBeVisible({ timeout: 5000 });
        
        await titleInput.clear();
        await titleInput.fill(updatedName);

        // Advance to step 2 to save
        await nextBtn.click();
        await page.waitForTimeout(500);
        await saveBtn.click();

        await expect(page.getByText(/sucesso|atualizado/i).first()).toBeVisible({ timeout: 10000 });
        await page.waitForTimeout(2000);

        // ========== DELETE ==========
        await searchInput.clear();
        await page.waitForTimeout(500);
        await searchInput.fill(updatedName);
        await searchInput.press('Enter');
        await page.waitForTimeout(2000);

        const updatedRiskItem = page.locator('div, li, tr').filter({ hasText: updatedName }).first();
        await expect(updatedRiskItem).toBeVisible({ timeout: 5000 });

        const deleteBtn = updatedRiskItem.getByRole('button').filter({ has: page.locator('svg[data-testid="DeleteIcon"]') }).first();
        await deleteBtn.click();

        const confirmBtn = page.getByRole('button', { name: /confirmar|sim|excluir/i }).filter({ hasText: /confirmar|sim|excluir/i }).first();
        if (await confirmBtn.isVisible({ timeout: 2000 })) {
             await confirmBtn.click();
        } else {
             // For useUndoToast
        }

        await expect(page.getByText(/removido|excluído|sucesso/i).first()).toBeVisible({ timeout: 10000 });
    });
});
