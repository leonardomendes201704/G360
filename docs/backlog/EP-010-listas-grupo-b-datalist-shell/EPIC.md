# EP-010: Listas Grupo B — casca DataListShell (Frontend)

| Campo | Valor |
|-----------------|--------------------------|
| **ID** | EP-010 |
| **Prioridade** | Media |
| **Sprint** | - |
| **Status** | Active |
| **Responsavel** | |
| **Criado em** | 2026-04-18 |

## Descricao

Migrar as telas do **Grupo B** do inventario (`docs/patterns/data-grids-inventory.md`) — listagens com MUI `Table` / `TablePagination` sem `FilterDrawer` no mesmo criterio — para o cartao **`DataListShell`**, alinhando cabecalho e contagem ao padrao ja usado no Grupo A e no Portal.

## Criterios de Aceite do Epico

- [ ] Todas as linhas **Grupo B** do inventario referem **`DataListShell`** onde fizer sentido (tabelas principais), ou nota justificativa se a estrutura for excecao (ex.: tabela aninhada sem cabecalho proprio).
- [ ] Inventario e `CHANGELOG` atualizados em cada lote.
- [ ] Testes vitest das paginas tocadas a verde.

## Historias Vinculadas

| ID | Titulo | Status | Prioridade |
|--------|-------------------------|----------|------------|
| US-025 | DataListShell — Problemas (ITIL) + Riscos (lista) | Closed | Media |

## Notas

Depende conceptualmente de **EP-009** (componente e padroes). Continuacao natural do inventario; **EP-009** focou Grupo A.

**Grupo B (resto):** `FinancePage`, `DREPage`, `TimeReportPage`, `ServiceDeskDashboard`, `CatalogAdmin`, `ContractDetailsPage` — historias futuras.
