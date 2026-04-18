# DataListTable — cartão + tabela + ordenação + paginação

Composição de:

- **`DataListShell`** — cabeçalho (título, ícone, contagem, toolbar)
- **Tabela MUI** com `table-layout: fixed` por defeito
- **`TableSortLabel`** por coluna (desativar com `sortable: false`)
- **`TablePagination`** no cliente (opções 5–50 por defeito)

## Quando usar

- Listas com linhas heterogéneas (chips, links, várias linhas por célula) onde **`StandardGrid`** (dados planos por `key`) é insuficiente.
- Ordenação **no cliente** após `GET` (ou dados já em memória).
- Ordenação **custom**: passar `sortRows(list, orderBy, order)` (ex.: prioridades, SLA nulo, estado ITIL).

## API resumida

Ver JSDoc em [`FRONTEND/src/components/common/DataListTable.jsx`](../../FRONTEND/src/components/common/DataListTable.jsx).

| Prop | Notas |
|------|--------|
| `shell` | `{ title, titleIcon?, accentColor?, count?, toolbar?, sx?, className?, tableContainerSx? }` |
| `columns` | `{ id, label, render(row), sortable?, width?, minWidth?, align?, headerSx?, cellSx?, accessor? }` |
| `sortRows` | Opcional; substitui o sort genérico por `accessor` |
| `getDefaultOrderForColumn` | Direção inicial ao mudar coluna (ex.: datas → `desc`) |
| `resetPaginationKey` | Ex.: filtro da página pai — repõe página 0 |

## Piloto

- **Service Desk** — [`ServiceDeskDashboard.jsx`](../../FRONTEND/src/pages/servicedesk/ServiceDeskDashboard.jsx) + `sortServiceDeskTickets` exportado para testes/reuso.

## Migração incremental

Ver épicos **EP-011** no backlog: Portal, Incidentes, Problemas, GMUD, etc., **uma página por vez**.

Ver também: [data-grid-shell.md](data-grid-shell.md), [data-grids-inventory.md](data-grids-inventory.md).
