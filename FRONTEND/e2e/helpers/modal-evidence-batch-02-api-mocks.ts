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

const E2E_ASSET_ID = 'e2e-asset-hw-1';

const mockCategory = {
    id: 'e2e-cat-1',
    name: 'Notebooks',
    type: 'HARDWARE',
    depreciationYears: 3,
};

const mockHardwareAsset = {
    id: E2E_ASSET_ID,
    code: 'PAT-E2E',
    name: 'Notebook evidência E2E',
    categoryId: 'e2e-cat-1',
    category: { id: 'e2e-cat-1', name: 'Notebooks' },
    status: 'PROPRIO',
    location: 'Sala 1',
    acquisitionValue: 5000,
    createdAt: '2026-01-15T10:00:00.000Z',
};

const refUsers = [
    { id: 'e2e-ref-user-1', name: 'Utilizador E2E', email: 'e2e-ref@g360.com.br' },
    { id: 'e2e-ref-user-2', name: 'Outro Utilizador', email: 'e2e-ref-2@g360.com.br' },
];

const refSuppliers = [{ id: 'sup-1', name: 'Fornecedor Mock' }];

/**
 * API mock para `modal-evidence-batch-02.spec.ts` — ativos + categorias + integrações (Azure).
 * Baseado em `modal-evidence-batch-01-api-mocks.ts`, com rotas `/assets` e `/asset-categories`.
 */
export async function installModalEvidenceBatch02ApiMocks(page: Page): Promise<void> {
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

        /** Evita FloatingTimer (z-index alto) — cliques com `force` no meio do ecrã iam para `/tasks/...`. */
        if (method === 'GET' && path.includes('/tasks/time/active')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(null),
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

        if (method === 'GET' && path.includes('/reference/suppliers')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(refSuppliers),
            });
            return;
        }

        if (method === 'GET' && path.includes('/reference/contracts')) {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
            return;
        }

        if (method === 'GET' && path.includes('/asset-categories')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([mockCategory]),
            });
            return;
        }

        if (method === 'POST' && path.includes('/asset-categories')) {
            let body: Record<string, unknown> = { name: 'Nova', type: 'HARDWARE' };
            try {
                body = (req.postDataJSON() as Record<string, unknown>) || body;
            } catch {
                /* ignore */
            }
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ id: 'e2e-cat-new', ...body }),
            });
            return;
        }

        if (method === 'PUT' && /\/asset-categories\/[^/]+$/.test(path)) {
            let body: Record<string, unknown> = {};
            try {
                body = (req.postDataJSON() as Record<string, unknown>) || {};
            } catch {
                /* ignore */
            }
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ id: 'e2e-cat-edit', ...body }),
            });
            return;
        }

        if (method === 'GET' && /\/assets\/[^/]+\/maintenances\/?$/.test(path)) {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
            return;
        }

        if (method === 'GET' && /\/assets\/?$/.test(path)) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([mockHardwareAsset]),
            });
            return;
        }

        if (method === 'GET' && path.endsWith(`/assets/${E2E_ASSET_ID}`)) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(mockHardwareAsset),
            });
            return;
        }

        if (method === 'GET' && path.includes('/software-licenses')) {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
            return;
        }

        if (method === 'POST' && /\/assets\/[^/]+\/maintenances\/?$/.test(path)) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ id: 'e2e-maint-1', type: 'CORRETIVA', status: 'AGENDADO' }),
            });
            return;
        }

        if (method === 'PUT' && path.includes('/assets/maintenances/')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ ok: true }),
            });
            return;
        }

        if (method === 'DELETE' && path.includes('/assets/maintenances/')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ ok: true }),
            });
            return;
        }

        if (method === 'POST' && /\/assets\/?$/.test(path)) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ id: 'e2e-new-asset', ...mockHardwareAsset }),
            });
            return;
        }

        if (method === 'PUT' && /\/assets\/[^/]+$/.test(path) && !path.includes('/maintenances')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ ok: true }),
            });
            return;
        }

        if (method === 'DELETE' && /\/assets\/[^/]+$/.test(path)) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ ok: true }),
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
