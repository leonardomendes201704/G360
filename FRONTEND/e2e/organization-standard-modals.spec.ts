import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth.helper';
import { navigateTo } from './helpers/navigation.helper';
import { installApiMocksForOrganizationStandardModals } from './helpers/mock-api-for-config-pages';

/**
 * Evidência visual: modais de organização em StandardModal (Ano Fiscal, Perfil, Usuário, Empresa).
 * Com mocks de API — não exige backend.
 */
test.describe('Organização: modais StandardModal (US-022)', () => {
    test('Ano Fiscal — Novo Ano Fiscal', async ({ page }) => {
        await installApiMocksForOrganizationStandardModals(page);
        await loginAs(page, 'manager');
        await navigateTo(page, 'config');

        await page.getByTestId('org-tab-fiscal').click();
        await page.waitForTimeout(300);

        await page.getByTestId('fiscal-year-add').click();

        const fiscalDialog = page.getByRole('dialog');
        await expect(fiscalDialog.getByText('Novo Ano Fiscal')).toBeVisible();
        await expect(fiscalDialog.getByText('Período contábil')).toBeVisible();

        await expect(page).toHaveScreenshot('org-modal-fiscal-year-shell.png', { fullPage: true });
    });

    test('Perfis — Novo Perfil de Governança', async ({ page }) => {
        await installApiMocksForOrganizationStandardModals(page);
        await loginAs(page, 'manager');
        await navigateTo(page, 'config');

        await page.getByTestId('org-tab-perfis').click();
        await page.waitForTimeout(300);

        await page.getByTestId('role-add').click();

        const roleDialog = page.getByRole('dialog');
        await expect(roleDialog.getByText('Novo Perfil de Governança')).toBeVisible();
        await expect(roleDialog.getByText('Matriz de permissões', { exact: true })).toBeVisible();

        await expect(page).toHaveScreenshot('org-modal-role-shell.png', { fullPage: true });
    });

    test('Usuários — Novo Usuário Local', async ({ page }) => {
        await installApiMocksForOrganizationStandardModals(page);
        await loginAs(page, 'manager');
        await navigateTo(page, 'config');

        await page.getByTestId('org-tab-usuarios').click();
        await page.waitForTimeout(300);

        await page.getByTestId('user-add-local').click();

        const userDialog = page.getByRole('dialog');
        await expect(userDialog.getByText('Novo Usuário Local')).toBeVisible();
        await expect(userDialog.getByText('Conta e permissões')).toBeVisible();

        await expect(page).toHaveScreenshot('org-modal-user-shell.png', { fullPage: true });
    });

    test('Empresas (Super Admin) — Nova Empresa', async ({ page }) => {
        await installApiMocksForOrganizationStandardModals(page);
        await loginAs(page, 'admin');
        await page.goto('/config/organization');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(300);

        await expect(page.getByTestId('org-tab-tenants')).toBeVisible();

        await page.getByTestId('tenant-add').click();

        const tenantDialog = page.getByRole('dialog');
        await expect(tenantDialog.getByText('Nova Empresa')).toBeVisible();
        await expect(tenantDialog.getByText('Dados da empresa e administrador')).toBeVisible();

        await expect(page).toHaveScreenshot('org-modal-tenant-shell.png', { fullPage: true });
    });
});
