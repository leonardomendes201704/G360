/**
 * Tour sequencial de rotas protegidas com verificação de consola (sem erros / pageerror).
 * Correr com projeto `chromium-headed-console` para browser visível. Slow motion opcional: `PLAYWRIGHT_HEADED_SLOW_MO=80`.
 *
 * Login por defeito: tenant **DevCraft** — `admin@devcraft.local` (senha no seed DevCraft).
 * Override: `E2E_CONSOLE_SMOKE_EMAIL` e `E2E_CONSOLE_SMOKE_PASSWORD`.
 *
 * Pré-requisitos: API com seed que inclua esse utilizador (ex. `seed-model-tenant-devcraft`), Vite na porta do Playwright (5176).
 */
import { test, expect } from '@playwright/test';
import { loginWithCredentialsAndDashboard } from './helpers/auth.helper';
import { attachConsoleMonitor, formatViolations } from './helpers/console-monitor.helper';

const CONSOLE_SMOKE_EMAIL = process.env.E2E_CONSOLE_SMOKE_EMAIL ?? 'admin@devcraft.local';
const CONSOLE_SMOKE_PASSWORD = process.env.E2E_CONSOLE_SMOKE_PASSWORD ?? 'DevCraft@2026';

/** Rotas (path) alinhadas a FRONTEND/src/App.jsx — sessão super admin para cobrir também /config/tenants e /config/global. */
const PROTECTED_ROUTE_PATHS: string[] = [
    '/dashboard',
    '/modern-dashboard',
    '/projects',
    '/projects/portfolio',
    '/projects/team-status-report',
    '/tasks',
    '/tasks/time-report',
    '/knowledge',
    '/changes',
    '/incidents',
    '/assets',
    '/risks',
    '/suppliers',
    '/contracts',
    '/finance',
    '/finance/compare',
    '/activities',
    '/approvals',
    '/config/organization',
    '/config/tenants',
    '/config/global',
    '/portal',
    '/servicedesk',
    '/servicedesk/settings',
    '/servicedesk/catalog',
    '/servicedesk/problems',
];

test.describe.configure({ mode: 'serial' });

const log = (msg: string) => {
    // Prefixo fixo para filtrar no terminal / CI
    process.stdout.write(`[console-smoke] ${msg}\n`);
};

test.describe('Console smoke — tour (DevCraft admin)', () => {
    test('navega pelas rotas sem console.error nem pageerror', async ({ page }) => {
        await test.step('Login (DevCraft)', async () => {
            log(`login → ${CONSOLE_SMOKE_EMAIL}`);
            await loginWithCredentialsAndDashboard(page, CONSOLE_SMOKE_EMAIL, CONSOLE_SMOKE_PASSWORD);
            log('login OK');
        });

        const monitor = attachConsoleMonitor(page);
        const total = PROTECTED_ROUTE_PATHS.length;
        try {
            log(`início do tour: ${total} rotas`);
            for (let i = 0; i < total; i++) {
                const path = PROTECTED_ROUTE_PATHS[i];
                const stepLabel = `${i + 1}/${total} ${path}`;
                await test.step(stepLabel, async () => {
                    log(`${stepLabel}`);
                    // Pausa entre navegações reduz pressão em sockets do Chromium (menos ERR_INSUFFICIENT_RESOURCES).
                    if (i > 0) await page.waitForTimeout(400);
                    monitor.clear();
                    await page.goto(path, { waitUntil: 'load', timeout: 60_000 });
                    await page.waitForTimeout(900);

                    const violations = monitor.getViolations();
                    expect(
                        violations,
                        `Violations em ${path}:\n${formatViolations(violations)}`
                    ).toEqual([]);
                    log(`OK ${path}`);
                });
            }
            log(`fim do tour (${total} rotas)`);
        } finally {
            monitor.dispose();
        }
    });
});
