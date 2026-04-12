import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth.helper';

test.describe('Problem Management (ITIL)', () => {

    test.beforeEach(async ({ page }) => {
        await loginAs(page, 'admin'); // Admin handles ITIL Problems
    });

    test('should list problems and render the page correctly', async ({ page }) => {
        await page.goto('/servicedesk/problems');
        
        // Assert header
        await expect(page.getByText('Gestão de Problemas (ITIL)')).toBeVisible({ timeout: 10000 });
        
        // Assert table header exists
        await expect(page.getByRole('columnheader', { name: 'Código' })).toBeVisible();
        await expect(page.getByRole('columnheader', { name: 'Título & Causa' })).toBeVisible();
    });

    test('should open creation modal and close it via cancel', async ({ page }) => {
        await page.goto('/servicedesk/problems');
        
        const declareBtn = page.getByRole('button', { name: 'Declarar Problema' });
        await expect(declareBtn).toBeVisible();
        await declareBtn.click();

        const modalTitle = page.getByText('Declarar Novo Problema Crônico');
        await expect(modalTitle).toBeVisible();

        const cancelBtn = page.getByRole('button', { name: 'Cancelar' });
        await cancelBtn.click();

        await expect(modalTitle).toBeHidden();
    });

    test('should create a problem successfully', async ({ page }) => {
        await page.goto('/servicedesk/problems');
        
        // Click Create
        await page.getByRole('button', { name: 'Declarar Problema' }).click();

        // Fill Data
        const uniqueString = `Problema E2E ${Date.now()}`;
        await page.getByLabel('Título Resumido').fill(uniqueString);
        await page.getByLabel('Descrição Evidência').fill('Evidência E2E automatizada pelo Playwright.');
        
        // Submit
        await page.getByRole('button', { name: 'Declarar' }).click();

        // Wait for modal to close
        await expect(page.getByText('Declarar Novo Problema Crônico')).toBeHidden({ timeout: 10000 });

        // Check if list refreshes and shows the new problem
        await page.waitForTimeout(1000); // Give React time to re-render row
        await expect(page.getByText(uniqueString).first()).toBeVisible({ timeout: 10000 });
    });
});
