import { Page, expect } from '@playwright/test';

/** Senha padrão do seed; sobrescreva com E2E_PASSWORD se todas as contas de teste usam a mesma senha. */
const E2E_PASSWORD = process.env.E2E_PASSWORD || 'L89*Eb5v@';

/**
 * Test user credentials from seed.js
 */
export const TEST_USERS = {
    admin: {
        email: 'admin@g360.com.br',
        password: process.env.E2E_ADMIN_PASSWORD || E2E_PASSWORD,
        role: 'SUPER_ADMIN',
        expectedDashboard: 'SuperAdminDashboard',
    },
    manager: {
        email: 'gestor.ti@g360.com.br',
        password: process.env.E2E_MANAGER_PASSWORD || E2E_PASSWORD,
        role: 'MANAGER',
        expectedDashboard: 'ManagerDashboard',
    },
    collaborator: {
        email: 'dev@g360.com.br',
        password: process.env.E2E_COLLABORATOR_PASSWORD || E2E_PASSWORD,
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

    try {
        const tenantSelector = page.getByText('Selecione a empresa');
        await expect(tenantSelector).toBeVisible({ timeout: 8000 });
        const master = page.getByTestId('tenant-option-master');
        if (await master.isVisible().catch(() => false)) {
            await master.click();
        } else {
            const any = page.locator('[data-testid^="tenant-option-"]').first();
            await any.click();
        }
    } catch {
        /* sem seleção de tenant ou um único tenant */
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

/** Senha alinhada ao seed (`SEED_E2E_PASSWORD` / `E2E_PASSWORD` / padrão do backend). */
export const E2E_SEED_PASSWORD = process.env.E2E_PASSWORD || 'L89*Eb5v@';

/** Contas do seed `seed:three-areas:all` — gestores por área (isolamento CC). */
export const THREE_AREAS_SEED = {
    tiManager: { email: 'e2e-seed-ti-mgr@g360.com.br', password: E2E_SEED_PASSWORD },
    tiCollaborator: { email: 'e2e-seed-ti-col@g360.com.br', password: E2E_SEED_PASSWORD },
    finManager: { email: 'e2e-seed-fin-mgr@g360.com.br', password: E2E_SEED_PASSWORD },
    opsManager: { email: 'e2e-seed-ops-mgr@g360.com.br', password: E2E_SEED_PASSWORD },
} as const;

/**
 * Login + seleção de tenant (quando existir) + espera dashboard.
 * Use com usuários criados pelo seed de áreas E2E.
 */
export async function loginWithCredentialsAndDashboard(
    page: Page,
    email: string,
    password: string
): Promise<void> {
    await page.goto('/login');
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill(password);
    await page.waitForTimeout(400);
    await page.locator('button[type="submit"]').click();

    try {
        const tenantSelector = page.getByText('Selecione a empresa');
        await expect(tenantSelector).toBeVisible({ timeout: 8000 });
        const master = page.getByTestId('tenant-option-master');
        if (await master.isVisible().catch(() => false)) {
            await master.click();
        } else {
            await page.locator('[data-testid^="tenant-option-"]').first().click();
        }
    } catch {
        /* um único tenant ou fluxo sem seleção */
    }

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 60000 });
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
