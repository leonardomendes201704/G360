import type { Page, Route } from '@playwright/test';

/** JWT mínimo (3 segmentos) — o cliente guarda e envia Authorization; não valida assinatura no browser. */
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

/**
 * Intercepta chamadas à API para permitir E2E sem backend (fluxos Config / Integrações / Organização).
 * Login: `admin@g360.com.br` → Super Admin global (`schema: public`); caso contrário → Manager (gestor.ti@…).
 */
export async function installApiMocksForConfigIntegrationFlows(page: Page): Promise<void> {
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
                              roles: [{ name: 'Manager' }],
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
                    data: {
                        total: 0,
                        active: 0,
                        inactive: 0,
                        pool: { activeClients: 0 },
                    },
                }),
            });
            return;
        }

        if (method === 'GET' && path.includes('/global-settings/system-health')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    data: { status: 'healthy', memory: { heapPercent: '10' } },
                }),
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

        if (method === 'GET' && url.includes('/integrations')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([]),
            });
            return;
        }

        if (method === 'GET' && url.match(/\/(departments|department)/i)) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([]),
            });
            return;
        }

        if (method === 'GET' && url.includes('cost-center')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([]),
            });
            return;
        }

        if (method === 'GET' && path.endsWith('/fiscal-years')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([]),
            });
            return;
        }

        if (method === 'GET' && path.endsWith('/roles')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([
                    {
                        id: 'e2e-role-1',
                        name: 'Perfil E2E',
                        description: 'Perfil para testes',
                        permissions: [],
                    },
                ]),
            });
            return;
        }

        if (method === 'GET' && path.endsWith('/users')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([]),
            });
            return;
        }

        if (method === 'GET' && path.endsWith('/tenants')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([]),
            });
            return;
        }

        if (method === 'GET') {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([]),
            });
            return;
        }

        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ ok: true }),
        });
    });
}

/** Alias — mesmos mocks (login por email + listas de organização). Usado nos specs dos modais StandardModal em Organização. */
export const installApiMocksForOrganizationStandardModals = installApiMocksForConfigIntegrationFlows;
