import { Page, expect } from '@playwright/test';

/**
 * Test user credentials from seed.js
 */
export const TEST_USERS = {
    admin: {
        email: 'admin@g360.com.br',
        password: 'L89*Eb5v@',
        role: 'SUPER_ADMIN',
        expectedDashboard: 'SuperAdminDashboard',
    },
    manager: {
        email: 'gestor.ti@g360.com.br',
        password: 'L89*Eb5v@',
        role: 'MANAGER',
        expectedDashboard: 'ManagerDashboard',
    },
    collaborator: {
        email: 'dev@g360.com.br',
        password: 'L89*Eb5v@',
        role: 'COLLABORATOR',
        expectedDashboard: 'CollaboratorDashboard',
    },
} as const;

export type UserRole = keyof typeof TEST_USERS;

/**
 * Login as a specific role
 */
export async function loginAs(page: Page, role: UserRole): Promise<void> {
    const user = TEST_USERS[role];

    await page.goto('/login');
    await page.locator('input[name="email"]').fill(user.email);
    await page.locator('input[name="password"]').fill(user.password);
    
    // Small delay to allow Formik/React to register the inputs before clicking submit
    await page.waitForTimeout(500);
    await page.locator('button[type="submit"]').click();

    // Check if multi-tenant selection appears
    try {
        const tenantSelector = page.getByText('Selecione a empresa');
        await expect(tenantSelector).toBeVisible({ timeout: 5000 });
        // If visible, click the first tenant option (assuming standard G360 tenant)
        await page.locator('.material-icons-round:has-text("domain")').first().click();
    } catch (e) {
        // No tenant selection appeared, proceed normally
    }

    // Wait for redirect to dashboard
    await expect(page).toHaveURL('/dashboard', { timeout: 60000 });
}

/**
 * Login with explicit credentials
 */
export async function loginWithCredentials(
    page: Page,
    email: string,
    password: string
): Promise<void> {
    await page.goto('/login');
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill(password);
    await page.locator('button[type="submit"]').click();
}

/**
 * Logout from the application
 */
export async function logout(page: Page): Promise<void> {
    // Click on user avatar/menu to open dropdown
    await page.locator('[data-testid="user-menu"]').or(page.locator('.MuiAvatar-root')).first().click();

    // Click logout option
    await page.getByRole('menuitem', { name: /sair|logout/i }).click();

    // Verify redirect to login
    await expect(page).toHaveURL('/login');
}

/**
 * Check if user is logged in
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
    const url = page.url();
    return !url.includes('/login');
}

/**
 * Get current user info from localStorage (if available)
 */
export async function getCurrentUser(page: Page): Promise<any> {
    return await page.evaluate(() => {
        const userData = localStorage.getItem('user');
        return userData ? JSON.parse(userData) : null;
    });
}
