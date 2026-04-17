# Inventário: listas e grelhas (tipo Portal de Chamados)

Referência de UX: **[Portal de Suporte — Meus Chamados](../../FRONTEND/src/pages/helpdesk/PortalPage.jsx)** — MUI `Table` + `TableSortLabel` + `TablePagination` + `FilterDrawer` + `KpiGrid` / `StatsCard` + chips de estado + coluna de ações.

Componentes base existentes:

- **`StandardGrid`** — [`StandardGrid.jsx`](../../FRONTEND/src/components/common/StandardGrid.jsx): tabela MUI com busca interna, ordenação e paginação (linhas planas `columns`/`rows`).
- **`DataListShell`** — [`DataListShell.jsx`](../../FRONTEND/src/components/common/DataListShell.jsx): cartão com cabeçalho (título, contagem opcional, toolbar) e área para tabela/lista customizada.

---

## Grupo A — Páginas com `FilterDrawer` (shell próximo do Portal)

| Área | Ficheiro | Notas |
|------|----------|--------|
| Helpdesk | `FRONTEND/src/pages/helpdesk/PortalPage.jsx` | Referência; `TableSortLabel` + `TablePagination`. |
| Projetos | `FRONTEND/src/pages/projects/ProjectsListPage.jsx` | `<table>` + CSS; ordenação própria; cabeçalho **`DataListShell`** + classe `pl-projects-table-card`. |
| Incidentes | `FRONTEND/src/pages/incidents/IncidentsPage.jsx` | Lista: `IncidentList` (`<table>`); casca **`DataListShell`**; Kanban alternativo. |
| GMUD | `FRONTEND/src/pages/changes/ChangeRequestsPage.jsx` | `ChangeRequestList` (MUI `Table`); paginação custom. |
| Fornecedores | `FRONTEND/src/pages/suppliers/SuppliersPage.jsx` | `<table>`; **cabeçalho de lista** via `DataListShell`. |
| Contratos | `FRONTEND/src/pages/contracts/ContractsPage.jsx` | `<table>`; cabeçalho **`DataListShell`** (export + busca). |
| Base de conhecimento | `FRONTEND/src/pages/KnowledgeBasePage.jsx` | Modo lista: **`DataListShell`** + `ArticleTable` (`embedded`); grelha inalterada. |
| Tarefas | `FRONTEND/src/pages/tasks/TasksPage.jsx` | Lista/Kanban/Planning — não só tabela. |
| Ativos | `FRONTEND/src/pages/assets/AssetsPage.jsx` | `<table>` (lista de ativos + licenças); **`DataListShell`** em ambas as secções; `filteredLicenses` em `useMemo`. |

---

## Grupo B — Tabela MUI (`TableContainer` / `TablePagination`) sem `FilterDrawer` no mesmo critério de grep

| Ficheiro |
|----------|
| `FRONTEND/src/pages/finance/FinancePage.jsx` |
| `FRONTEND/src/pages/finance/DREPage.jsx` |
| `FRONTEND/src/pages/tasks/TimeReportPage.jsx` |
| `FRONTEND/src/pages/RisksPage.jsx` |
| `FRONTEND/src/pages/helpdesk/ProblemManagement.jsx` |
| `FRONTEND/src/pages/servicedesk/ServiceDeskDashboard.jsx` |
| `FRONTEND/src/pages/servicedesk/CatalogAdmin.jsx` |
| `FRONTEND/src/pages/contracts/ContractDetailsPage.jsx` |

---

## Grupo C — `<table>` HTML (financeiro, config, relatórios)

| Ficheiro |
|----------|
| `FRONTEND/src/pages/finance/ExpensesPage.jsx` |
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

Inclui (entre outros): `ProjectTasksList.jsx`, `ProjectRisks.jsx`, `ProjectCosts.jsx`, `ProjectProposals.jsx`, `ChangeRequestList.jsx`, `ChangeRequestDashboard.jsx`, `UsersTab.jsx`, `TenantsTab.jsx`, `RolesTab.jsx`, `FreezeWindowsTab.jsx`, `ContractModal.jsx`, `AzureConfigModal.jsx`, `UserImportModal.jsx`, `AssetModal.jsx`, `AssetViewModal.jsx`.

**DataGrid (`@mui/x-data-grid`):** não usado no inventário atual; o projeto usa sobretudo MUI `Table` ou HTML `<table>`.

---

## Próximos passos (padronização)

1. Reutilizar **`DataListShell`** + **`StandardGrid`** onde os dados forem linhas planas com colunas homogéneas.
2. Alinhar barra de filtros (`FilterDrawer`), KPIs (`KpiGrid`), vazio (`EmptyState`) e loading (`TableSkeleton`) ao padrão do Portal.
3. Migrar telas do Grupo A gradualmente; Grupos C/D avaliar caso a caso (tabelas pivot vs lista).

Ver também: [data-grid-shell.md](data-grid-shell.md).
