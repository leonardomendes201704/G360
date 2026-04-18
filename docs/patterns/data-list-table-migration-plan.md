# Plano: componentizar listagens restantes (`DataListTable`)

**Objetivo:** substituir `<table>` HTML e `Table` MUI “manual” pelo padrão **`DataListTable`** + `*ListColumns.jsx` + `*ListSort.js` (+ `*Utils.js` quando fizer sentido), alinhado ao resto do G360.

**Definição de pronto (por item):**

- Lista principal em `DataListTable` com `data-testid` estável (`tabela-*`).
- Colunas e ordenação em ficheiros dedicados na pasta da página (ou subpasta `*/` se já existir padrão, ex. `risks/`).
- `BulkActionsBar` / seleção / toolbar: mantidas ou reencaixadas com `renderBeforeTable` e props documentadas em `DataListTable`.
- `docs/patterns/data-grids-inventory.md` atualizado na linha correspondente.
- `docs/CHANGELOG.md` com entrada na data da entrega.
- Testes existentes ajustados + `vitest` relevante a verde.
- Após merge com alterações em `FRONTEND/`: `scripts/docker-rebuild-frontend.ps1` (ou equivalente).

**Ordem sugerida (uma entrega por vez):** do mais simples ao mais especializado; parar entre itens para validar UX.

---

## Fase 1 — Listas planas e baixo risco

| # | Rota / ecrã | Ficheiro principal | Notas |
|---|-------------|--------------------|--------|
| 1 | Detalhe do contrato → separador **Anexos** | `FRONTEND/src/pages/contracts/ContractDetailsPage.jsx` | **Feito (2026-04-16):** `DataListTable` + `contractAttachmentList*`; tab **Aditivos** continua `<ul>` / `DataListShell`. |
| 2 | Catálogo ITBM (3 separadores) | `FRONTEND/src/pages/servicedesk/CatalogAdmin.jsx` | **Feito (2026-04-16):** três `DataListTable` + `catalogServiceList*`, `catalogCategoryList*`, `catalogSlaList*`; modais e form builder inalterados. |
| 3 | Relatório de horas | `FRONTEND/src/pages/tasks/TimeReportPage.jsx` | Duas tabelas: resumo por colaborador + detalhe de sessões (`stickyHeader` no detalhe — replicar com `shell.tableContainerSx` ou `sx` na tabela se necessário). |

---

## Fase 2 — `<table>` HTML e páginas de config / relatório

| # | Rota / ecrã | Ficheiro principal | Notas |
|---|-------------|--------------------|--------|
| 4 | Organização (config) | `FRONTEND/src/pages/config/OrganizationPage.jsx` | |
| 5 | Definições Service Desk | `FRONTEND/src/pages/servicedesk/ServiceDeskSettings.jsx` | Várias tabelas; pode dividir-se em mais de um PR se for grande. |
| 6 | Relatório equipas / projetos | `FRONTEND/src/pages/projects/TeamProjectsStatusReport.jsx` | |
| 7 | Detalhe de orçamento | `FRONTEND/src/pages/finance/BudgetDetailsPage.jsx` | Validar se há hierarquia/agrupamento que não caiba numa única `DataListTable` sem refactor. |

---

## Fase 3 — Alto esforço ou modelo de dados especial

| # | Rota / ecrã | Ficheiro principal | Notas |
|---|-------------|--------------------|--------|
| 8 | Comparação de orçamentos | `FRONTEND/src/pages/finance/BudgetComparisonPage.jsx` | Colunas **dinâmicas** por orçamentos selecionados — pode exigir `columns` gerados em função ou modo servidor/pivot. |
| 9 | DRE | `FRONTEND/src/pages/finance/DREPage.jsx` | Linhas **expansíveis** + sub-tabelas; candidato a manter MUI custom ou desenho específico (documentar exceção no inventário). |

---

## Fora do âmbito imediato (opcional / outro padrão)

- **Grupo D do inventário:** `TenantAdminPage`, `ActivityLogPage`, `MyApprovalsPage` — listas densas sem `<table>`; avaliar se `DataListTable` melhora UX ou só `DataListShell` + linhas.
- **Componentes (Grupo E):** modais e tabs de projeto — caso a caso.

---

## Referências

- Inventário atual: [data-grids-inventory.md](./data-grids-inventory.md)
- Padrão do componente: [data-list-table.md](./data-list-table.md) (se existir) ou JSDoc em `FRONTEND/src/components/common/DataListTable.jsx`

**Última atualização do plano:** 2026-04-16
