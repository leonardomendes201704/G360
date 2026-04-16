# US-022 — evidência: modais de organização (`StandardModal`)

- **Spec E2E:** `FRONTEND/e2e/organization-standard-modals.spec.ts`
- **Mocks API (sem backend):** `FRONTEND/e2e/helpers/mock-api-for-config-pages.ts` — `installApiMocksForConfigIntegrationFlows` / `installApiMocksForOrganizationStandardModals` (alias). Login simulado por **email do POST** (`gestor.ti@…` → Manager; `admin@g360.com.br` → Super Admin global). GETs dedicados: `/fiscal-years`, `/roles`, `/users`, `/tenants`, `/tenants/dashboard-stats`, `/global-settings/system-health`; resto genérico.
- **`data-testid`:** abas `org-tab-{id}` em `OrganizationPage`; botões `fiscal-year-add`, `role-add`, `user-add-local`, `tenant-add`.
- **Snapshots Playwright (baseline, win32):** pasta `FRONTEND/e2e/organization-standard-modals.spec.ts-snapshots/`
  - `org-modal-fiscal-year-shell-chromium-win32.png`
  - `org-modal-role-shell-chromium-win32.png`
  - `org-modal-user-shell-chromium-win32.png`
  - `org-modal-tenant-shell-chromium-win32.png`
- **Comando:** `npm run test:e2e -- e2e/organization-standard-modals.spec.ts` ou `npm run test:e2e:update-snapshots -- e2e/organization-standard-modals.spec.ts` (porta **5176**, `playwright.g360.config.ts`).
