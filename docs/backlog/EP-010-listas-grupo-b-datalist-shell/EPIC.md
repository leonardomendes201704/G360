# EP-010: Listas Grupo B — casca DataListShell (Frontend)

| Campo | Valor |
|-----------------|--------------------------|
| **ID** | EP-010 |
| **Prioridade** | Media |
| **Sprint** | - |
| **Status** | Closed |
| **Responsavel** | |
| **Criado em** | 2026-04-18 |

## Descricao

Migrar as telas do **Grupo B** do inventario (`docs/patterns/data-grids-inventory.md`) — listagens com MUI `Table` / `TablePagination` sem `FilterDrawer` no mesmo criterio — para o cartao **`DataListShell`**, alinhando cabecalho e contagem ao padrao ja usado no Grupo A e no Portal.

## Criterios de Aceite do Epico

- [x] Todas as linhas **Grupo B** do inventario referem **`DataListShell`** onde fizer sentido (tabelas principais), ou nota justificativa se a estrutura for excecao (ex.: tabela aninhada sem cabecalho proprio).
- [x] Inventario e `CHANGELOG` atualizados em cada lote.
- [x] Testes vitest das paginas tocadas a verde quando existirem; restante coberto por regressao manual / suite global.

## Historias Vinculadas

| ID | Titulo | Status | Prioridade |
|--------|-------------------------|----------|------------|
| US-025 | DataListShell — Problemas (ITIL) + Riscos (lista) | Closed | Media |
| US-026 | DataListShell — restante Grupo B (financeiro, SD, contrato, tempo) | Closed | Media |

## Resolucao do Epico

**Concluido em:** 2026-04-18

**Sumario:** Grupo B integralmente migrado em duas historias (US-025 primeiras telas; US-026 financeiro, DRE, relatorio de tempo, central SD, catalogo admin, detalhe de contrato).

## Notas

Depende conceptualmente de **EP-009** (componente e padroes).

**Grupos C/D/E** do inventario permanecem para futuros epicos ou historias pontuais.
