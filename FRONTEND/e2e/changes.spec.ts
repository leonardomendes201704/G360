import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth.helper';
import { navigateTo } from './helpers/navigation.helper';

test.describe('GMUD: Gestão de Mudança', () => {

    test.beforeEach(async ({ page }) => {
        await loginAs(page, 'admin');
        await navigateTo(page, 'changes');
    });

    test('should display GMUD list page', async ({ page }) => {
        // Assert header
        await expect(page.getByText('Gestão de Mudança (GMUD)')).toBeVisible();

        // Should show stat cards initially
        const statCards = page.locator('.MuiPaper-root, .MuiCard-root, .MuiBox-root').filter({ hasText: 'Todas Pendentes' }).first();
        // Just verify basic presence of something on the page to confirm it loaded
        await expect(page.locator('.material-icons-round').first()).toBeVisible();
        await expect(page).toHaveScreenshot('changes-dashboard.png', { fullPage: true });
    });

    test.describe('GMUD CRUD Operations', () => {
        test('should create, update and delete a GMUD', async ({ page }) => {
            const timestamp = Date.now();
            const uniqueTitle = `Atualização de Servidor ${timestamp}`;
            const uniqueCode = `GMUD-${timestamp}`;
            const updatedTitle = `${uniqueTitle} - UPDATED`;

            // Set times (Start: tomorrow, End: day after tomorrow to avoid past dates)
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const dayAfter = new Date();
            dayAfter.setDate(dayAfter.getDate() + 2);

            const formatLocalStr = (d: Date) => {
                const pad = (n: number) => n.toString().padStart(2, '0');
                const yr = d.getFullYear();
                const mo = pad(d.getMonth() + 1);
                const da = pad(d.getDate());
                const ho = pad(d.getHours());
                const mi = pad(d.getMinutes());
                // format for datetime-local: yyyy-mm-ddThh:mm
                return `${yr}-${mo}-${da}T${ho}:${mi}`;
            };
            const startStr = formatLocalStr(tomorrow);
            const endStr = formatLocalStr(dayAfter);

            // Switch to LIST view so we can see rows
            // Wait for toggle buttons
            await page.getByRole('button', { name: /lista/i }).click();

            // ========== CREATE ==========
            await page.getByRole('button', { name: /nova gmud/i }).first().click();
            await expect(page.getByText('Nova Solicitação').first()).toBeVisible();
            await expect(page).toHaveScreenshot('changes-creation-wizard-step1.png', { fullPage: true });

            // Step 1: Visão Geral
            await page.locator('input[name="code"]').fill(uniqueCode);
            await page.locator('input[name="title"]').fill(uniqueTitle);
            await page.locator('textarea[name="description"]').fill('Descricao gerada via Teste E2E do Playwright');
            
            // Assistente: passos identificação → risco → escopo → planejamento
            await page.getByRole('button', { name: /próximo/i }).click();
            await page.waitForTimeout(300);
            await page.getByRole('button', { name: /próximo/i }).click();
            await page.waitForTimeout(300);
            await page.getByRole('button', { name: /próximo/i }).click();
            await page.waitForTimeout(400);

            // Último passo: planejamento
            
            await page.locator('input[name="scheduledStart"]').fill(startStr);
            await page.locator('input[name="scheduledEnd"]').fill(endStr);
            await page.locator('textarea[name="justification"]').fill('Justificativa para atualizar relatórios ERP automatizados');
            await page.locator('textarea[name="prerequisites"]').fill('Avisar time de NOC');
            await page.locator('textarea[name="testPlan"]').fill('Testar login no ERP após');
            await page.locator('textarea[name="backoutPlan"]').fill('Restaurar snapshot de backup do BD');

            // Submit
            await page.getByRole('button', { name: /criar gmud/i }).click();

            // Verify Creation
            await expect(page.getByText(/gmud criada/i)).toBeVisible({ timeout: 10000 });
            await expect(page.getByText(uniqueCode)).toBeVisible({ timeout: 10000 });
            await page.waitForTimeout(500); // UI stabilization
            await expect(page).toHaveScreenshot('changes-list-with-new.png', { fullPage: true });

            // ========== UPDATE ==========
            // Locate row in the list view
            // Some lists use tr, some use cards. If we toggled 'Lista', it should be a table row.
            const row = page.locator('tr').filter({ hasText: uniqueCode }).first();
            
            // Context Menu or direct action
            // In ChangeRequestsPage the list could be ChangeRequestList component. Let's look for an edit button inside the row
            const editBtn = row.getByRole('button', { name: /editar/i });
            if (await editBtn.isVisible()) {
                await editBtn.click();
            } else {
                // Try context menu inside row
                await row.getByRole('button', { name: /mais opções|more/i }).click();
                await page.getByRole('menuitem', { name: /editar/i }).click();
            }

            // The modal for Edit opens directly into Tabs instead of Wizard.
            await expect(page.getByText('Editar GMUD').first()).toBeVisible();
            await page.locator('input[name="title"]').fill(updatedTitle);
            await page.getByRole('button', { name: /salvar alterações/i }).click();

            // Verify Update
            await expect(page.getByText(/gmud atualizada/i)).toBeVisible({ timeout: 10000 });
            await expect(page.getByText(updatedTitle)).toBeVisible({ timeout: 10000 });

            // ========== DELETE ==========
            // Wait for grid to stabilize
            await page.waitForTimeout(1000);
            const updatedRow = page.locator('tr').filter({ hasText: updatedTitle }).first();
            
            const deleteBtn = updatedRow.getByRole('button', { name: /excluir/i });
            if (await deleteBtn.isVisible()) {
                await deleteBtn.click();
            } else {
                // Try context menu inside row
                await updatedRow.getByRole('button', { name: /mais opções|more/i }).click();
                await page.getByRole('menuitem', { name: /excluir/i }).click();
            }

            // Confirm inside ConfimDialog
            await page.getByRole('button', { name: /confirmar|sim|excluir/i }).filter({ hasText: /confirmar|sim|excluir/i }).first().click();

            // Verify Deletion
            await expect(page.getByText(/gmud excluida/i)).toBeVisible({ timeout: 10000 });
            await expect(page.getByText(uniqueCode)).not.toBeVisible();
        });
    });

});
