import type { Page, Route } from '@playwright/test';

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

const MOCK_CATEGORY_ID = 'e2e-cat-1';
const MOCK_SERVICE_ID = 'e2e-svc-1';

const mockCategories = [{ id: MOCK_CATEGORY_ID, name: 'Categoria E2E' }];

const mockServices = [
    {
        id: MOCK_SERVICE_ID,
        name: 'Serviço E2E Select',
        description: 'Serviço mínimo para teste de visibilidade do select no modal.',
        categoryId: MOCK_CATEGORY_ID,
        icon: 'support_agent',
        formSchema: null,
    },
];

const mockDepartments = [
    { id: 'e2e-dept-1', code: 'TI', name: 'Tecnologia' },
    { id: 'e2e-dept-2', code: 'RH', name: 'Recursos Humanos' },
];

/**
 * Mocks mínimos para abrir o Portal, o wizard «Novo ticket» e o StandardModal sem backend na porta 8500.
 */
export async function installPortalModalSelectApiMocks(page: Page): Promise<void> {
    await page.route('**/api/v1/**', async (route: Route) => {
        const req = route.request();
        const url = req.url();
        const method = req.method();
        const path = pathnameFromUrl(url);

        if (method === 'POST' && path.includes('/auth/login')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    token: FAKE_ACCESS,
                    refreshToken: 'e2e-refresh',
                    user: {
                        id: 'e2e-col',
                        email: 'dev@g360.com.br',
                        name: 'Collaborator E2E',
                        roles: [{ name: 'Collaborator' }],
                        schema: 'public',
                        departmentId: null,
                        costCenterId: null,
                    },
                    enabledModules: [],
                }),
            });
            return;
        }

        if (method === 'POST' && path.includes('/auth/refresh')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ token: FAKE_ACCESS }),
            });
            return;
        }

        if (method === 'POST' && path.includes('/auth/logout')) {
            await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
            return;
        }

        if (method === 'GET' && path.includes('/tickets') && !path.match(/\/tickets\/[^/]+\//)) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([]),
            });
            return;
        }

        if (method === 'GET' && path.includes('/service-catalog/categories')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(mockCategories),
            });
            return;
        }

        if (method === 'GET' && path.includes('/service-catalog')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(mockServices),
            });
            return;
        }

        if (method === 'GET' && path.includes('/assets')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([]),
            });
            return;
        }

        if (method === 'GET' && path.includes('/support-groups/active')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([]),
            });
            return;
        }

        if (method === 'GET' && path.endsWith('/departments')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(mockDepartments),
            });
            return;
        }

        if (method === 'GET' && path.includes('/cost-centers')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([]),
            });
            return;
        }

        if (method === 'GET' && path.includes('/knowledge-base')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ articles: [] }),
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
