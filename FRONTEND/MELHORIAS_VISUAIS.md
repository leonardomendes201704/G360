# 📋 G360 Enterprise — Registro de Melhorias Visuais

> **Documento de consulta** — Lista completa de ajustes e melhorias implementados no frontend.
> Última atualização: 08/02/2026

---

## 📁 Componentes Reutilizáveis Criados

### 1. EmptyState (`src/components/common/EmptyState.jsx`)
- **Propósito**: Exibir estado vazio quando listas/tabelas não possuem dados
- **Props**: `title`, `description`, `icon`, `actionLabel`, `actionIcon`, `onAction`, `action`, `compact`
- **Onde é usado**: Projetos, Riscos, KB, Aprovações, Contratos, Fornecedores, Ativos, Finanças, Despesas, Incidentes, GMUD
- **Suporte**: Dark/Light mode automático

### 2. SkeletonPage (`src/components/common/SkeletonPage.jsx`)
- **Propósito**: Placeholder de carregamento com animação stagger
- **Props**: `kpiCount`, `tableRows`, `showChart`, `showFilters`, `compact`
- **Elementos renderizados**: KPIs skeleton, filtros skeleton, gráfico skeleton, linhas da tabela skeleton
- **Suporte**: Dark/Light mode automático

### 3. PageTransition (`src/components/common/PageTransition.jsx`)
- **Propósito**: Transição suave fade-in + slide-up ao navegar entre páginas
- **Como funciona**: Usa `useLocation()` como `key` para re-animar a cada mudança de rota
- **Animação**: `pageEnter 0.35s cubic-bezier(0.4, 0, 0.2, 1)` — opacity 0→1, translateY 12px→0
- **Integrado em**: `MainLayout.jsx` (envolve o `<Outlet />`)

### 4. AnimatedCard (`src/components/common/AnimatedCard.jsx`)
- **Propósito**: Wrapper para cards com animação de entrada stagger + hover lift
- **Props**: `delay` (atraso em segundos), `hover` (ativar/desativar hover), `sx`, `...props`
- **Animação entrada**: `cardSlideUp 0.5s` — opacity 0→1, translateY 20px→0, scale 0.98→1
- **Hover**: translateY -4px + box-shadow premium

### 5. ExportButton (`src/components/common/ExportButton.jsx`)
- **Propósito**: Botão com dropdown menu para exportar dados em CSV ou Excel
- **Props**: `data`, `columns`, `filename`, `variant`, `compact`, `sx`
- **Onde é usado**: Incidentes, GMUD, Contratos
- **Dependência**: `src/utils/exportUtils.js`

### 6. TableSkeleton (`src/components/common/TableSkeleton.jsx`)
- **Propósito**: Skeleton loading específico para tabelas
- **Props**: `rows`, `columns`

---

## 🛠 Utilitários Criados

### exportUtils.js (`src/utils/exportUtils.js`)
- **`exportToCSV(data, columns, filename)`** — Exporta como CSV com BOM UTF-8 e separador `;`
- **`exportToExcel(data, columns, filename)`** — Exporta como XLS (tab-separated) com BOM UTF-8
- **`EXPORT_COLUMNS`** — Configurações de colunas por módulo:
  - `projects`, `incidents`, `changes`, `risks`, `contracts`, `suppliers`, `assets`
- **Suporta**: Chaves aninhadas (e.g. `manager.name`), transformações customizadas, formatação BR (datas, moeda)

---

## 🎨 Melhorias CSS Globais (`src/App.css`)

### Hover Effects Premium
- Cards/Papers: `translateY(-2px)` + enhanced box-shadow no hover
- Botões: sutil scale e shadow no hover
- Focus rings com outline indigo semi-transparente

### Tabelas
- **Zebra striping**: Linhas alternadas com cor sutil (`rgba(99, 102, 241, 0.03)` dark / `rgba(15, 23, 42, 0.02)` light)
- **Header contrast**: Background mais destacado nos cabeçalhos de tabela
- **Row hover**: Highlight com transição suave

### Animações de Diálogos
- Dialogs (MUI): Entrada com scale 0.95→1 + opacity
- Snackbar/Toasts: Slide-in da direita + fade

### Filtros
- Toggle suave dos filtros (já suportado pelo `<Collapse>` do MUI)
- Scrollbar customizada (mais fina e arredondada)

### Sidebar
- Hover effects premium nos itens de menu
- Indicador ativo com borda lateral indigo

---

## 📊 KPIs — Melhorias por Página

### Dashboard Manager (`src/pages/dashboard/ManagerDashboard.jsx`)
- ✅ KPIs clicáveis → navegam para o módulo correspondente
- ✅ Stagger animation: `kpiSlideIn 0.5s` com delay de `idx * 0.08s`
- ✅ Hover aprimorado: `translateY(-4px)` + shadow

### Incidentes (`src/pages/incidents/IncidentsPage.jsx`)
- ✅ KPIs clicáveis → filtram por status (Abertos, Em Andamento, Resolvidos, etc.)
- ✅ Stagger animation nos KPI cards
- ✅ Hover aprimorado com shadow
- ✅ Filter count badge
- ✅ ExportButton (CSV/Excel)

### GMUD (`src/pages/changes/ChangeRequestsPage.jsx`)
- ✅ KPIs clicáveis → filtram por status agrupado
- ✅ Variação percentual vs. mês anterior (tendência ↑↓)
- ✅ Stagger animation nos KPI cards
- ✅ Hover aprimorado com shadow
- ✅ Filter count badge
- ✅ ExportButton (CSV/Excel)

### Contratos (`src/pages/contracts/ContractsPage.jsx`)
- ✅ ExportButton (CSV/Excel)

---

## 🏷️ Filter Count Badges — Páginas com Badge Ativo

Badge indigo compacto exibido ao lado do título "Filtros", mostrando quantos filtros estão ativos.

| Página | Arquivo | Filtros monitorados |
|--------|---------|---------------------|
| Tarefas | `src/pages/tasks/TasksPage.jsx` | status, priority, assignee, search |
| Riscos | `src/pages/RisksPage.jsx` | status, category, impact, probability |
| Incidentes | `src/pages/incidents/IncidentsPage.jsx` | status, priority, category, assignee, SLA |
| GMUD | `src/pages/changes/ChangeRequestsPage.jsx` | status, risk, type, impact, responsible, dateFrom, dateTo |
| Ativos | `src/pages/assets/AssetsPage.jsx` | status, category, search |
| Knowledge Base | `src/pages/KnowledgeBasePage.jsx` | search, category |

---

## 📐 Layout & Navegação

### MainLayout (`src/components/layout/MainLayout.jsx`)
- `PageTransition` wrapping `<Outlet />` para animações entre páginas
- Sidebar colapsável (state: `sidebarCollapsed`)
- Header com toggle de tema Dark/Light
- Notificações com badge de contagem

### DarkSidebar (`src/components/layout/DarkSidebar.jsx`)
- `SIDEBAR_WIDTH_EXPANDED = 260px`
- `SIDEBAR_WIDTH_COLLAPSED = 72px`
- Transição suave ao colapsar/expandir
- Tooltips nos ícones quando colapsado

---

## 🎭 Drag & Drop (Kanban)

### TaskKanban (`src/components/tasks/TaskKanban.jsx`)
- Rotação 3° ao arrastar
- Shadow indigo `0 12px 32px rgba(99, 102, 241, 0.25)` quando arrastando
- Cursor `grabbing` durante drag
- Hover effect nas colunas de destino

### IncidentKanban (`src/components/incidents/IncidentKanban.jsx`)
- Mesmo padrão visual do TaskKanban

---

## 📝 Correções de JSX & Build

Arquivos corrigidos durante o processo de implementação:
- `MinuteModal.jsx` — Correção de JSX malformado
- `IncidentModal.jsx` — Correção de JSX malformado
- `UserModal.jsx` — Correção de JSX malformado
- `TaskModal.jsx` — Correção de JSX malformado
- `ContractsPage.jsx` — Correção de nesting de Box

---

## ✅ Verificação Final

```
✓ npx vite build → Exit code: 0
✓ Sem erros de lint pendentes
✓ Dark mode e Light mode compatíveis
✓ Todos os componentes importados corretamente
✓ Nenhuma dependência externa adicionada
```

---

## 🗂 Resumo de Arquivos

### Novos (criados)
| Arquivo | Tipo |
|---------|------|
| `src/components/common/EmptyState.jsx` | Componente |
| `src/components/common/SkeletonPage.jsx` | Componente |
| `src/components/common/PageTransition.jsx` | Componente |
| `src/components/common/AnimatedCard.jsx` | Componente |
| `src/components/common/ExportButton.jsx` | Componente |
| `src/utils/exportUtils.js` | Utilitário |

### Modificados (principais)
| Arquivo | Alteração |
|---------|-----------|
| `src/App.css` | Animações globais, hover effects, zebra striping |
| `src/components/layout/MainLayout.jsx` | PageTransition integration |
| `src/pages/dashboard/ManagerDashboard.jsx` | KPI stagger animation |
| `src/pages/incidents/IncidentsPage.jsx` | Stagger, badge, export |
| `src/pages/changes/ChangeRequestsPage.jsx` | Stagger, badge, export |
| `src/pages/contracts/ContractsPage.jsx` | Export button |
| `src/pages/tasks/TasksPage.jsx` | Filter badge |
| `src/pages/RisksPage.jsx` | Filter badge, EmptyState |
| `src/pages/assets/AssetsPage.jsx` | Filter badge |
| `src/pages/KnowledgeBasePage.jsx` | Filter badge, EmptyState |
| `src/pages/approvals/MyApprovalsPage.jsx` | EmptyState |
| `src/pages/suppliers/SuppliersPage.jsx` | EmptyState |
| `src/pages/finance/FinancePage.jsx` | EmptyState |
| `src/pages/finance/ExpensesPage.jsx` | EmptyState |
