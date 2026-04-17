import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth.helper';
import { navigateTo } from './helpers/navigation.helper';
import { E2E_PROJECT_ID, installModalEvidenceBatch06ApiMocks } from './helpers/modal-evidence-batch-06-api-mocks';

const E2E_INCIDENT_CODE = 'INC-E2E-001';

/**
 * Rodada 6 — evidências visuais (US-022 / dossiê QA): modais 26–30.
 * Depois de validar os PNG em `*-snapshots/`, atualizar `docs/qa/_gen-modal-grid.mjs` (map `snaps`) e regenerar o fragmento + handbook.
 */
test.describe('Modal evidence batch 06 (26–30)', () => {
    test.beforeEach(async ({ page }) => {
        await installModalEvidenceBatch06ApiMocks(page);
    });

    test('26 — IncidentModal (Incidentes → editar)', async ({ page }) => {
        await loginAs(page, 'manager');
        await page.goto('/incidents');
        await page.waitForURL(/\/incidents/, { timeout: 30000 });
        await page.waitForLoadState('networkidle');
        await expect(page.getByText('Gestão de Incidentes')).toBeVisible({ timeout: 20000 });

        const row = page.locator('tbody tr').filter({ hasText: E2E_INCIDENT_CODE });
        await expect(row).toBeVisible({ timeout: 15000 });
        await row.getByRole('button', { name: /editar/i }).click();

        const dlg = page.getByRole('dialog');
        await expect(dlg.getByText('Editar Incidente')).toBeVisible({ timeout: 15000 });

        await expect(dlg).toHaveScreenshot('modal-evidence-26-incident-modal-shell.png');
    });

    test('27 — IncidentViewModal (Incidentes → visualizar)', async ({ page }) => {
        await loginAs(page, 'manager');
        await page.goto('/incidents');
        await page.waitForURL(/\/incidents/, { timeout: 30000 });
        await page.waitForLoadState('networkidle');
        await expect(page.getByText('Gestão de Incidentes')).toBeVisible({ timeout: 20000 });

        const row = page.locator('tbody tr').filter({ hasText: E2E_INCIDENT_CODE });
        await expect(row).toBeVisible({ timeout: 15000 });
        await row.getByRole('button', { name: /visualizar/i }).click();

        const dlg = page.getByRole('dialog');
        await expect(dlg.getByText('INC-E2E-001')).toBeVisible({ timeout: 15000 });

        await expect(dlg).toHaveScreenshot('modal-evidence-27-incident-view-modal-shell.png');
    });

    test('28 — KnowledgeBaseModal (Base de conhecimento → Novo Artigo)', async ({ page }) => {
        await loginAs(page, 'manager');
        await page.goto('/knowledge');
        await page.waitForURL(/\/knowledge/, { timeout: 30000 });
        await page.waitForLoadState('networkidle');
        await expect(
            page.getByText('Central de Documentos, Manuais e Procedimentos'),
        ).toBeVisible({ timeout: 20000 });

        await page.getByRole('button', { name: /novo artigo/i }).first().click();
        const dlg = page.getByRole('dialog');
        await expect(dlg.getByText('Novo Artigo')).toBeVisible({ timeout: 15000 });

        await expect(dlg).toHaveScreenshot('modal-evidence-28-knowledge-base-modal-shell.png');
    });

    test('29 — LdapConfigModal (Config → Integrações → AD Local LDAP)', async ({ page }) => {
        await loginAs(page, 'manager');
        await navigateTo(page, 'config');

        await expect(page.getByText(/estrutura organizacional/i)).toBeVisible({ timeout: 20000 });
        await page.getByTestId('org-tab-integracoes').click();
        await page.waitForTimeout(400);

        await page.getByTestId('integration-open-LDAP').click();
        const dlg = page.getByRole('dialog');
        await expect(dlg.getByText('Configuração AD Local (LDAP)')).toBeVisible({ timeout: 15000 });

        await expect(dlg).toHaveScreenshot('modal-evidence-29-ldap-config-modal-shell.png');
    });

    test('30 — MemberModal (Projeto → Equipes → editar membro)', async ({ page }) => {
        await loginAs(page, 'manager');
        await page.goto(`/projects/${E2E_PROJECT_ID}?tab=teams`);
        await page.waitForURL(new RegExp(`/projects/${E2E_PROJECT_ID}`), { timeout: 30000 });
        await page.waitForLoadState('networkidle');

        await expect(page.getByText('Utilizador E2E')).toBeVisible({ timeout: 20000 });
        await page.getByTestId('project-member-edit').click();

        const dlg = page.getByRole('dialog');
        await expect(dlg.getByText('Editar função do membro')).toBeVisible({ timeout: 15000 });

        await expect(dlg).toHaveScreenshot('modal-evidence-30-member-modal-shell.png');
    });
});
