import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth.helper';
import { navigateTo } from './helpers/navigation.helper';

test.describe('Approvals: Approval Workflow', () => {

    test.describe('Pending Approvals', () => {

        test.beforeEach(async ({ page }) => {
            await loginAs(page, 'manager');
            await navigateTo(page, 'approvals');
        });

        test('should display approvals page header', async ({ page }) => {
            await expect(
                page.getByText(/minhas aprovações/i).first()
            ).toBeVisible();
        });

        test('should display category filters', async ({ page }) => {
            await expect(
                page.getByRole('button', { name: /todas/i }).or(page.getByText(/todas/i))
            ).toBeVisible();
        });

        test('should display pending items or empty message', async ({ page }) => {
            await expect(
                page.getByText(/nenhuma aprovação pendente|pendente|aguardando/i).first()
            ).toBeVisible();
            await expect(page).toHaveScreenshot('approvals-pending-list.png', { fullPage: true });
        });

    });

    test.describe('RBAC: Approvals Access', () => {

        test('should allow Manager to access approvals', async ({ page }) => {
            await loginAs(page, 'manager');
            await navigateTo(page, 'approvals');

            await expect(page).toHaveURL('/approvals');
            await expect(page.getByText(/minhas aprovações/i).first()).toBeVisible();
            await expect(page).toHaveScreenshot('approvals-manager-view.png', { fullPage: true });
        });

        test('should allow Admin to access approvals', async ({ page }) => {
            await loginAs(page, 'admin');
            await navigateTo(page, 'approvals');

            await expect(page).toHaveURL('/approvals');
            await expect(page).toHaveScreenshot('approvals-admin-view.png', { fullPage: true });
        });

    });

});
