import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth.helper';

test.describe('Project Gantt (fullscreen route)', () => {
    test('loads Gantt page for a project (smoke)', async ({ page }) => {
        await loginAs(page, 'admin');
        await page.goto('/projects');
        await expect(page.getByTestId('tabela-projetos')).toBeVisible({ timeout: 30000 });

        const firstDataRow = page.locator('[data-testid="tabela-projetos"] tbody tr').first();
        await expect(firstDataRow).toBeVisible({ timeout: 15000 });
        await firstDataRow.click();

        await page.waitForURL(/\/projects\/[^/]+$/, { timeout: 30000 });
        const match = page.url().match(/\/projects\/([^/?]+)/);
        expect(match?.[1], 'project id from URL').toBeTruthy();
        const projectId = match![1];

        await page.goto(`/projects/${projectId}/gantt`);
        await expect(page.getByTestId('project-gantt-page')).toBeVisible({ timeout: 30000 });
        await expect(page.getByTestId('project-gantt-back')).toBeVisible();

        // Estado vazio (sem tarefas com datas) ou área do gráfico (classe da lib)
        const emptyOrChart = page
            .getByText(/Nenhuma tarefa com datas definidas/i)
            .or(page.locator('.gantt-container'));
        await expect(emptyOrChart.first()).toBeVisible({ timeout: 15000 });
    });
});
