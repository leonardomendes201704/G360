import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth.helper';
import { navigateTo } from './helpers/navigation.helper';

test.describe('Finance: OBZ and Expenses', () => {

    test.describe('Finance Dashboard', () => {

        test.beforeEach(async ({ page }) => {
            await loginAs(page, 'admin');
            await navigateTo(page, 'finance');
        });

        test('should display finance page header', async ({ page }) => {
            await expect(
                page.getByText(/gestão financeira|financeiro|orçamento/i).first()
            ).toBeVisible();
        });

        test('should display finance subtitle', async ({ page }) => {
            await expect(
                page.getByText(/controle|orçamento|despesas|fluxo|caixa|gerenciamento/i).first()
            ).toBeVisible();
        });

        test('should display tab navigation', async ({ page }) => {
            // Tabs usam data-testid="tab-{id}" onde id é numérico (0, 1, 2...)
            await expect(page.getByTestId('tab-0')).toBeVisible();
        });

        test('should navigate to expenses tab', async ({ page }) => {
            // Tab 1 = Despesas e Contas
            const expensesTab = page.getByTestId('tab-1');
            await expensesTab.click();
            await page.waitForTimeout(500);

            // Should show expenses content
            await expect(page.getByText(/despesa|conta/i).first()).toBeVisible();
            await expect(page).toHaveScreenshot('finance-expenses-tab.png', { fullPage: true });
        });

    });

});
