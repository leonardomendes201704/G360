# US-022 — evidência: modal Azure AD (`StandardModal`)

- **Spec E2E:** `FRONTEND/e2e/integrations-azure-modal.spec.ts`
- **Mocks API (sem backend):** `FRONTEND/e2e/helpers/mock-api-for-config-pages.ts` — `installApiMocksForConfigIntegrationFlows` antes do login; utilizador simulado **Manager** (aba Integrações).
- **Snapshot Playwright (baseline):** `FRONTEND/e2e/integrations-azure-modal.spec.ts-snapshots/integrations-azure-modal-shell-chromium-win32.png`
- **Comando:** `npm run test:e2e -- e2e/integrations-azure-modal.spec.ts` ou `npm run test:e2e:update-snapshots -- e2e/integrations-azure-modal.spec.ts` (usa `playwright.g360.config.ts` via `npm run test:e2e`, porta **5176**)
