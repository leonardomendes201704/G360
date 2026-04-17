# EP-009: Padronizacao de listas e grelhas (Frontend)

| Campo | Valor |
|-----------------|--------------------------|
| **ID** | EP-009 |
| **Prioridade** | Media |
| **Sprint** | - |
| **Status** | Closed |
| **Responsavel** | |
| **Criado em** | 2026-04-16 |

## Descricao

Reduzir duplicacao de cartoes/cabecalhos de lista e alinhar listagens ao padrao do Portal de Chamados (filtros, KPIs, tabela, estados vazio/loading), reutilizando `DataListShell`, `StandardGrid`, `FilterDrawer` e documentacao em `docs/patterns/`.

## Criterios de Aceite do Epico

- [x] Inventario de ecras documentado e mantido em `docs/patterns/data-grids-inventory.md`
- [x] Migracao progressiva **Grupo A** (`data-grids-inventory`): todas as telas listadas passaram a usar **`DataListShell`** onde aplicavel (inclui referencia **Portal** — US-024)
- [x] Componentes base (`DataListShell`, `StandardGrid`) usados em producao e padrao descrito em `data-grid-shell.md`

Novas listagens devem seguir `docs/patterns/data-grid-shell.md`; ecras **Grupo B/C/D** do inventario ficam para futuras historias se/de quando houver prioridade.

## Historias Vinculadas

| ID | Titulo | Status | Prioridade |
|--------|-------------------------|----------|------------|
| US-023 | Inventario + casca DataListShell e primeira migracao | Closed | Media |
| US-024 | Portal Meus Chamados — DataListShell | Closed | Media |

## Resolucao do Epico

**Concluido em:** 2026-04-18.

**Sumario:** Inventario e componente `DataListShell`; migracao incremental das telas do Grupo A (Fornecedores ate Portal); documentacao e testes por pagina alterada.

## Notas

Depende conceptualmente de EP-002 (componentes base). `StandardGrid` ja existia (US-005); EP-009 foca documentacao e adocao.

**Migracao `DataListShell`:** Fornecedores (US-023); Contratos; Ativos (lista + licencas); Base de conhecimento (lista); Projetos; Incidentes; Tarefas (lista); GMUD; **Portal Meus Chamados** (US-024).
