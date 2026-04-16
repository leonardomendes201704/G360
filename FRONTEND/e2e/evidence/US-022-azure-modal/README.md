# US-022 — evidência: modal Azure AD (`StandardModal`)

- **Spec E2E:** `FRONTEND/e2e/integrations-azure-modal.spec.ts`
- **Snapshot Playwright:** `FRONTEND/e2e/integrations-azure-modal.spec.ts-snapshots/integrations-azure-modal-shell-chromium-win32.png` — criado após login OK com **backend + seed** (`npm run test:e2e:update-snapshots -- e2e/integrations-azure-modal.spec.ts`)
- **Comando:** `npm run test:e2e -- e2e/integrations-azure-modal.spec.ts` (usa `playwright.g360.config.ts` via `npm run test:e2e`)
- **Sem API:** o teste falha no `loginAs`; validação manual: Configurações → Integrações → Configurar no cartão Microsoft Azure AD.
