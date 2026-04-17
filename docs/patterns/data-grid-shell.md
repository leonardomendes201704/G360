# Padrão: casca de lista / grelha (`DataListShell` + `StandardGrid`)

## Objetivo

Listagens semelhantes ao **Portal de Chamados** (título, contagem, busca/filtros, tabela, estados vazio/loading) devem reutilizar:

| Peça | Quando usar |
|------|-------------|
| **`DataListShell`** | Cartão com **cabeçalho** fixo (ícone + título + contagem opcional + `toolbar` à direita) e **filhos** = corpo (tabela HTML, MUI `Table`, `BulkActionsBar`, `EmptyState`, etc.). |
| **`StandardGrid`** | Dados em forma de **linhas planas** + definição declarativa de **`columns`** / opcional **`actions`** — busca, ordenação e paginação **dentro** do componente. |
| **`FilterDrawer`** | Filtros avançados off-canvas (já padronizado no EP-007). |
| **`KpiGrid` + `StatsCard`** | Indicadores acima da lista, alinhados ao dashboard. |

Referência visual/UX: [`PortalPage.jsx`](../../FRONTEND/src/pages/helpdesk/PortalPage.jsx) (`Meus Chamados`).

Inventário por ecrã: [data-grids-inventory.md](data-grids-inventory.md).

## `DataListShell` — API resumida

- `title` (string) — ex.: `Lista de Fornecedores`
- `titleIcon` (string, default `list`) — nome Material Icons Round
- `accentColor` (string) — cor do ícone do título (ex.: `#06b6d4`)
- `count` (number, opcional) — mostra ` (n)` após o título
- `toolbar` (ReactNode) — tipicamente busca, botões ou `ExportButton`
- `children` — conteúdo abaixo do cabeçalho (tabela, barras, empty state)
- `sx` — estilos extra no contentor externo (`borderRadius`, sombra, etc.)
- `className` — opcional no contentor (ex.: `pl-projects-table-card` para tema premium da página)

O contentor aplica `border` + `borderRadius` coerentes com tema claro/escuro (`ThemeContext`).

## `StandardGrid` — API resumida

Ver JSDoc em [`StandardGrid.jsx`](../../FRONTEND/src/components/common/StandardGrid.jsx): `columns`, `rows`, `actions`, `searchable`, `loading`, `emptyTitle`, paginação, etc.

## Anti-padrões

- Novo ecrã com cartão + cabeçalho de lista **copiado** linha a linha — preferir `DataListShell` ou extrair o mesmo padrão.
- Segunda biblioteca de grelha (`DataGrid` Pro) sem decisão arquitetural — manter MUI `Table` / HTML até haver necessidade clara.

## Origem no backlog

- **EP-009** — Padronização de listas e grelhas (Frontend)
- **US-023** — Documentação do inventário + casca `DataListShell` e primeira migração
