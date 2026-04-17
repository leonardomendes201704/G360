import type { Page, Route } from '@playwright/test';

/** JWT mínimo (3 segmentos) — igual a `mock-api-for-config-pages.ts`. */
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

const E2E_CONTRACT_ID = 'e2e-contract-1';
const E2E_PROJECT_ID = 'e2e-project-1';

const mockContract = {
    id: E2E_CONTRACT_ID,
    number: 'CTR-E2E',
    description: 'Contrato mock — evidência modal',
    supplierId: 'sup-1',
    supplier: { id: 'sup-1', name: 'Fornecedor Mock' },
    type: 'SERVICO',
    startDate: '2025-01-01T00:00:00.000Z',
    endDate: '2026-12-31T00:00:00.000Z',
    signatureDate: '2025-01-01T00:00:00.000Z',
    value: 12000,
    monthlyValue: 1000,
    readjustmentRate: 0,
    costCenterId: null,
    accountId: null,
};

const mockAddendum = {
    id: 'e2e-addendum-1',
    number: 'AD-001',
    description: 'Aditivo mock para screenshot',
    signatureDate: '2025-06-01T00:00:00.000Z',
    valueChange: 500,
    newEndDate: null,
    fileUrl: null,
};

const mockProject = {
    id: E2E_PROJECT_ID,
    name: 'Projeto E2E Mock',
    code: 'PRJ-E2E',
    status: 'ACTIVE',
    approvalStatus: 'APPROVED',
    priority: 'MEDIUM',
    progress: 50,
    startDate: '2025-01-01T00:00:00.000Z',
    endDate: '2026-12-31T00:00:00.000Z',
    budget: 10000,
    members: [],
    tasks: [],
    risks: [],
    manager: { id: 'm1', name: 'Gestor Mock' },
    techLead: { id: 't1', name: 'Tech Mock' },
};

const pendingApprovalItem = {
    id: 'e2e-approval-detail-1',
    type: 'expense',
    title: 'Despesa — evidência E2E',
    subtitle: 'Solicitação para captura de modal',
    value: 1250.5,
    /** Data fixa para screenshots estáveis. */
    createdAt: '2026-04-17T12:00:00.000Z',
    invoiceNumber: 'NF-12345',
};

const approvalDetailBody = {
    description: 'Descrição de teste para o dossiê de modais (US-022).',
    value: 1250.5,
    date: '2026-04-17T12:00:00.000Z',
    supplier: { name: 'Fornecedor Exemplo Ltda' },
    requester: { name: 'Utilizador E2E' },
    invoiceNumber: 'NF-12345',
    notes: 'Notas opcionais visíveis no modal.',
};

const refUsers = [
    { id: 'e2e-ref-user-1', name: 'Utilizador E2E', email: 'e2e-ref@g360.com.br' },
    { id: 'e2e-ref-user-2', name: 'Outro Utilizador', email: 'e2e-ref-2@g360.com.br' },
];

/**
 * API mock para `modal-evidence-batch-01.spec.ts` — login + dados mínimos de contrato/projeto/financeiro/aprovações.
 * Permite gerar screenshots sem backend (mesmo padrão dos specs de Organização).
 */
export async function installModalEvidenceBatch01ApiMocks(page: Page): Promise<void> {
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
                              /** Permite menus e modais sem RBAC real (evidência E2E). */
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

        if (method === 'GET' && path.includes('/reference/users')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(refUsers),
            });
            return;
        }

        if (method === 'GET' && url.includes('/approvals/pending')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([pendingApprovalItem]),
            });
            return;
        }

        if (method === 'GET' && url.includes('/approvals/counts')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    expenses: 1,
                    projectCosts: 0,
                    minutes: 0,
                    gmuds: 0,
                    projects: 0,
                    proposals: 0,
                    budgets: 0,
                    total: 1,
                }),
            });
            return;
        }

        if (method === 'GET' && /\/approvals\/expense\/e2e-approval-detail-1\/detail/.test(url)) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(approvalDetailBody),
            });
            return;
        }

        if (method === 'GET' && path.includes('/finance-dashboard/overview')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    totalBudget: 100000,
                    totalSpent: 40000,
                    available: 60000,
                    consumption: 40,
                    unplannedSpent: 0,
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
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([]),
            });
            return;
        }

        if (method === 'GET' && (path.endsWith('/accounts') || path.endsWith('/accounts/'))) {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
            return;
        }

        if (method === 'GET' && path.endsWith(`/contracts/${E2E_CONTRACT_ID}/addendums`)) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([mockAddendum]),
            });
            return;
        }

        if (method === 'GET' && path.endsWith(`/contracts/${E2E_CONTRACT_ID}/attachments`)) {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
            return;
        }

        if (method === 'GET' && path.endsWith(`/contracts/${E2E_CONTRACT_ID}`)) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(mockContract),
            });
            return;
        }

        if (method === 'GET' && /\/contracts\/?$/.test(path)) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([mockContract]),
            });
            return;
        }

        if (method === 'GET' && path.endsWith(`/projects/${E2E_PROJECT_ID}`)) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(mockProject),
            });
            return;
        }

        if (method === 'GET' && /\/projects\/?$/.test(path)) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([mockProject]),
            });
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

        if (method === 'GET' && url.includes('cost-center')) {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
            return;
        }

        if (method === 'GET' && path.endsWith('/fiscal-years')) {
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

        if (method === 'GET' && path.endsWith('/users') && !path.includes('/reference/')) {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
            return;
        }

        if (method === 'GET' && path.endsWith('/tenants')) {
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
