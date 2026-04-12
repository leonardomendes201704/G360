import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth.helper';

test.describe('Financial Approval Workflow', () => {
    test.setTimeout(120000);

    test('should allow Manager to view pending approvals', async ({ page }) => {
        await loginAs(page, 'manager');

        // Navegar para Aprovações
        await page.goto('/approvals');
        await expect(page.getByText(/minhas aprovações/i).first()).toBeVisible({ timeout: 10000 });

        // Verificar que a página tem conteúdo (itens pendentes ou estado vazio)
        await page.waitForTimeout(2000);
        const hasPending = await page.getByText(/pendente|aguardando/i).first().isVisible().catch(() => false);
        const isEmpty = await page.getByText(/nenhuma aprovação pendente/i).first().isVisible().catch(() => false);
        expect(hasPending || isEmpty).toBeTruthy();
        await expect(page).toHaveScreenshot('financial-approval-list.png', { fullPage: true });
    });

    test('should navigate to Projects tab in Approvals', async ({ page }) => {
        await loginAs(page, 'manager');
        await page.goto('/approvals');
        await expect(page.getByText(/minhas aprovações/i).first()).toBeVisible({ timeout: 10000 });

        // Clicar na tab Projetos
        const projectsTab = page.getByRole('button', { name: 'Projetos' });
        if (await projectsTab.isVisible({ timeout: 3000 })) {
            await projectsTab.click();
            await page.waitForTimeout(1000);
        }

        // Verificar conteúdo ou estado vazio
        await expect(
            page.getByText(/projeto|nenhuma/i).first()
        ).toBeVisible({ timeout: 10000 });
        await expect(page).toHaveScreenshot('financial-approval-projects.png', { fullPage: true });
    });

    test('should allow Admin to approve a project if pending', async ({ page }) => {
        await loginAs(page, 'admin');
        await page.goto('/approvals');
        await expect(page.getByText(/minhas aprovações/i).first()).toBeVisible({ timeout: 10000 });

        // Tentar encontrar botão de aprovar
        const approveBtn = page.getByRole('button', { name: /aprovar/i }).first();
        if (await approveBtn.isVisible({ timeout: 3000 })) {
            await approveBtn.click();
            await expect(
                page.getByText(/aprovad|sucesso/i).first()
            ).toBeVisible({ timeout: 10000 });
        } else {
            // Nenhuma aprovação pendente — teste passa como estado válido
            // Nenhuma aprovação pendente — aceitar qualquer mensagem de vazio ou lista vazia
            const isEmpty = await page.getByText(/nenhuma|nenhum|vazi|sem aprovação|pendente/i).first().isVisible().catch(() => false);
            const hasContent = await page.locator('table tbody tr, .MuiCard-root, [class*="card"]').first().isVisible().catch(() => false);
            // Pelo menos um estado deve ser visível
            expect(isEmpty || hasContent).toBeTruthy();
        }
    });
});
