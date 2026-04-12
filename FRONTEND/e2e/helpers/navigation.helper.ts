import { Page, expect } from '@playwright/test';

/**
 * Module navigation paths and test IDs
 */
export const MODULES = {
    dashboard: { path: '/dashboard', label: 'Visão Geral', testId: 'nav-dashboard' },
    projects: { path: '/projects', label: 'Projetos', testId: 'nav-projects' },
    tasks: { path: '/tasks', label: 'Tarefas', testId: 'nav-tasks' },
    finance: { path: '/finance', label: 'Financeiro', testId: 'nav-finance' },
    contracts: { path: '/contracts', label: 'Contratos', testId: 'nav-contracts' },
    assets: { path: '/assets', label: 'Ativos', testId: 'nav-assets' },
    suppliers: { path: '/suppliers', label: 'Fornecedores', testId: 'nav-suppliers' },
    approvals: { path: '/approvals', label: 'Minhas Aprovações', testId: 'nav-approvals' },
    changes: { path: '/changes', label: 'Gestão de Mudança', testId: 'nav-changes' },
    config: { path: '/config/organization', label: 'Configurações', testId: 'nav-config-organization' },
} as const;

export type ModuleName = keyof typeof MODULES;

/**
 * Navigate to a specific module via data-testid (most reliable)
 */
export async function navigateTo(page: Page, module: ModuleName): Promise<void> {
    const { testId, path } = MODULES[module];

    // Try testId first (most reliable)
    const navItem = page.getByTestId(testId);
    if (await navItem.isVisible({ timeout: 2000 }).catch(() => false)) {
        await navItem.click();
    } else {
        // Fallback to direct navigation
        await page.goto(path);
    }

    await page.waitForLoadState('networkidle');
}

/**
 * Navigate to a module via sidebar click (using text)
 */
export async function navigateViaSidebar(page: Page, module: ModuleName): Promise<void> {
    const { label, testId } = MODULES[module];

    // Try testId first
    const navByTestId = page.getByTestId(testId);
    if (await navByTestId.isVisible({ timeout: 2000 }).catch(() => false)) {
        await navByTestId.click();
        await page.waitForLoadState('networkidle');
        return;
    }

    // Fallback to text
    await page.getByText(label).first().click();
    await page.waitForLoadState('networkidle');
}

/**
 * Wait for page to be fully loaded (no pending network requests)
 */
export async function waitForPageLoad(page: Page): Promise<void> {
    await page.waitForLoadState('networkidle');
}

/**
 * Check if a module is accessible (returns true if page loads without 403)
 */
export async function canAccessModule(page: Page, module: ModuleName): Promise<boolean> {
    const response = await page.goto(MODULES[module].path);
    const status = response?.status() || 0;

    if (status === 403) return false;
    if (page.url().includes('/login')) return false;

    return true;
}

/**
 * Get current module based on URL
 */
export function getCurrentModule(page: Page): ModuleName | null {
    const url = page.url();

    for (const [name, config] of Object.entries(MODULES)) {
        if (url.includes(config.path)) {
            return name as ModuleName;
        }
    }

    return null;
}

/**
 * Verify breadcrumb shows expected text
 */
export async function verifyBreadcrumb(page: Page, expectedText: string): Promise<void> {
    await expect(
        page.locator('.MuiBreadcrumbs-root').or(page.locator('[aria-label="breadcrumb"]'))
    ).toContainText(expectedText);
}

/**
 * Verify page header
 */
export async function verifyPageHeader(page: Page, expectedTitle: string): Promise<void> {
    await expect(
        page.locator('h1, h2').filter({ hasText: expectedTitle }).first()
    ).toBeVisible();
}
