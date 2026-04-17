# EP-009: Padronizacao de listas e grelhas (Frontend)

| Campo | Valor |
|-----------------|--------------------------|
| **ID** | EP-009 |
| **Prioridade** | Media |
| **Sprint** | - |
| **Status** | Active |
| **Responsavel** | |
| **Criado em** | 2026-04-16 |

## Descricao

Reduzir duplicacao de cartoes/cabecalhos de lista e alinhar listagens ao padrao do Portal de Chamados (filtros, KPIs, tabela, estados vazio/loading), reutilizando `DataListShell`, `StandardGrid`, `FilterDrawer` e documentacao em `docs/patterns/`.

## Criterios de Aceite do Epico

- [x] Inventario de ecras documentado e mantido em `docs/patterns/data-grids-inventory.md`
- [ ] Padrao `data-grid-shell.md` aplicado a novas listas e migracao progressiva das telas do inventario (Grupo A prioritario) — **continua em sprints futuros**
- [x] Componentes base (`DataListShell`, `StandardGrid`) usados em pelo menos uma tela de producao (`SuppliersPage`)

## Historias Vinculadas

| ID | Titulo | Status | Prioridade |
|--------|-------------------------|----------|------------|
| US-023 | Inventario + casca DataListShell e primeira migracao | Closed | Media |

## Resolucao (US-023)

**Concluido em:** 2026-04-16. **Entrega:** `DataListShell.jsx` + migracao da lista em `SuppliersPage.jsx`; testes vitest da pagina a verde; documentacao e CHANGELOG atualizados.

## Notas

Depende conceptualmente de EP-002 (componentes base). `StandardGrid` ja existia (US-005); EP-009 foca documentacao e adocao.

**Migracao `DataListShell`:** Fornecedores (US-023); Contratos; Ativos (lista + licencas); Base de conhecimento (lista); Projetos; Incidentes; Tarefas (lista); GMUD.
