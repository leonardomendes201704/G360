import fs from 'fs';
import path from 'path';
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth.helper';
import { installPortalModalSelectApiMocks } from './helpers/portal-modal-select-api-mocks';

/**
 * Evidência de regressão: MUI Select no StandardModal (Portal) deve mostrar o texto do valor
 * (CSS não pode aplicar `display:flex` ao `.MuiSelect-select` no Dialog).
 *
 * Usa mocks de API (sem backend). Artefacto: screenshot em `testInfo.outputPath`.
 */
test.describe('Portal — modal de ticket (select Departamento)', () => {
  test.beforeEach(async ({ page }) => {
    await installPortalModalSelectApiMocks(page);
  });

  test('valor do select «Departamento (opcional)» permanece visível após escolha', async (
    { page },
    testInfo
  ) => {
    await loginAs(page, 'collaborator');
    await page.goto('/portal');

    await expect(page.getByText('Olá, como podemos ajudar?')).toBeVisible({ timeout: 20000 });

    await page.getByRole('button', { name: /Novo ticket/i }).click();
    await expect(page.getByText('Passo 1 de 2')).toBeVisible({ timeout: 15000 });

    const firstCategory = page.locator('[aria-label^="Categoria "]').first();
    await expect(firstCategory).toBeVisible({ timeout: 10000 });
    await firstCategory.click();

    await expect(page.getByText('Passo 2 de 2')).toBeVisible({ timeout: 10000 });
    const firstService = page.locator('[aria-label^="Serviço "]').first();
    await expect(firstService).toBeVisible({ timeout: 10000 });
    await firstService.click();

    const ticketModal = page.locator('[role="dialog"]').filter({ hasText: /Solicitar:/ });
    await expect(ticketModal).toBeVisible({ timeout: 10000 });

    const deptCombo = ticketModal.getByLabel('Departamento (opcional)');
    await expect(deptCombo).toBeVisible();

    await deptCombo.click();
    const listbox = page.getByRole('listbox');
    await expect(listbox).toBeVisible();

    const options = listbox.getByRole('option');
    const n = await options.count();
    if (n <= 1) {
      await page.keyboard.press('Escape');
      test.skip(true, 'Catálogo sem departamentos além do placeholder — não é possível validar a seleção.');
    }

    await options.nth(1).click();

    // Valor escolhido deve ser legível (regras de tema não podem esconder o texto no Dialog).
    await expect(deptCombo).toContainText('TI');
    await expect(deptCombo).toContainText('Tecnologia');

    const evidenceDir = path.join(process.cwd(), 'e2e', 'evidence');
    fs.mkdirSync(evidenceDir, { recursive: true });
    const evidencePath = path.join(evidenceDir, 'portal-modal-department-visible.png');
    await ticketModal.screenshot({ path: evidencePath });

    await testInfo.attach(path.basename(evidencePath), {
      path: evidencePath,
      contentType: 'image/png',
    });
  });
});
