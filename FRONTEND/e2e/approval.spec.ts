import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth.helper';

test.describe('ERP Core: My Approvals', () => {

    test.beforeEach(async ({ page }) => {
        // Log in as manager, since managers generally handle approvals
        await loginAs(page, 'manager');
    });

    test('should access and render the approvals dashboard correctly', async ({ page }) => {
        // Navigate to Approvals page
        await page.goto('/approvals');
        await expect(page.getByText('Minhas Aprovações').first()).toBeVisible();

        // Verify summary cards are visible (All tabs)
        await expect(page.getByText('Despesas', { exact: true }).first()).toBeVisible();
        await expect(page.getByText('Custos Projeto').first()).toBeVisible();
        await expect(page.getByText('GMUDs').first()).toBeVisible();
        await expect(page.getByText('Projetos').first()).toBeVisible();

        // Verify that the empty state or the list renders properly
        // Depending on DB state, there might be approvals or an empty state.
        const emptyState = page.getByText('Nenhuma aprovação pendente');
        const listContainer = page.locator('button[title="Aprovar"]').first();

        // One of them must be visible
        await expect(emptyState.or(listContainer)).toBeVisible({ timeout: 10000 });
    });
});
