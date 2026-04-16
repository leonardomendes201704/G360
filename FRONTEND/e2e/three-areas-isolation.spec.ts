/**
 * Valida isolamento de dados entre as 3 áreas criadas por `npm run seed:three-areas:all` (backend).
 * Pré-requisitos: API e frontend no ar; seed aplicado no tenant usado no login (ex.: master).
 */
import { test, expect } from '@playwright/test';
import { loginWithCredentialsAndDashboard, THREE_AREAS_SEED } from './helpers/auth.helper';

test.describe('Três áreas — isolamento gestor (seed E2E)', () => {
    test('gestor TI: lista de projetos contém só o projeto da TI (não o do Financeiro)', async ({
        page,
    }) => {
        await loginWithCredentialsAndDashboard(
            page,
            THREE_AREAS_SEED.tiManager.email,
            THREE_AREAS_SEED.tiManager.password
        );
        await page.goto('/projects');
        await expect(page.getByText('Projeto E2E — Área TI')).toBeVisible({ timeout: 45000 });
        await expect(page.getByText('Projeto E2E — Área Financeiro')).toHaveCount(0);
    });

    test('gestor Financeiro: vê projeto Financeiro e não vê o da TI', async ({ page }) => {
        await loginWithCredentialsAndDashboard(
            page,
            THREE_AREAS_SEED.finManager.email,
            THREE_AREAS_SEED.finManager.password
        );
        await page.goto('/projects');
        await expect(page.getByText('Projeto E2E — Área Financeiro')).toBeVisible({ timeout: 45000 });
        await expect(page.getByText('Projeto E2E — Área TI')).toHaveCount(0);
    });

    test('gestor Operações: vê projeto Operações e não vê o da TI', async ({ page }) => {
        await loginWithCredentialsAndDashboard(
            page,
            THREE_AREAS_SEED.opsManager.email,
            THREE_AREAS_SEED.opsManager.password
        );
        await page.goto('/projects');
        await expect(page.getByText('Projeto E2E — Área Operações')).toBeVisible({ timeout: 45000 });
        await expect(page.getByText('Projeto E2E — Área TI')).toHaveCount(0);
    });

    test('colaborador TI: incidentes — vê o da TI e não o do Financeiro (gestor tem VIEW_ALL_CC)', async ({
        page,
    }) => {
        await loginWithCredentialsAndDashboard(
            page,
            THREE_AREAS_SEED.tiCollaborator.email,
            THREE_AREAS_SEED.tiCollaborator.password
        );
        await page.goto('/incidents');
        await expect(page.getByText('Incidente E2E — Área TI')).toBeVisible({ timeout: 45000 });
        await expect(page.getByText('Incidente E2E — Área Financeiro')).toHaveCount(0);
    });

    test('colaborador TI: riscos — vê o risco atribuído a ele na TI e não o do Financeiro', async ({
        page,
    }) => {
        await loginWithCredentialsAndDashboard(
            page,
            THREE_AREAS_SEED.tiCollaborator.email,
            THREE_AREAS_SEED.tiCollaborator.password
        );
        await page.goto('/risks');
        await page.getByTestId('risks-view-list').click();
        await expect(page.getByText('Risco E2E — Área TI')).toBeVisible({ timeout: 45000 });
        await expect(page.getByText('Risco E2E — Área Financeiro')).toHaveCount(0);
    });
});
