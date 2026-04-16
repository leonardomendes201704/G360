# Changelog

Todas as alteracoes relevantes do projeto G360 serao documentadas neste arquivo.
Formato baseado em [Keep a Changelog](https://keepachangelog.com/).

---

## [2026-04-16]

### Changed
- **US-022 / EP-008 — domínio Ativos:** `AssetModal` (`wide`), `AssetViewModal` (`detail`; campos extraídos para componentes estáticos), `AssetMaintenanceModal` (`form`; botão salvar `contained`/`warning`); `AssetModal` passa a renderizar `AssetMaintenanceModal` como irmão do shell; validação de contrato em ativo locado com mensagem visível.
  - `FRONTEND/src/components/modals/AssetModal.jsx`
  - `FRONTEND/src/components/modals/AssetViewModal.jsx`
  - `FRONTEND/src/components/modals/AssetMaintenanceModal.jsx`
  - `docs/backlog/EP-008-padronizacao-modais-frontend/INVENTARIO-MODAIS.md`

### Changed
- **US-022 / EP-008:** Segundo lote de modais em `StandardModal`: `AddendumViewModal`, `SupplierViewModal` (`wide`; secções `DataField` extraídas para evitar componentes dentro do render), `ApprovalDetailsModal` (`loading` na API), `MinuteModal` (form + `loading`), `FollowUpModal` (corpo com classes existentes), `TeamModal`, `ProjectTaskModal` (`paperProps` com `data-testid`); `StandardModal` aceita `paperProps` opcional para o Paper do MUI `Dialog`.
  - `FRONTEND/src/components/common/StandardModal.jsx`
  - `FRONTEND/src/components/modals/AddendumViewModal.jsx`
  - `FRONTEND/src/components/modals/SupplierViewModal.jsx`
  - `FRONTEND/src/components/modals/ApprovalDetailsModal.jsx`
  - `FRONTEND/src/components/modals/MinuteModal.jsx`
  - `FRONTEND/src/components/modals/FollowUpModal.jsx`
  - `FRONTEND/src/components/modals/TeamModal.jsx`
  - `FRONTEND/src/components/modals/ProjectTaskModal.jsx`
  - `docs/backlog/EP-008-padronizacao-modais-frontend/INVENTARIO-MODAIS.md`

### Changed
- **US-022 / EP-008:** Oito modais migrados para `StandardModal` (cabeçalho, corpo com scroll, rodapé sem gradiente; `loading` onde aplicável): `AssetCategoryModal`, `PaymentConditionModal`, `MemberModal`, `AddMemberModal`, `BudgetImportModal`, `BudgetItemModal` (`wide`), `SupplierModal` (`wide`), `AddendumFormModal` (`detail`; primário `primary` / `error` conforme acréscimo ou supressão).
  - `FRONTEND/src/components/modals/AssetCategoryModal.jsx`
  - `FRONTEND/src/components/modals/PaymentConditionModal.jsx`
  - `FRONTEND/src/components/modals/MemberModal.jsx`
  - `FRONTEND/src/components/modals/AddMemberModal.jsx`
  - `FRONTEND/src/components/modals/BudgetImportModal.jsx`
  - `FRONTEND/src/components/modals/BudgetItemModal.jsx`
  - `FRONTEND/src/components/modals/SupplierModal.jsx`
  - `FRONTEND/src/components/modals/AddendumFormModal.jsx`
  - `docs/backlog/EP-008-padronizacao-modais-frontend/INVENTARIO-MODAIS.md`

### Changed
- **US-022 / EP-008:** `UserImportModal` migrado para `StandardModal` (importação Azure AD na aba Usuários; `size="detail"`; `loading` durante importação; `data-testid="user-import-modal-footer"`).
  - `FRONTEND/src/components/modals/UserImportModal.jsx`
  - `docs/backlog/EP-008-padronizacao-modais-frontend/INVENTARIO-MODAIS.md`

### Docs
- **Diário de trabalho (fora do Git):** orientação para entradas em prosa legível em **pt-BR** (`D:\Leonardo\Diario\README.md`); regra `.cursor/rules/work-diary.mdc` e secção em `CLAUDE.md` / `docs/trabalho-diario/README.md` alinhadas (título e texto humanos; vocabulário brasileiro: atualizar, registro, usuário, tela, arquivo; changelog do repositório mantém o detalhe técnico).

### Added
- **E2E modais Organização (US-022):** `e2e/organization-standard-modals.spec.ts` com snapshots `org-modal-*-shell-chromium-win32.png`; mocks alargados (`login` por email, GET `/fiscal-years`, `/roles`, `/users`, `/tenants`, `/tenants/dashboard-stats`, `/global-settings/system-health`); `data-testid` em abas da `OrganizationPage` e botões “Novo…” nas tabs; evidências em `e2e/evidence/US-022-org-modals/README.md`.
  - `FRONTEND/e2e/helpers/mock-api-for-config-pages.ts`
  - `FRONTEND/e2e/organization-standard-modals.spec.ts`
  - `FRONTEND/e2e/organization-standard-modals.spec.ts-snapshots/`
  - `FRONTEND/src/pages/config/OrganizationPage.jsx`
  - `FRONTEND/src/components/config/FiscalYearTab.jsx`, `RolesTab.jsx`, `UsersTab.jsx`, `TenantsTab.jsx`

### Changed
- **US-022 / EP-008:** `FiscalYearModal`, `RoleModal`, `UserModal` e `TenantModal` migrados para `StandardModal` (cabeçalho, corpo com scroll, rodapé sem gradiente; `RoleModal` em `size="wide"` para a matriz RBAC).
  - `FRONTEND/src/components/modals/FiscalYearModal.jsx`
  - `FRONTEND/src/components/modals/RoleModal.jsx`
  - `FRONTEND/src/components/modals/UserModal.jsx`
  - `FRONTEND/src/components/modals/TenantModal.jsx`
  - `docs/backlog/EP-008-padronizacao-modais-frontend/INVENTARIO-MODAIS.md`

### Added
- **E2E Azure modal:** mocks em `FRONTEND/e2e/helpers/mock-api-for-config-pages.ts` para `integrations-azure-modal.spec.ts` sem backend; snapshot `e2e/integrations-azure-modal.spec.ts-snapshots/integrations-azure-modal-shell-chromium-win32.png`.

### Changed
- **Porta dev Vite / Playwright:** frontend G360 na **5176** por predefinição (`VITE_DEV_PORT` opcional) para não colidir com outro projeto na **5173**; `playwright.config.ts`, `playwright.g360.config.ts`, `FRONTEND_URL` no backend e scripts em `FRONTEND/scripts/` alinhados.
  - `FRONTEND/vite.config.js`
  - `FRONTEND/playwright.config.ts`
  - `FRONTEND/playwright.g360.config.ts`
  - `BACKEND/src/app.js`
  - `BACKEND/src/services/email-template.service.js`
  - `README.md`, `CLAUDE.md`, `.cursor/rules/playwright-evidence.mdc`
- **`AzureConfigModal`:** migrado para `StandardModal` (Integrações — Microsoft Azure AD); footer com Testar / Cancelar / Salvar; spec E2E `e2e/integrations-azure-modal.spec.ts` e `data-testid` `integration-open-*` em `IntegrationsTab`.
  - `FRONTEND/src/components/modals/AzureConfigModal.jsx`
  - `FRONTEND/src/components/config/IntegrationsTab.jsx`
  - `FRONTEND/e2e/integrations-azure-modal.spec.ts`
  - `FRONTEND/e2e/evidence/US-022-azure-modal/README.md`
  - `docs/patterns/modal-shell.md`
  - `docs/backlog/EP-008-padronizacao-modais-frontend/INVENTARIO-MODAIS.md`
- **`SmtpConfigModal`:** migrado para `StandardModal` (Integrações — e-mail SMTP); carregamento inicial vs. salvamento separados para não ocultar o formulário ao salvar.
  - `FRONTEND/src/components/modals/SmtpConfigModal.jsx`
  - `docs/backlog/EP-008-padronizacao-modais-frontend/INVENTARIO-MODAIS.md`
- **US-022 / EP-008 (encerrados):** `ConfirmDialog` passa a usar `StandardModal`; lote 2 financeiro (`BudgetModal`, `AccountModal`, `CostCenterModal`); `FreezeWindowsTab` sem `Dialog` inline; inventario e backlog actualizados.
  - `FRONTEND/src/components/common/ConfirmDialog.jsx`
  - `FRONTEND/src/components/modals/BudgetModal.jsx`
  - `FRONTEND/src/components/modals/AccountModal.jsx`
  - `FRONTEND/src/components/modals/CostCenterModal.jsx`
  - `FRONTEND/src/components/admin/FreezeWindowsTab.jsx`
  - `docs/patterns/modal-shell.md`
  - `docs/backlog/EP-008-padronizacao-modais-frontend/EPIC.md`
  - `docs/backlog/EP-008-padronizacao-modais-frontend/US-022-padronizacao-modais-shell-e-migracao.md`
  - `docs/backlog/EP-008-padronizacao-modais-frontend/INVENTARIO-MODAIS.md`
  - `docs/backlog/_INDEX.md`

### Docs
- **CLAUDE.md:** diretriz obrigatória — ao concluir task ou entrega com alterações no repositório, **`git commit`** + **`git push`** (Regras de Gestão §7; fluxo de trabalho).
- **Playwright / evidencias E2E:** secção **Validacao E2E com Playwright e evidencias** no `CLAUDE.md`; regra `.cursor/rules/playwright-evidence.mdc`; pasta convencional `FRONTEND/e2e/evidence/` com `README.md` (validacao por tarefa, caminhos das evidencias no fecho).
- **Diário de trabalho:** destino canónico outra vez **`D:\Leonardo\Diario\diary.md`**; `CLAUDE.md`, `.cursor/rules/work-diary.mdc` e `docs/trabalho-diario/README.md` atualizados; `docs/trabalho-diario/diary.md` no repo passa a ser nota de redirecionamento.

### Fixed
- **Vitest:** `OrganizationPage` envolvido em `MemoryRouter` (uso de `useSearchParams`); KPI **Valor Patrimônio** em `AssetsPage` assert com formato compacto `Intl` pt-BR e `getAllByText` quando o valor aparece mais do que uma vez.
  - `FRONTEND/src/pages/config/__tests__/OrganizationPage.test.jsx`
  - `FRONTEND/src/pages/assets/__tests__/AssetsPage.test.jsx`
- **`StandardModal`:** `DialogContent` com `padding-top` explícito (`spacing(3) !important`) para contrariar o reset do MUI após `DialogTitle`, evitando cortar labels de campos (ex.: LDAP **Porta**).
- **`StandardModal`:** `padding-bottom` do corpo com `calc(spacing(2) + 5px)` para mais respiro acima do footer.

### Changed
- **`StandardModal`:** botões do array `actions` sem gradiente no último botão — `contained` + `primary` do tema (`textTransform: none`, `fontWeight: 600`).
- **`StandardModal`:** layout em coluna com corpo scrollável e rodapé fixo; presets `size` (`form`/`detail`/`wide`/`xl`); prop `footer` para ações customizadas; raio `--g360-radius-modal`; `aria-labelledby`.
  - `FRONTEND/src/components/common/StandardModal.jsx`
- **`LdapConfigModal`:** passa a usar `StandardModal`; formulário com `footer` assimétrico (testar conexão + cancelar/salvar).
  - `FRONTEND/src/components/modals/LdapConfigModal.jsx`
- **`IntegrationsTab`:** cartão **AD Local (LDAP)** abre o `LdapConfigModal` (integração visível na aba Integrações).
  - `FRONTEND/src/components/config/IntegrationsTab.jsx`
- **US-022 (lote 1):** `NotificationsModal` e `RescheduleModal` migrados para `StandardModal` (cabeçalho + corpo scroll + footer).
  - `FRONTEND/src/components/modals/NotificationsModal.jsx`
  - `FRONTEND/src/components/modals/RescheduleModal.jsx`
- **US-022 (lote 1):** `DepartmentModal` migrado para `StandardModal` (formulário diretoria / `OrganizationPage`).
  - `FRONTEND/src/components/modals/DepartmentModal.jsx`

### Added
- **Playwright:** `FRONTEND/playwright.g360.config.ts` — mesma porta predefinida do Vite (**5176**); `PLAYWRIGHT_PORT` / `VITE_DEV_PORT` para override; scripts `npm run test:e2e` e `npm run test:e2e:update-snapshots` no `package.json` do frontend.
- **Testes** `StandardModal`: `FRONTEND/src/components/common/__tests__/StandardModal.test.jsx`
- **Padrão** `docs/patterns/modal-shell.md` — API, presets, validação manual e comando Vitest.

### Docs
- **EP-008 / US-022 — Padronização de modais (frontend):** épico, inventário de `Dialog`/modais no `FRONTEND`, PBI/US com tasks e boas práticas em `docs/backlog/EP-008-padronizacao-modais-frontend/`.
  - `docs/backlog/EP-008-padronizacao-modais-frontend/EPIC.md`
  - `docs/backlog/EP-008-padronizacao-modais-frontend/INVENTARIO-MODAIS.md`
  - `docs/backlog/EP-008-padronizacao-modais-frontend/US-022-padronizacao-modais-shell-e-migracao.md`
  - `docs/backlog/_INDEX.md`
- **Diário de trabalho no repositório:** registo de tarefas em `docs/trabalho-diario/diary.md` (versionado); `docs/trabalho-diario/README.md`, `CLAUDE.md` e `.cursor/rules/work-diary.mdc` alinhados — o diário como projeto à parte não substitui o registo no G360.
  - `docs/trabalho-diario/diary.md`
  - `docs/trabalho-diario/README.md`
  - `CLAUDE.md`
  - `.cursor/rules/work-diary.mdc`

### Added
- **Seed 3 áreas (workflow E2E):** três departamentos + centros de custo, gestores e colaboradores, projeto + tarefa de projeto + tarefa operacional + incidente + risco (owner = colaborador) + ativo + GMUD + despesa; script `npm run seed:three-areas:all` em todos os tenants. E2E `e2e/three-areas-isolation.spec.ts` (projetos por gestor; incidentes/riscos por colaborador TI). `data-testid="risks-view-list"` na página de riscos para alternar para lista.
  - `BACKEND/src/scripts/seed-three-areas-workflow.js`
  - `BACKEND/src/scripts/seed-three-areas-all-tenants.js`
  - `BACKEND/package.json` (script `seed:three-areas:all`)
  - `FRONTEND/e2e/three-areas-isolation.spec.ts`
  - `FRONTEND/e2e/helpers/auth.helper.ts`
  - `FRONTEND/src/pages/RisksPage.jsx`
- **Seed de fornecedores:** script idempotente com 10 fornecedores de demonstração (CNPJ com dígitos válidos, classificações CRITICO/ESTRATEGICO/OPERACIONAL/OUTROS); execução em todos os tenants ativos (`npm run seed:suppliers:all`).
  - `BACKEND/src/scripts/seed-suppliers.js`
  - `BACKEND/src/scripts/seed-suppliers-all-tenants.js`
  - `BACKEND/package.json` (script `seed:suppliers:all`)

---

## [2026-04-15]

### Changed
- **Form controls radius:** Padrao unificado **8px** para campos outline, Autocomplete, Select e paineis de menu/popover (alinhado ao login). Token global `--g360-radius-input` em `index.css`; overrides em `lightPremiumTheme.js` e `darkPremiumTheme.js`; login usa a mesma variavel no `inputStyle`.
  - `FRONTEND/src/index.css`
  - `FRONTEND/src/theme/lightPremiumTheme.js`
  - `FRONTEND/src/theme/darkPremiumTheme.js`
  - `FRONTEND/src/pages/auth/LoginPage.jsx`
- **Modais (Dialog):** Tema light — removido override duplicado de `.MuiDialog-paper` com `border-radius: 16px !important`; uso de `--g360-radius-modal` (**8px**) alinhado aos campos. `MuiDialog` nos temas JS com `paper.borderRadius: 8`.
  - `FRONTEND/src/index.css`
  - `FRONTEND/src/styles/lightPremiumTheme.css`
  - `FRONTEND/src/theme/lightPremiumTheme.js`
  - `FRONTEND/src/theme/darkPremiumTheme.js`
- **TaskModal / inputs em Dialog:** `TaskModal` aplicava `borderRadius: 12px`/`10px` no `sx` dos `TextField`/`Select`, sobrescrevendo o tema; unificado a `G360_INPUT_RADIUS` (`--g360-radius-input`). `Paper` do Dialog deixou de usar 24px fixo. CSS light: `.MuiDialog-root .MuiOutlinedInput-root` com `border-radius` **8px** `!important` como rede de segurança.
  - `FRONTEND/src/components/modals/TaskModal.jsx`
  - `FRONTEND/src/styles/lightPremiumTheme.css`

### Fixed
- **Dropdown "Atribuir a" em nova tarefa vazio / validação "Atribuído a é obrigatório":** A lista de usuários vinha de `GET /users` (exige `CONFIG:READ`) ou o `TaskModal` era aberto sem a prop `members`. Ajuste: `GET /api/v1/reference/users` autorizado para perfis operacionais (Tarefas, Projetos, Incidentes, etc.); telas e dashboards passam a usar `getReferenceUsers()` e a popular `members` no modal.
  - `BACKEND/src/routes/reference.routes.js`
  - `FRONTEND/src/services/reference.service.js` (já existia; consumo ampliado)
  - Vários modulos: `TasksPage`, `IncidentsPage`, dashboards, `ManagerDashboard`, etc.
- **BUG-005:** Tema Light — botao `color="secondary"` + `variant="contained"` (ex.: "Declarar Problema" em Gestao de Problemas ITIL) voltou a exibir texto escuro; a regra US-010 aplicava `color: #fff` a todo `.MuiButton-contained`, sobrescrevendo o estilo de secundario. Restrito a `containedPrimary` e variantes semanticas (Error/Success/Warning/Info).
  - `FRONTEND/src/styles/lightPremiumTheme.css`
  - `docs/backlog/BUGS.md`
  - `docs/backlog/_INDEX.md`

### Changed
- **US-021 (EP-007):** Gestao de Incidentes — filtros estruturados (status, prioridade, categoria, responsavel, SLA) no `FilterDrawer` off-canvas; barra compacta com contagem de filtros ativos e "Limpar tudo"; busca permanece na lista. Padrao documentado em `docs/patterns/filter-drawer.md`.
  - `FRONTEND/src/pages/incidents/IncidentsPage.jsx`
  - `docs/patterns/filter-drawer.md`
  - `docs/backlog/EP-007-padronizacao-filtros-modulos/EPIC.md`
  - `docs/backlog/EP-007-padronizacao-filtros-modulos/US-021-filtros-incidentes-drawer.md`
  - `docs/backlog/_INDEX.md`
- **US-018/US-019:** Modal Novo Tenant (`TenantAdminPage`): layout flex com area rolavel e footer fixo; fechamento imediato apos criacao com sucesso + snackbar; `await` em create/update; `TenantModal` (aba Empresas) com mesmo padrao e fechamento sem delay artificial.
  - `FRONTEND/src/pages/admin/TenantAdminPage.jsx`
  - `FRONTEND/src/components/modals/TenantModal.jsx`
- **US-020:** `StatsCard`: titulos KPI em linha unica (`nowrap` + ellipsis + tooltip); teste Vitest.
  - `FRONTEND/src/components/common/StatsCard.jsx`
  - `FRONTEND/src/components/common/StatsCard.test.jsx`

### Added
- E2E Playwright `e2e/tenant-modal-and-kpi.spec.ts`; `data-testid` em opcoes de tenant no login e no footer do modal.
- Helpers E2E: `E2E_ADMIN_PASSWORD`, `E2E_MANAGER_PASSWORD`, `E2E_COLLABORATOR_PASSWORD`, `E2E_PASSWORD`; `playwright.config` usa `http://localhost:5176` por padrao (`PLAYWRIGHT_BASE_URL` opcional).

## [2026-04-12]

### Changed
- **US-014:** Secao de boas-vindas compactada: padding reduzido, botoes com tamanho fixo (80px) sem quebra de texto, engrenagem reposicionada a direita do score no topo
- **US-015:** Score exibe "0" ao inves de "–" quando zerado; label mostra "Sem dados" ou "Sem atividade"; score ring reduzido (100→90px)
- **US-016:** KPIs do dashboard validados — MetricCard interno ja segue padrao consistente
- **US-017:** Grafico de incidentes 220→280px; atividades recentes em largura total (100%); saude da equipe em grid 2 colunas
  - `FRONTEND/src/pages/dashboard/ManagerOverview.jsx`

### Fixed
- **US-010:** Corrigido contraste de botoes no tema light. CSS global `color: var(--light-text-primary) !important` sobrepunha `color: white` de botoes. Adicionada regra CSS para garantir texto branco em botoes contained/primarios.
  - `FRONTEND/src/styles/lightPremiumTheme.css`

### Changed
- **US-011:** Reduzido arredondamento do submenu do usuario (borderRadius 3→2), adicionada borda e largura minima ajustada (180→200px).
  - `FRONTEND/src/components/layout/MainLayout.jsx`
- **US-012:** Searchbar ja possuia icone de lupa (`<Search>` do MUI Icons) — validado sem necessidade de alteracao.
- **US-013:** Piloto de aplicacao dos componentes padrao concluido em MyApprovalsPage (EP-002). Rollout completo nas demais telas sera incremental.

### Added
- **US-005:** Componente `StandardGrid` — tabela padronizada com busca, ordenacao, paginacao e acoes por linha
  - `FRONTEND/src/components/common/StandardGrid.jsx`
- **US-006:** Componente `KpiGrid` + adaptacao do `StatsCard` existente com suporte a `onClick`, `iconName` e `hexColor`
  - `FRONTEND/src/components/common/KpiGrid.jsx`
  - `FRONTEND/src/components/common/StatsCard.jsx` (editado)
- **US-007:** Componente `FilterDrawer` — painel off-canvas lateral para filtros com MUI Drawer
  - `FRONTEND/src/components/common/FilterDrawer.jsx`
- **US-008:** Componente `LoadingOverlay` — overlay semi-transparente reutilizavel com spinner
  - `FRONTEND/src/components/common/LoadingOverlay.jsx`
- **US-009:** Componente `StandardModal` — wrapper padronizado do MUI Dialog com header, footer e loading
  - `FRONTEND/src/components/common/StandardModal.jsx`

### Changed
- **MyApprovalsPage** refatorada como piloto: KPIs inline substituidos por `StatsCard` + `KpiGrid`, overlay inline substituido por `LoadingOverlay`
  - `FRONTEND/src/pages/approvals/MyApprovalsPage.jsx`

### Fixed
- **US-004/BUG-004:** Corrigido erro ao clicar em "Nova GMUD". Dois bugs: (1) `projectService.getAll()` retornava objeto paginado `{data, meta}` sendo tratado como array — causava `TypeError: projectsList.map is not a function`. (2) Guard `if (!open || !mounted)` no ChangeModal criava deadlock impedindo modal de abrir.
  - `FRONTEND/src/components/modals/ChangeModal.jsx`
- **US-003/BUG-003:** Corrigido layout shift ao navegar entre categorias na tela de Aprovacoes. Lista de items agora permanece renderizada com overlay de loading por cima (ao inves de desmontar). Adicionado estado `switching`, `minHeight` no container e preservacao de scroll.
  - `FRONTEND/src/pages/approvals/MyApprovalsPage.jsx`
- **US-002/BUG-002:** Corrigido Portal do Suporte que nao permitia abrir chamados no tenant Devcraft Studio. Causa: tabelas `ServiceCatalog` e `TicketCategory` nao existiam no schema `tenant_devcraft` (migrations/seed nunca executados). Solucao: executado `npm run deploy:tenants`.
  - Nenhum arquivo de codigo alterado — problema operacional (migrations/seed pendentes)
- **US-001/BUG-001:** Corrigido comportamento de "pisca" ao salvar tenant. Modal agora exibe loading (`CircularProgress`), feedback de sucesso (`Alert`) e so fecha apos dados serem atualizados no backend. Corrigido `useEffect` que resetava campos durante animacao de fechamento.
  - `FRONTEND/src/components/modals/TenantModal.jsx` — Estados saving/success, bloqueio de close durante save, guard `!open` no useEffect
  - `FRONTEND/src/pages/admin/TenantAdminPage.jsx` — Reordenado close apos await fetch em handleCreate e handleUpdate

### Added
- **Backlog completo** com 4 Epicos, 17 User Stories, 4 Bugs (83 Story Points) organizados em 4 fases de priorizacao, formato Azure DevOps
  - `docs/backlog/_INDEX.md` — Indice geral com resumo e metricas
  - `docs/backlog/BUGS.md` — Registro de 4 bugs criticos
  - `docs/backlog/EP-001-correcoes-criticas/` — 4 historias (US-001 a US-004)
  - `docs/backlog/EP-002-componentes-reutilizaveis/` — 5 historias (US-005 a US-009)
  - `docs/backlog/EP-003-padronizacao-visual/` — 4 historias (US-010 a US-013)
  - `docs/backlog/EP-004-melhorias-ux-dashboard/` — 4 historias (US-014 a US-017)

### Docs
- **CLAUDE.md** criado com diretrizes do agente: gestao de backlog, templates Azure DevOps, regras de gestao, diretriz de documentacao de conclusao de tasks, diretriz de changelog
  - `CLAUDE.md`
- **README.md** criado com documentacao completa do projeto: arquitetura, stack, instalacao, execucao, testes e deploy
  - `README.md`
- **.gitignore** criado com exclusoes para node_modules, .env, logs, chaves SSL, backups SQL
  - `.gitignore`

---

*Mantido pelo agente Claude conforme diretriz do CLAUDE.md*
