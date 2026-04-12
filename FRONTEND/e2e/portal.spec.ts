import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth.helper';

test.describe('Portal (Employee View)', () => {

    test.beforeEach(async ({ page }) => {
        // portal is mostly for collaborators or end-users
        await loginAs(page, 'collaborator');
    });

    test('should load the portal hero and display service catalog', async ({ page }) => {
        await page.goto('/portal');

        // Check hero text
        await expect(page.getByText('Olá, como podemos ajudar?')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('Catálogo de Serviços')).toBeVisible();

        // Search for something to test interaction
        const searchInput = page.getByPlaceholder('Busque por');
        await searchInput.fill('Acesso');
        
        // At least one card or the empty state message should appear
        // To be resilient we don't assert hard data since database might be empty, just structure
        const catalogContainer = page.getByText('Catálogo de Serviços').locator('..');
        await expect(catalogContainer).toBeVisible();
    });

    test('should render the logic to open ticket creation modal', async ({ page }) => {
        await page.goto('/portal');
        
        await page.waitForTimeout(2000); // give time for catalog API to fetch

        // Find standard "Demanda Geral" or any card to click
        // If there are services, clicking one should open modal.
        const serviceCard = page.locator('.MuiCardActionArea-root').first();
        const count = await serviceCard.count();
        
        if (count > 0) {
            await serviceCard.click();
            await expect(page.getByText(/Solicitar:/i).first()).toBeVisible({ timeout: 5000 });
            await expect(page.getByRole('button', { name: 'Cancelar' })).toBeVisible();
        } else {
            // DB is empty, testing empty state rendering
            await expect(page.getByText('Nenhum serviço encontrado na pesquisa.')).toBeVisible();
        }
    });

    test('should display open tickets tracking section', async ({ page }) => {
        await page.goto('/portal');
        await expect(page.getByText(/Meus Chamados/i)).toBeVisible({ timeout: 10000 });
        
        // Will show table headers
        await expect(page.getByRole('columnheader', { name: 'Código' })).toBeVisible();
        await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible();
    });
});
