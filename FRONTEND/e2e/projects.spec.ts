import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth.helper';

test.describe('Projects CRUD Operations', () => {

    test.beforeEach(async ({ page }) => {
        await loginAs(page, 'admin');
        await page.goto('/projects');
    });

    test('should create, update and delete a Project', async ({ page }) => {
        const timestamp = Date.now();
        const uniqueName = `Projeto E2E Automatizado ${timestamp}`;
        const updatedName = `${uniqueName} - ATUALIZADO`;

        // Wait for page
        await expect(page.getByRole('heading', { name: /Projetos/i }).first()).toBeVisible({ timeout: 10000 });
        await expect(page).toHaveScreenshot('projects-dashboard.png', { fullPage: true });

        // ========== CREATE ==========
        const createBtn = page.getByRole('button', { name: /novo projeto/i }).first()
            .or(page.getByTestId('btn-novo-projeto'));
        await createBtn.click();

        // Step 0: Identificação
        await expect(page.getByText('Identificação').first()).toBeVisible();

        const nameInput = page.getByTestId('input-nome').or(page.locator('input[name="name"]'));
        await nameInput.fill(uniqueName);
        
        // Tipo
        const typeSelectInput = page.getByTestId('select-tipo').locator('input').first();
        await typeSelectInput.fill('Interno');
        await typeSelectInput.press('ArrowDown');
        await typeSelectInput.press('Enter');

        // Centro de Custo
        await page.getByTestId('select-centro-custo').click();
        await page.getByRole('option').nth(1).click();

        await page.waitForTimeout(100);

        // Gerente
        const managerSelect = page.getByTestId('select-gerente');
        if (await managerSelect.isEnabled()) {
            await managerSelect.click();
            await page.getByRole('option').nth(1).click();
        }

        // Tech Lead
        await page.getByTestId('select-tech-lead').click();
        await page.getByRole('option').nth(1).click();

        // Next Step
        await page.getByRole('button', { name: /próximo/i }).click();

        // Step 1: Escopo
        await expect(page.getByText('Escopo e Justificativa').first()).toBeVisible();
        await page.getByPlaceholder(/Descreva o escopo macro/i).fill('Descrição do Escopo Macro para testes E2E do projeto');
        await page.getByPlaceholder(/Por que este projeto é/i).fill('Justificativa para testes E2E');
        
        await page.getByRole('button', { name: /próximo/i }).click();

        // Step 2: Planejamento
        await expect(page.getByText('Planejamento').first()).toBeVisible();

        // Dates
        const today = new Date();
        const future = new Date();
        future.setDate(future.getDate() + 30);
        const formatDate = (d: Date) => d.toISOString().split('T')[0];
        
        await page.getByTestId('input-inicio').fill(formatDate(today));
        await page.getByTestId('input-termino').fill(formatDate(future));
        await page.locator('input[name="budget"]').fill('15000');

        // Submit
        await page.getByRole('button', { name: /criar|salvar/i }).first().click();

        // Verification
        await expect(page.getByText(/sucesso|criado|salvo/i).first()).toBeVisible({ timeout: 10000 });
        
        await page.goto('/projects');
        await page.waitForTimeout(2000);
        await expect(page).toHaveScreenshot('projects-list-with-new.png', { fullPage: true });

        // ========== UPDATE ==========
        // Find search
        const searchInput = page.getByTestId('input-busca-projeto')
            .or(page.locator('input[placeholder*="buscar" i], input[placeholder*="pesquis" i]')).first();
        
        if (await searchInput.isVisible()) {
            await searchInput.clear();
            await page.waitForTimeout(500);
            await searchInput.fill(uniqueName);
            await page.waitForTimeout(1500);
        }

        const projectItem = page.locator('div, li, tr').filter({ hasText: uniqueName }).first();
        await expect(projectItem).toBeVisible({ timeout: 5000 });

        const editBtn = projectItem.getByTitle(/Editar/i).first();
        await editBtn.click();

        await page.waitForTimeout(1000);
        const modalDialog = page.getByRole('dialog').first();
        const nameEditInput = modalDialog.locator('input[name="name"]');
        await nameEditInput.fill(updatedName);

        const saveBtn = page.getByRole('button', { name: /salvar|atualizar/i }).first();
        await saveBtn.click();
        
        await expect(page.getByText(/sucesso|atualizado/i).first()).toBeVisible({ timeout: 10000 });

        // ========== DELETE ==========
        await page.waitForTimeout(2000); // Wait for modal to close fully and table fetch to end

        const freshSearchInput = page.getByTestId('input-busca-projeto').first();
        await freshSearchInput.clear();
        await page.waitForTimeout(500);
        await freshSearchInput.fill(updatedName);
        await freshSearchInput.press('Enter');
        await page.waitForTimeout(3000); // aguarda a api carregar

        const updatedProject = page.locator('div, li, tr').filter({ hasText: updatedName }).first();
        await expect(updatedProject).toBeVisible({ timeout: 5000 });

        const deleteBtn = updatedProject.getByTitle(/Excluir/i).first();
        await deleteBtn.click();

        const confirmBtn = page.getByRole('button', { name: /confirmar|sim|excluir/i }).filter({ hasText: /confirmar|sim|excluir/i }).first();
        if (await confirmBtn.isVisible({ timeout: 2000 })) {
            await confirmBtn.click();
        }

        await expect(page.getByText(/sucesso|excluído|removido/i).first()).toBeVisible({ timeout: 10000 });
        await expect(updatedProject).not.toBeVisible();
    });
});
