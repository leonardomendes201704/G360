# Inventário: listas e grelhas (tipo Portal de Chamados)

Referência de UX: **[Portal de Suporte — Meus Chamados](../../FRONTEND/src/pages/helpdesk/PortalPage.jsx)** — MUI `Table` + `TableSortLabel` + `TablePagination` + `FilterDrawer` + `KpiGrid` / `StatsCard` + chips de estado + coluna de ações.

Componentes base existentes:

- **`StandardGrid`** — [`StandardGrid.jsx`](../../FRONTEND/src/components/common/StandardGrid.jsx): tabela MUI com busca interna, ordenação e paginação (linhas planas `columns`/`rows`).
- **`DataListShell`** — [`DataListShell.jsx`](../../FRONTEND/src/components/common/DataListShell.jsx): cartão com cabeçalho (título, contagem opcional, toolbar) e área para tabela/lista customizada.

---

## Grupo A — Páginas com `FilterDrawer` (shell próximo do Portal)

| Área | Ficheiro | Notas |
|------|----------|--------|
| Helpdesk | `FRONTEND/src/pages/helpdesk/PortalPage.jsx` | Referência; `TableSortLabel` + `TablePagination`; casca **`DataListShell`** na secção «Meus Chamados» (US-024). |
| Projetos | `FRONTEND/src/pages/projects/ProjectsListPage.jsx` | **`DataListTable`** em modo **servidor** (`paginationMode: 'server'`, sort/paginação via API); `projectListColumns.jsx`; busca na toolbar do shell. |
| Incidentes | `FRONTEND/src/pages/incidents/IncidentsPage.jsx` | Lista: **`DataListTable`** (`incidentListColumns`, `sortIncidentsRows`); casca partilhada com Kanban via **`DataListShell`**; Kanban alternativo. |
| GMUD | `FRONTEND/src/pages/changes/ChangeRequestsPage.jsx` | Dashboard + vista Lista: **`DataListTable`**; `ChangeRequestDashboard.jsx` reutiliza as mesmas colunas/ordenação. Calendário em **`DataListShell`**. |
| Fornecedores | `FRONTEND/src/pages/suppliers/SuppliersPage.jsx` | **`DataListTable`** (`supplierListColumns`, `supplierListSort`, `supplierListUtils`); `FilterDrawer` + `BulkActionsBar` + busca; `tabela-fornecedores`. |
| Contratos | `FRONTEND/src/pages/contracts/ContractsPage.jsx` | **`DataListTable`** (`contractListColumns`, `contractListSort`, `contractListUtils`); `FilterDrawer` + export + busca na toolbar; `tabela-contratos`. |
| Base de conhecimento | `FRONTEND/src/pages/KnowledgeBasePage.jsx` | Modo lista: **`DataListTable`** (`knowledgeArticleListColumns`, `sortKnowledgeArticleRows`); grelha de cartões inalterada; vazio rico com **`EmptyState`** (CTA) quando `KB` CREATE. |
| Tarefas | `FRONTEND/src/pages/tasks/TasksPage.jsx` | Lista/Kanban/Planning; modo **lista** com **`DataListTable`** (`taskListColumns.jsx`, `taskListSort.js`); `BulkActionsBar` em `renderBeforeTable`. |
| Ativos | `FRONTEND/src/pages/assets/AssetsPage.jsx` | Vista **Hardware** e **Licenças:** **`DataListTable`** (`assetListColumns` / `licenseListColumns`, `sortAssetRows` / `sortLicenseRows`); hardware com **`BulkActionsBar`** em `renderBeforeTable`; clique na linha abre vista (`AssetViewModal` distingue ativo/licença). |

---

## Grupo B — Tabela MUI (`TableContainer` / `TablePagination`) sem `FilterDrawer` no mesmo critério de grep

Migrado com **`DataListShell`** (**EP-010** / US-025, US-026).

| Área | Ficheiro | Notas |
|------|----------|--------|
| Helpdesk | `FRONTEND/src/pages/helpdesk/ProblemManagement.jsx` | **`DataListTable`** (`problemListColumns`, `sortProblemsRows`); US-025. |
| Riscos | `FRONTEND/src/pages/RisksPage.jsx` | Modo **lista** (toggle): **`DataListTable`** (`risks/riskListColumns`, `risks/riskListSort`, `risks/riskListUtils`); `BulkActionsBar`; dashboard/heatmap inalterados; `tabela-riscos`. |
| Financeiro | `FRONTEND/src/pages/finance/FinancePage.jsx` | Sep. **Orçamentos** e **Plano de contas:** **`DataListTable`** (`budgetListColumns`/`accountListColumns`, sorts dedicados; `tabela-orcamentos`, `tabela-plano-contas`). |
| Financeiro | `FRONTEND/src/pages/finance/ExpensesPage.jsx` | Contas a pagar: **`DataListTable`** (`expenseListColumns`, `expenseListSort`; `tabela-despesas`), embutida no separador «Despesas» de `/finance`. |
| Financeiro | `FRONTEND/src/pages/finance/DREPage.jsx` | Tabela MUI com **linhas expansíveis** (detalhe mensal aninhado); continua fora do padrão `DataListTable` em massa. «Detalhamento Mensal» com **`DataListShell`** (US-026) onde aplicável. |
| Tarefas | `FRONTEND/src/pages/tasks/TimeReportPage.jsx` | Resumo por colaborador + detalhamento: **`DataListShell`** (US-026). |
| Service desk | `FRONTEND/src/pages/servicedesk/ServiceDeskDashboard.jsx` | Tabela de chamados: **`DataListShell`** (US-026). |
| Service desk | `FRONTEND/src/pages/servicedesk/CatalogAdmin.jsx` | `CatalogAdminPanel`: três separadores com **`DataListTable`** (`catalogServiceList*`, `catalogCategoryList*`, `catalogSlaList*`); `tabela-catalogo-servicos`, `tabela-catalogo-categorias`, `tabela-catalogo-slas`. |
| Contratos | `FRONTEND/src/pages/contracts/ContractDetailsPage.jsx` | Sep. **Anexos:** **`DataListTable`** (`contractAttachmentListColumns`, `contractAttachmentListSort`; `tabela-contrato-anexos`). Sep. **Aditivos:** lista em `<ul>` com **`DataListShell`** (US-026). |

---

## Grupo C — `<table>` HTML (financeiro, config, relatórios)

| Ficheiro |
|----------|
| `FRONTEND/src/pages/finance/BudgetDetailsPage.jsx` |
| `FRONTEND/src/pages/finance/BudgetComparisonPage.jsx` |
| `FRONTEND/src/pages/config/OrganizationPage.jsx` |
| `FRONTEND/src/pages/servicedesk/ServiceDeskSettings.jsx` |
| `FRONTEND/src/pages/projects/TeamProjectsStatusReport.jsx` |

---

## Grupo D — Lista densa sem `<table>` (grid/flex)

| Ficheiro | Notas |
|----------|--------|
| `FRONTEND/src/pages/admin/TenantAdminPage.jsx` | Cabeçalho + linhas em CSS Grid. |
| `FRONTEND/src/pages/admin/ActivityLogPage.jsx` | Vista lista: linhas flex. |
| `FRONTEND/src/pages/approvals/MyApprovalsPage.jsx` | Cartões / lista de aprovações. |

---

## Grupo E — Componentes (tabs de projeto, modais, config)

Inclui (entre outros): `ProjectTasksList.jsx`, `ProjectRisks.jsx`, `ProjectCosts.jsx`, `ProjectProposals.jsx`, `UsersTab.jsx`, `TenantsTab.jsx`, `RolesTab.jsx`, `FreezeWindowsTab.jsx`, `ContractModal.jsx`, `AzureConfigModal.jsx`, `UserImportModal.jsx`, `AssetModal.jsx`, `AssetViewModal.jsx`.

**DataGrid (`@mui/x-data-grid`):** não usado no inventário atual; o projeto usa sobretudo MUI `Table` ou HTML `<table>`.

---

## Próximos passos (padronização)

1. Reutilizar **`DataListShell`** + **`StandardGrid`** onde os dados forem linhas planas com colunas homogéneas.
2. Alinhar barra de filtros (`FilterDrawer`), KPIs (`KpiGrid`), vazio (`EmptyState`) e loading (`TableSkeleton`) ao padrão do Portal.
3. Migrar **Grupo B** (`EP-010`) e Grupos C/D avaliar caso a caso (tabelas pivot vs lista).

**Plano de migração restante (`DataListTable`), ordem sugerida fase a fase:** [data-list-table-migration-plan.md](./data-list-table-migration-plan.md).

Ver também: [data-grid-shell.md](data-grid-shell.md).
