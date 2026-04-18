# US-027: DataListTable + piloto Service Desk

| Campo | Valor |
|--------------------|----------------------------|
| **ID** | US-027 |
| **Epico** | EP-011 |
| **Prioridade** | Media |
| **Story Points** | 5 |
| **Sprint** | - |
| **Status** | Closed |
| **Criado em** | 2026-04-18 |
| **Concluido em** | 2026-04-18 |

## User Story

**Como** equipa de frontend,
**Quero** um componente unico para cartao + tabela + sort + paginacao,
**Para** reutilizar nas mesmas paginas sem copiar `TableSortLabel`/`TablePagination`.

## Criterios de Aceite

- [x] `FRONTEND/src/components/common/DataListTable.jsx` com props documentadas (JSDoc)
- [x] `ServiceDeskDashboard` refatorado para `DataListTable`; ordenacao preservada via `sortServiceDeskTickets`
- [x] Testes vitest basicos em `DataListTable.test.jsx`
- [x] `docs/patterns/data-list-table.md`

## Resolucao

**Concluido em:** 2026-04-18

**Arquivos:** `DataListTable.jsx`, `ServiceDeskDashboard.jsx`, `DataListTable.test.jsx`, `data-list-table.md`, backlog EP-011.

**Decisoes:** `sortRows` opcional para dominios com comparadores especificos; `resetPaginationKey` para filtros da pagina pai.
