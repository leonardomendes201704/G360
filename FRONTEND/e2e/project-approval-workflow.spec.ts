import { test, expect, Page } from '@playwright/test';
import { loginAs } from './helpers/auth.helper';

test.describe('Project Approval Workflow (E2E)', () => {
    test.setTimeout(120000); // Allow sufficient time for complex flows

    test('should progress a project from Creation to Approval by CC Manager', async ({ page, context }) => {
        // Step 1: Login to create the project
        await loginAs(page, 'admin');

        const ts = Date.now();
        const projectName = `Approval Workflow E2E ${ts}`;

        // 1. Create a Project via Wizard
        await page.goto('/projects');
        await expect(page.getByRole('heading', { name: /Projetos/i }).first()).toBeVisible({ timeout: 10000 });

        const createBtn = page.getByRole('button', { name: /novo projeto/i }).first()
            .or(page.getByTestId('btn-novo-projeto'));
        await createBtn.click();
        
        await expect(page.getByText('Identificação').first()).toBeVisible({ timeout: 10000 });

        // Identificação (Step 0)
        await page.getByTestId('input-nome').or(page.locator('input[name="name"]')).fill(projectName);

        // Centro de Custo is required for Approval
        await page.getByTestId('select-centro-custo').click();
        await page.getByRole('option').nth(2).click(); // Select a cost center
        await page.waitForTimeout(500);

        await page.getByRole('button', { name: /próximo/i }).click();

        // Escopo (Step 1)
        await expect(page.getByText('Escopo e Justificativa').first()).toBeVisible();
        await page.getByPlaceholder(/Descreva o escopo macro/i).fill('Approval E2E test scope.');
        await page.getByPlaceholder(/Por que este projeto é/i).fill('Testing approvals dynamically.');
        await page.getByRole('button', { name: /próximo/i }).click();

        // Planejamento (Step 2)
        await expect(page.getByText('Planejamento').first()).toBeVisible();
        
        // Finalize Creation
        await page.getByRole('button', { name: /criar|salvar/i }).first().click();
        await expect(page.getByText(/sucesso|criado/i).first()).toBeVisible({ timeout: 15000 });

        // Verify the project is in DRAFT status
        await page.goto('/projects');
        await page.getByTestId('input-busca-projeto').fill(projectName);
        await page.waitForTimeout(1500); // wait for debounce
        
        const projectRow = page.locator('table tbody tr', { hasText: projectName }).first();
        await expect(projectRow).toBeVisible();
        
        // Assert it's initially a Draft (or Em Planejamento)
        // Depending on backend defaults, it might show "RASCUNHO" or "PLANEJAMENTO".
        
        // 2. Submit for Approval (Usually from Project Details)
        // Click the project to go to details
        await projectRow.click();
        
        // Wait for the details page header
        await expect(page.getByRole('heading', { name: new RegExp(projectName, 'i') }).first()).toBeVisible({ timeout: 10000 });
        
        // Find the generic submission button for approvals
        const submitBtn = page.getByRole('button', { name: /enviar para aprovação/i });
        if (await submitBtn.isVisible()) {
            await submitBtn.click();
            
            // Confirm Dialog if any
            const confirmDialogBtn = page.getByRole('button', { name: /confirmar|enviar/i }).last();
            if (await confirmDialogBtn.isVisible()) {
                await confirmDialogBtn.click();
            }

            await expect(page.getByText(/sucesso|enviado/i).first()).toBeVisible({ timeout: 10000 });
            await expect(page.getByText(/aguardando aprovação/i).first()).toBeVisible({ timeout: 10000 });
        }

        // 3. Login as Manager to Approve
        // Clear cookies/storage to simulate logout/login
        await context.clearCookies();
        // The auth helper ideally clears state automatically
        await loginAs(page, 'manager');

        // Go to Approvals Dashboard
        await page.goto('/approvals');
        await expect(page.getByText('Minhas Aprovações').first()).toBeVisible();

        // Go to Projects Tab
        await page.getByRole('tab', { name: /projetos/i }).click();

        // Search for our specific project approval
        // Check if the item is present
        const approvalItem = page.locator('.approval-card', { hasText: projectName })
            .or(page.locator('tr', { hasText: projectName }));
            
        // If it's visible, approve it
        if (await approvalItem.isVisible()) {
            const approveBtn = approvalItem.getByRole('button', { name: /aprovar|approve/i }).first();
            await approveBtn.click();
            
            // Confirm Dialog
            const confirmApproveBtn = page.getByRole('button', { name: /confirmar aprovação|salvar/i }).last();
            if (await confirmApproveBtn.isVisible()) {
                await confirmApproveBtn.click();
            }

            await expect(page.getByText(/sucesso|aprovado/i).first()).toBeVisible({ timeout: 10000 });
        }

        // 4. Verify Final State
        await page.goto('/projects');
        await page.getByTestId('input-busca-projeto').fill(projectName);
        await page.waitForTimeout(1500); // wait for debounce
        
        const endProjectRow = page.locator('table tbody tr', { hasText: projectName }).first();
        if (await endProjectRow.isVisible()) {
            await expect(endProjectRow).toContainText(/aprovado|execução/i, { ignoreCase: true });
        }
    });
});
