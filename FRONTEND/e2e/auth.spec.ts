import { test, expect } from '@playwright/test';
import { loginAs, loginWithCredentials, logout, TEST_USERS } from './helpers/auth.helper';

test.describe('Auth: Authentication Flow', () => {

    test.describe('Login', () => {

        test('should display login page correctly', async ({ page }) => {
            await page.goto('/login');

            // Verify page elements
            await expect(page).toHaveTitle(/G360/);
            await expect(page.locator('input[name="email"]')).toBeVisible();
            await expect(page.locator('input[name="password"]')).toBeVisible();
            await expect(page.locator('button[type="submit"]')).toBeVisible();
            await expect(page).toHaveScreenshot('auth-login-page.png', { fullPage: true });
        });

        test('should login as Super Admin and redirect to dashboard', async ({ page }) => {
            await loginAs(page, 'admin');

            // Verify dashboard loaded
            await expect(page).toHaveURL('/dashboard');
            await expect(page.getByText('Visão Geral').first()).toBeVisible();

            // Super Admin sees Paper-based KPIs
            await expect(page.getByText('Visão Geral da Plataforma')).toBeVisible({ timeout: 15000 });
            await expect(page).toHaveScreenshot('auth-admin-dashboard.png', { fullPage: true });
        });

        test('should login as Manager and redirect to dashboard', async ({ page }) => {
            await loginAs(page, 'manager');

            // Verify dashboard loaded
            await expect(page).toHaveURL('/dashboard');
            await expect(page.getByText('Visão Geral').first()).toBeVisible();
        });

        test('should login as Collaborator and redirect to dashboard', async ({ page }) => {
            await loginAs(page, 'collaborator');

            // Verify dashboard loaded
            await expect(page).toHaveURL('/dashboard');
            await expect(page.getByText('Visão Geral').first()).toBeVisible();
        });

        test('should show error on invalid credentials', async ({ page }) => {
            await loginWithCredentials(page, 'invalid@email.com', 'wrongpassword');

            // Should stay on login page
            await expect(page).toHaveURL(/login/);

            // Should show error message (Snackbar or inline)
            await expect(
                page.getByText(/inválid|incorret|erro|invalid|error/i).first()
            ).toBeVisible({ timeout: 5000 });
        });

        test('should show error on empty fields', async ({ page }) => {
            await page.goto('/login');

            // Try to submit empty form
            await page.locator('button[type="submit"]').click();

            // Should stay on login and show validation
            await expect(page).toHaveURL(/login/);
        });

    });

    test.describe('Logout', () => {

        test('should logout and redirect to login page', async ({ page }) => {
            // First login
            await loginAs(page, 'admin');
            await expect(page).toHaveURL('/dashboard');

            // Then logout
            await logout(page);

            // Verify redirect
            await expect(page).toHaveURL('/login');
        });

    });

    test.describe('Protected Routes', () => {

        test('should redirect to login when accessing protected route without auth', async ({ page }) => {
            // Try to access dashboard directly
            await page.goto('/dashboard');

            // Should redirect to login
            await expect(page).toHaveURL(/login/);
        });

        test('should redirect to login when accessing projects without auth', async ({ page }) => {
            await page.goto('/projects');
            await expect(page).toHaveURL(/login/);
        });

    });

});
