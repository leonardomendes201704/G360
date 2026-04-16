import type { Page, Route } from '@playwright/test';

/** JWT mínimo (3 segmentos) — o cliente guarda e envia Authorization; não valida assinatura no browser. */
const FAKE_ACCESS =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
    Buffer.from(JSON.stringify({ sub: 'e2e', exp: 9999999999, tenantSlug: 'master' })).toString('base64url') +
    '.e2e-sig';

/**
 * Intercepta chamadas à API para permitir E2E sem backend (fluxos Config / Integrações).
 * Usuário simulado: Manager (vê aba Integrações; Super Admin global só vê Tenants).
 */
export async function installApiMocksForConfigIntegrationFlows(page: Page): Promise<void> {
    await page.route('**/api/v1/**', async (route: Route) => {
        const req = route.request();
        const url = req.url();
        const method = req.method();

        if (method === 'POST' && url.includes('/auth/login')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    token: FAKE_ACCESS,
                    refreshToken: 'e2e-refresh',
                    user: {
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
