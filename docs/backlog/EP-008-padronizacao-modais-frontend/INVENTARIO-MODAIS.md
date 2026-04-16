# Inventario — uso de modais (`Dialog` MUI) no Frontend G360

**Gerado em:** 2026-04-16  
**Metodo:** pesquisa por `Dialog` / componentes `*Modal*` / `ConfirmDialog` em `FRONTEND/src`.

Este inventario apoia o [EP-008](./EPIC.md) e a [US-022](./US-022-padronizacao-modais-shell-e-migracao.md). Alguns ficheiros importam `Dialog` mas podem nao o utilizar (limpeza em task de migracao).

---

## 1. Componentes base (`components/common`)

| Ficheiro | Notas |
|----------|--------|
| `FRONTEND/src/components/common/StandardModal.jsx` | Shell; em uso em **US-022** (ex.: `LdapConfigModal`, `NotificationsModal`, `RescheduleModal`, `DepartmentModal`, …). |
| `FRONTEND/src/components/common/ConfirmDialog.jsx` | Confirmacao; composicao com `StandardModal` (US-022). |
| `FRONTEND/src/components/common/CommandPalette.jsx` | Dialog especifico (palette); avaliar variante ou excecao. |

---

## 2. Modulos em `components/modals/` (implementam `Dialog`)

Cada ficheiro abaixo declara ou compoe `Dialog` (directamente ou via sub-dialogs).

| # | Ficheiro |
|---|----------|
| 1 | `AccountModal.jsx` — migrado `StandardModal` (US-022 lote 2) |
| 2 | `AddendumFormModal.jsx` — migrado `StandardModal` (US-022 lote orçamento/contratos) |
| 3 | `AddendumViewModal.jsx` — migrado `StandardModal` (US-022) |
| 4 | `AddMemberModal.jsx` — migrado `StandardModal` (US-022 equipas) |
| 5 | `ApprovalDetailsModal.jsx` — migrado `StandardModal` (US-022) |
| 6 | `AssetCategoryModal.jsx` — migrado `StandardModal` (US-022) |
| 7 | `AssetMaintenanceModal.jsx` — migrado `StandardModal` (US-022 domínio ativos; primário `warning`) |
| 8 | `AssetModal.jsx` — migrado `StandardModal` (US-022, `wide`; manutenção aninhada fora do shell) |
| 9 | `AssetViewModal.jsx` — migrado `StandardModal` (US-022, `detail`) |
| 10 | `AzureConfigModal.jsx` — migrado `StandardModal` (pós-US-022, Integrações) |
| 11 | `BudgetImportModal.jsx` — migrado `StandardModal` (US-022) |
| 12 | `BudgetItemModal.jsx` — migrado `StandardModal` (US-022, `size="wide"`) |
| 13 | `BudgetModal.jsx` — migrado `StandardModal` (US-022 lote 2) |
| 14 | `ChangeModal.jsx` — migrado `StandardModal` (US-022 ITSM; `wide`; wizard + abas; `ConfirmDialog` fora) |
| 15 | `ChangeViewModal.jsx` — migrado `StandardModal` (US-022 ITSM; `wide`; `ChangeViewDataField` extraído) |
| 16 | `ContractCreationWizard.jsx` (inclui dialog aninhado “Novo tipo”) |
| 17 | `ContractModal.jsx` |
| 18 | `CostCenterModal.jsx` — migrado `StandardModal` (US-022 lote 2) |
| 19 | `DepartmentModal.jsx` — migrado `StandardModal` (US-022 lote 1) |
| 20 | `ExpenseApprovalModal.jsx` — migrado `StandardModal` (US-022 despesas; `form`; `loading`; primário `success`) |
| 21 | `ExpenseModal.jsx` — migrado `StandardModal` (US-022 despesas; `detail`; `receipt_long`; primário `success`) |
| 22 | `FiscalYearModal.jsx` — migrado `StandardModal` (US-022 lote org/fiscal) |
| 23 | `FollowUpModal.jsx` — migrado `StandardModal` (US-022) |
| 24 | `GlobalRiskModal.jsx` — migrado `StandardModal` (US-022 riscos; `wide`; wizard + CSS legado no corpo) |
| 25 | `IncidentCreateModal.jsx` |
| 26 | `IncidentModal.jsx` (inclui dialog de escalonamento) |
| 27 | `IncidentViewModal.jsx` |
| 28 | `KnowledgeBaseModal.jsx` |
| 29 | `LdapConfigModal.jsx` — migrado `StandardModal` (US-022 lote 1) |
| 30 | `MemberModal.jsx` — migrado `StandardModal` (US-022 equipas) |
| 31 | `MinuteModal.jsx` — migrado `StandardModal` (US-022) |
| 32 | `NotificationsModal.jsx` — migrado `StandardModal` (US-022 lote 1) |
| 33 | `PaymentConditionModal.jsx` — migrado `StandardModal` (US-022) |
| 34 | `ProjectModal.jsx` |
| 35 | `ProjectTaskModal.jsx` — migrado `StandardModal` (US-022; `data-testid` no Paper) |
| 36 | `ProposalModal.jsx` (dialog principal + dialog “nova categoria”) |
| 37 | `RescheduleModal.jsx` — migrado `StandardModal` (US-022 lote 1) |
| 38 | `RiskModal.jsx` — migrado `StandardModal` (US-022; `detail`; primário `error`) |
| 39 | `RiskViewModal.jsx` — migrado `StandardModal` (US-022; `detail`; `RiskViewBadge` / `RiskViewField` extraídos) |
| 40 | `RoleModal.jsx` — migrado `StandardModal` (US-022 lote org/fiscal) |
| 41 | `SmtpConfigModal.jsx` — migrado `StandardModal` (pós-US-022) |
| 42 | `SubmitExpenseModal.jsx` — migrado `StandardModal` (US-022 despesas; `form`; `loading`) |
| 43 | `SupplierModal.jsx` — migrado `StandardModal` (US-022, `size="wide"`) |
| 44 | `SupplierViewModal.jsx` — migrado `StandardModal` (US-022, `wide`) |
| 45 | `TaskModal.jsx` |
| 46 | `TeamModal.jsx` — migrado `StandardModal` (US-022) |
| 47 | `TenantModal.jsx` — migrado `StandardModal` (US-022 lote org/fiscal) |
| 48 | `UserImportModal.jsx` — migrado `StandardModal` (US-022, aba Usuários) |
| 49 | `UserModal.jsx` — migrado `StandardModal` (US-022 lote org/fiscal) |

*Nota:* `ProjectEditForm.jsx` e `ProjectCreationWizard.jsx` nao usam `Dialog` directamente (formularios auxiliares).

---

## 3. Configuracao e administracao (`components/config`, `components/admin`)

| Ficheiro | Notas |
|----------|--------|
| `components/config/KnowledgeCategoriesTab.jsx` | `CategoryModal` inline + `ConfirmDialog` |
| `components/config/TenantsTab.jsx` | `TenantModal` + `Dialog` confirmacao exclusao |
| `components/config/ApprovalTiersTab.jsx` | `Dialog` + `ConfirmDialog` |
| `components/config/IntegrationsTab.jsx` | Usa `AzureConfigModal`, `SmtpConfigModal` (sem Dialog directo) |
| `components/admin/FreezeWindowsTab.jsx` | ~~`Dialog` inline~~ → `StandardModal` (US-022) |
| `components/admin/CabMembersTab.jsx` | `Dialog` + `ConfirmDialog` |

---

## 4. Outros componentes partilhados

| Ficheiro | Notas |
|----------|--------|
| `components/knowledge-base/DocumentViewer.jsx` | `Dialog` |
| `components/projects/tabs/ProjectCosts.jsx` | `ConfirmDialog` |

---

## 5. Paginas (`pages/`) com `Dialog` inline ou composto

| Ficheiro | Notas |
|----------|--------|
| `pages/admin/TenantAdminPage.jsx` | `TenantFormModal` inline (`Dialog`) |
| `pages/admin/ActivityLogPage.jsx` | `Dialog` |
| `pages/admin/GlobalSettingsPage.jsx` | Importa `Dialog` (verificar uso efectivo / limpeza) |
| `pages/finance/FinancePage.jsx` | `BudgetModal`, `AccountModal`, `ConfirmDialog`, `Dialog` duplicar orcamento |
| `pages/helpdesk/PortalPage.jsx` | Multiplos `Dialog` (wizard + modal) |
| `pages/helpdesk/ProblemManagement.jsx` | Dois `Dialog` |
| `pages/servicedesk/CatalogAdmin.jsx` | Varias instancias `Dialog` (catalogo, servico, SLA, feedback) |
| `pages/servicedesk/ServiceDeskDashboard.jsx` | `Dialog` |
| `pages/servicedesk/ServiceDeskSettings.jsx` | `Dialog` grupo |
| `pages/approvals/MyApprovalsPage.jsx` | `Dialog` |
| `pages/dashboard/ManagerOverview.jsx` | `Dialog` informacao score |

---

## 6. Paginas que usam modais via import (sem `Dialog` no ficheiro)

Consumidores tipicos de `*Modal.jsx` ou `ConfirmDialog` (lista nao exaustiva de modulos):

- `ProjectsListPage.jsx` — `ProjectModal`, `ConfirmDialog`
- `SuppliersPage.jsx` — `SupplierModal`, `SupplierViewModal`
- `TasksPage.jsx` — `TaskModal`, `ConfirmDialog`
- `AssetsPage.jsx` — `AssetModal`, `AssetViewModal`, `ConfirmDialog`
- `RisksPage.jsx` — `GlobalRiskModal`, `TaskModal`, `ConfirmDialog`
- `IncidentsPage.jsx` — `IncidentModal`, `IncidentViewModal`
- `ChangeRequestsPage.jsx` — `ConfirmDialog`
- `KnowledgeBasePage.jsx` — `KnowledgeBaseModal`, `ConfirmDialog`
- `OrganizationPage.jsx`, `UsersTab`, `FiscalYearTab`, `ContractDetailsPage`, `BudgetDetailsPage`, `ExpensesPage`, etc. — `ConfirmDialog` e/ou modais de dominio

---

## 7. Resumo numerico (ordem de grandeza)

| Categoria | Quantidade aproximada |
|-----------|------------------------|
| Ficheiros em `components/modals/` com `Dialog` directo | **~40+** (varios migrados; ver tabela sec. 2) |
| `ConfirmDialog` (agora via `StandardModal`) | **15+** paginas |
| Paginas / tabs com `Dialog` escrito inline | **15+** (ex.: `FreezeWindowsTab` migrado) |
| Componente shell `StandardModal` | **1** — **adoptado** em modais migrados US-022 |

**Pendentes (incremental):** modais grandes (`TaskModal`, `IncidentModal`, `ProposalModal`, wizards) e `Dialog` inline em paginas longas (`CatalogAdmin`, `TenantAdminPage`, …) — replicar o padrao em `docs/patterns/modal-shell.md`.

*Valores derivados de grep; actualizar apos cada migracao.*
