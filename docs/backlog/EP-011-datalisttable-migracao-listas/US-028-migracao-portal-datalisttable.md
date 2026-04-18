# US-028: Migrar Portal «Meus Chamados» para DataListTable

| Campo | Valor |
|--------------------|----------------------------|
| **ID** | US-028 |
| **Epico** | EP-011 |
| **Prioridade** | Media |
| **Story Points** | 5 |
| **Sprint** | - |
| **Status** | Closed |
| **Criado em** | 2026-04-18 |

## User Story

**Como** utilizador do portal,
**Quero** a mesma experiencia de lista,
**Para** manter consistencia tecnica com Service Desk e reduzir codigo duplicado.

## Criterios de Aceite

- [x] `PortalPage` usa `DataListTable` (ou composicao equivalente) na secao Meus Chamados
- [x] Filtros, KPIs, wizard e `FilterDrawer` inalterados
- [x] `PortalPage.test.jsx` a verde

## Tasks

| ID | Descricao | Status |
|------|----------------------------------------|--------------|
| T-01 | Extrair `sortRows` / colunas do Portal para `DataListTable` | Closed |
| T-02 | Vitest Portal | Closed |

## Notas Tecnicas

- Funcao exportada **`sortPortalTickets`** em `PortalPage.jsx` — mesma logica de ordenacao que a tabela manual anterior.
- **`resetPaginationKey`** deriva de `listSearch` + `appliedFilters` para repor pagina ao refinar.

## Definicao de Pronto (DoD)

- [x] Codigo implementado e revisado
- [x] Testes unitarios passando
- [x] Documentacao atualizada (CHANGELOG, backlog)

## Resolucao

**Concluido em:** 2026-04-18

**Solucao:** Substituicao de `DataListShell` + tabela MUI manual por **`DataListTable`** com colunas declarativas, `sortRows={sortPortalTickets}`, `defaultOrderBy="createdAt"`, `getDefaultOrderForColumn` para datas em descendente na primeira ordenacao, `resetPaginationKey` para filtros/busca, `emptyMessage` condicional (sem chamados vs. zero resultados filtrados). Sombra da tabela alinhada ao `Paper` anterior via `shell.tableContainerSx`.

**Arquivos alterados:**
- `FRONTEND/src/pages/helpdesk/PortalPage.jsx`
- `docs/CHANGELOG.md`
- `docs/backlog/_INDEX.md`
- `docs/backlog/EP-011-datalisttable-migracao-listas/EPIC.md`
- `docs/backlog/EP-011-datalisttable-migracao-listas/US-028-migracao-portal-datalisttable.md`

**Pontos de atencao:** Proximos passos EP-011 (Incidentes, Problemas, etc.) conforme fila no `EPIC.md`.
