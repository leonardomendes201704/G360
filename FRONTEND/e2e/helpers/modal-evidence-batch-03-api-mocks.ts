import type { Page, Route } from '@playwright/test';

/** JWT mínimo (3 segmentos) — igual aos outros mocks E2E. */
const FAKE_ACCESS =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
    Buffer.from(JSON.stringify({ sub: 'e2e', exp: 9999999999, tenantSlug: 'master' })).toString('base64url') +
    '.e2e-sig';

function pathnameFromUrl(url: string): string {
    try {
        return new URL(url).pathname;
    } catch {
        return url;
    }
}

export const E2E_BUDGET_ID = 'e2e-budget-1';

const E2E_FY_ID = 'e2e-fy-1';

const mockAccount = { id: 'e2e-acc-1', code: '1.01.001', name: 'Despesas TI', type: 'OPEX' };

const mockBudgetItem = {
    id: 'e2e-item-1',
    accountId: 'e2e-acc-1',
    account: mockAccount,
    supplier: { id: 'sup-1', name: 'Fornecedor Mock' },
    costCenter: { id: 'e2e-cc-1', code: 'CC001' },
    description: 'Item evidência E2E',
    type: 'OPEX',
    jan: 100,
    feb: 100,
    mar: 100,
    apr: 100,
    may: 100,
    jun: 100,
    jul: 100,
    aug: 100,
    sep: 100,
    oct: 100,
    nov: 100,
    dec: 100,
    total: 1200,
};

const mockBudgetDetail = {
    id: E2E_BUDGET_ID,
    name: 'Orçamento evidência E2E',
    status: 'DRAFT',
    version: 1,
    fiscalYearId: E2E_FY_ID,
    fiscalYear: { year: 2026 },
    totalOpex: 1200,
    totalCapex: 0,
    isOBZ: false,
    items: [mockBudgetItem],
};

const mockBudgetListRow = {
    id: E2E_BUDGET_ID,
    name: 'Orçamento evidência E2E',
    status: 'DRAFT',
    fiscalYearId: E2E_FY_ID,
    fiscalYear: { year: 2026 },
    totalOpex: 1200,
    isOBZ: false,
};

const mockChange = {
    id: 'e2e-change-1',
    code: 'GMUD-E2E-001',
    title: 'Mudança evidência E2E',
    description: 'Descrição de teste para o dossiê de modais (US-022).',
    type: 'NORMAL',
    impact: 'MENOR',
    riskLevel: 'BAIXO',
    status: 'DRAFT',
    scheduledStart: '2026-06-01T10:00:00.000Z',
    scheduledEnd: '2026-06-01T12:00:00.000Z',
    createdAt: '2026-01-15T10:00:00.000Z',
    updatedAt: '2026-01-15T11:00:00.000Z',
    requester: { id: 'e2e-ref-user-1', name: 'Utilizador E2E' },
    requesterId: 'e2e-ref-user-1',
    riskAssessment: {
        affectsProduction: false,
        hasDowntime: false,
        tested: true,
        easyRollback: true,
    },
    approvers: [],
    assets: [],
    relatedIncidents: [],
};

const refUsers = [
    { id: 'e2e-ref-user-1', name: 'Utilizador E2E', email: 'e2e-ref@g360.com.br' },
    { id: 'e2e-ref-user-2', name: 'Outro Utilizador', email: 'e2e-ref-2@g360.com.br' },
];

const refAccounts = [mockAccount];

const refSuppliers = [{ id: 'sup-1', name: 'Fornecedor Mock' }];

const refCostCenters = [{ id: 'e2e-cc-1', code: 'CC001', name: 'Centro E2E' }];

const myScopedCostCentersBody = {
    costCenters: refCostCenters,
    isAdmin: true,
};

const fiscalYearsBody = [{ id: E2E_FY_ID, year: 2026, label: '2026', isClosed: false }];

/**
 * API mock para `modal-evidence-batch-03.spec.ts` — orçamentos + GMUD (batch 11–15).
 */
export async function installModalEvidenceBatch03ApiMocks(page: Page): Promise<void> {
    await page.route('**/api/v1/**', async (route: Route) => {
        const req = route.request();
        const url = req.url();
        const method = req.method();
        const path = pathnameFromUrl(url);

        if (method === 'POST' && url.includes('/auth/login')) {
            let email = '';
            try {
                const post = req.postDataJSON() as { email?: string } | null;
                email = post?.email || '';
            } catch {
                /* ignore */
            }
            const isGlobalSuperAdmin = email === 'admin@g360.com.br';
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    token: FAKE_ACCESS,
                    refreshToken: 'e2e-refresh',
                    user: isGlobalSuperAdmin
                        ? {
                              id: 'e2e-sa',
                              email: 'admin@g360.com.br',
                              name: 'Admin E2E',
                              roles: [{ name: 'Super Admin' }],
                              schema: 'public',
                          }
                        : {
                              id: 'e2e-mgr',
                              email: 'gestor.ti@g360.com.br',
                              name: 'Gestor E2E',
                              roles: [{ name: 'Manager', permissions: [{ module: 'ALL', action: 'ALL' }] }],
                              schema: 'public',
                          },
                    enabledModules: [],
                }),
            });
            return;
        }

        if (method === 'GET' && path.includes('/tenants/dashboard-stats')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    data: { total: 0, active: 0, inactive: 0, pool: { activeClients: 0 } },
                }),
            });
            return;
        }

        if (method === 'GET' && path.includes('/global-settings/system-health')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ data: { status: 'healthy', memory: { heapPercent: '10' } } }),
            });
            return;
        }

        if (method === 'GET' && url.includes('/notifications')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ notifications: [], unreadCount: 0 }),
            });
            return;
        }

        if (method === 'GET' && path.includes('/tasks/time/active')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(null),
            });
            return;
        }

        /** Finance dashboard (tab inicial em `/finance`) */
        if (method === 'GET' && path.includes('/finance-dashboard/overview')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    totalBudget: 0,
                    totalSpent: 0,
                    available: 0,
                    consumption: 0,
                }),
            });
            return;
        }

        if (method === 'GET' && path.includes('/finance-dashboard/evolution')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ labels: [], planned: [], actual: [] }),
            });
            return;
        }

        if (method === 'GET' && path.includes('/finance-dashboard/insights')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ alerts: [], savings: [] }),
            });
            return;
        }

        if (method === 'GET' && path.includes('/finance-dashboard/cost-centers')) {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
            return;
        }

        if (method === 'GET' && path.endsWith('/fiscal-years')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(fiscalYearsBody),
            });
            return;
        }

        if (method === 'GET' && path.includes('/reference/accounts')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(refAccounts),
            });
            return;
        }

        if (method === 'GET' && path.includes('/reference/cost-centers')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(refCostCenters),
            });
            return;
        }

        if (method === 'GET' && path.includes('/reference/my-cost-centers')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(myScopedCostCentersBody),
            });
            return;
        }

        if (method === 'GET' && path.includes('/reference/suppliers')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(refSuppliers),
            });
            return;
        }

        if (method === 'GET' && path.includes('/reference/users')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(refUsers),
            });
            return;
        }

        if (method === 'GET' && path.includes('/reference/contracts')) {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
            return;
        }

        if (method === 'GET' && path.endsWith('/budgets')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([mockBudgetListRow]),
            });
            return;
        }

        if (method === 'GET' && path.endsWith(`/budgets/${E2E_BUDGET_ID}`)) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(mockBudgetDetail),
            });
            return;
        }

        if (method === 'GET' && path.includes('/changes/metrics/trends')) {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
            return;
        }

        if (method === 'GET' && path.includes('/changes/metrics')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    summary: { successRate: 0, mttrHours: 0, onTimeRate: 0 },
                }),
            });
            return;
        }

        if (method === 'GET' && path.includes('/changes/schedule/conflicts')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ conflicts: [] }),
            });
            return;
        }

        if (method === 'GET' && /\/changes\/[^/]+\/attachments\/?$/.test(path)) {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
            return;
        }

        if (method === 'GET' && /\/changes\/?$/.test(path)) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([mockChange]),
            });
            return;
        }

        if (method === 'GET' && path.includes('/change-templates')) {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
            return;
        }

        if (method === 'GET' && path.endsWith('/users') && !path.includes('/reference/')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(refUsers),
            });
            return;
        }

        if (method === 'GET' && /\/projects\/?/.test(path)) {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
            return;
        }

        if (method === 'GET' && /\/assets\/?/.test(path) && !path.includes('/maintenances')) {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
            return;
        }

        if (method === 'GET' && path.includes('/incidents')) {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
            return;
        }

        if (method === 'GET' && url.includes('cost-center')) {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
            return;
        }

        if (method === 'GET' && path.endsWith('/roles')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([
                    { id: 'e2e-role-1', name: 'Perfil E2E', description: 'Perfil para testes', permissions: [] },
                ]),
            });
            return;
        }

        if (method === 'GET' && path.endsWith('/tenants')) {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
            return;
        }

        if (method === 'GET' && path.includes('/integrations')) {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
            return;
        }

        if (method === 'GET' && url.match(/\/(departments|department)/i)) {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
            return;
        }

        if (method === 'GET') {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
            return;
        }

        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ ok: true }),
        });
    });
}
