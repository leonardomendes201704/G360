import { test, expect, Page } from '@playwright/test';
import { loginAs } from './helpers/auth.helper';

// Usa exatamente a mesma lógica comprovada em projects.spec.ts
async function createProjectHelper(page: Page) {
    const ts = Date.now();
    const uniqueName = `Projeto Lifecycle E2E ${ts}`;

    await page.goto('/projects');
    await expect(page.getByRole('heading', { name: /Projetos/i }).first()).toBeVisible({ timeout: 10000 });

    // Abrir Wizard
    const createBtn = page.getByRole('button', { name: /novo projeto/i }).first()
        .or(page.getByTestId('btn-novo-projeto'));
    await createBtn.click();
    await expect(page.getByText('Identificação').first()).toBeVisible({ timeout: 10000 });

    // Step 0: Identificação
    const nameInput = page.getByTestId('input-nome').or(page.locator('input[name="name"]'));
    await nameInput.fill(uniqueName);

    // Tipo (MUI Autocomplete)
    const typeSelectInput = page.getByTestId('select-tipo').locator('input').first();
    await typeSelectInput.fill('Interno');
    await typeSelectInput.press('ArrowDown');
    await typeSelectInput.press('Enter');

    // Centro de Custo
    await page.getByTestId('select-centro-custo').click();
    await page.getByRole('option').nth(1).click();
    await page.waitForTimeout(100);

    // Gerente (se habilitado)
    const managerSelect = page.getByTestId('select-gerente');
    if (await managerSelect.isEnabled()) {
        await managerSelect.click();
        await page.getByRole('option').nth(1).click();
    }

    // Tech Lead
    await page.getByTestId('select-tech-lead').click();
    await page.getByRole('option').nth(1).click();

    await page.getByRole('button', { name: /próximo/i }).click();

    // Step 1: Escopo
    await expect(page.getByText('Escopo e Justificativa').first()).toBeVisible({ timeout: 10000 });
    await page.getByPlaceholder(/Descreva o escopo macro/i).fill('Escopo E2E lifecycle.');
    await page.getByPlaceholder(/Por que este projeto é/i).fill('Justificativa E2E lifecycle.');
    await page.getByRole('button', { name: /próximo/i }).click();

    // Step 2: Planejamento
    await expect(page.getByText('Planejamento').first()).toBeVisible({ timeout: 10000 });
    const today = new Date().toISOString().split('T')[0];
    const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    await page.getByTestId('input-inicio').fill(today);
    await page.getByTestId('input-termino').fill(future);
    if (await page.locator('input[name="budget"]').isVisible()) {
        await page.locator('input[name="budget"]').fill('30000');
    }

    await page.getByRole('button', { name: /criar|salvar/i }).first().click();
    await expect(page.getByText(/sucesso|criado|salvo/i).first()).toBeVisible({ timeout: 15000 });

    return uniqueName;
}

test.describe('Project Lifecycle: Creation & Task Management', () => {
    test.setTimeout(120000);

    test('should create a project via Wizard successfully', async ({ page }) => {
        await loginAs(page, 'admin');
        const projectName = await createProjectHelper(page);

        // Verificar que aparece na lista após a criação
        await page.waitForTimeout(2000);
        await expect(page.getByText(projectName).first()).toBeVisible({ timeout: 10000 });
        await expect(page).toHaveScreenshot('project-lifecycle-list-after-creation.png', { fullPage: true });
    });

    test('should display the projects list correctly', async ({ page }) => {
        await loginAs(page, 'admin');
        await page.goto('/projects');
        await expect(page.getByRole('heading', { name: /Projetos/i }).first()).toBeVisible({ timeout: 10000 });

        // Lista ou estado vazio devem ser visíveis
        await page.waitForTimeout(2000);
        const hasList = await page.locator('table tbody tr').first().isVisible().catch(() => false);
        const hasEmptyState = await page.getByText(/nenhum projeto|nenhuma|cadastrar|novo projeto/i).first().isVisible().catch(() => false);
        expect(hasList || hasEmptyState).toBeTruthy();
        await expect(page).toHaveScreenshot('project-lifecycle-projects-list.png', { fullPage: true });
    });
});
