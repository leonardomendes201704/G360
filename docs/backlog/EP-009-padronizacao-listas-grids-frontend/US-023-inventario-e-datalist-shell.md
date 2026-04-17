# US-023: Inventario de grelhas + casca DataListShell e primeira migracao

| Campo | Valor |
|--------------------|----------------------------|
| **ID** | US-023 |
| **Epico** | EP-009 |
| **Prioridade** | Media |
| **Story Points** | 5 |
| **Sprint** | - |
| **Status** | Closed |
| **Responsavel** | |
| **Criado em** | 2026-04-16 |
| **Concluido em** | 2026-04-16 |

## User Story

**Como** equipa de produto/desenvolvimento,
**Quero** um inventario das telas com listas/grids e um primeiro componente de casca reutilizavel,
**Para** padronizar listagens de forma incremental sem regressoes.

## Criterios de Aceite

- [x] Ficheiro `docs/patterns/data-grids-inventory.md` com grupos de ecras e notas de implementacao
- [x] Ficheiro `docs/patterns/data-grid-shell.md` descrevendo `DataListShell` e relacao com `StandardGrid`
- [x] Componente `FRONTEND/src/components/common/DataListShell.jsx` criado e usado em **Fornecedores** (`SuppliersPage.jsx`)

## Tasks

| ID | Descricao | Status |
|------|----------------------------------------|--------------|
| T-01 | Documentacao inventario + padrao shell | Done |
| T-02 | Implementar `DataListShell` e migrar `SuppliersPage` | Done |
| T-03 | Testes vitest `SuppliersPage.test.jsx` | Done |

## Definicao de Pronto (DoD)

- [x] Documentacao atualizada
- [x] Codigo implementado e revisado
- [x] Testes passando (`npx vitest run src/pages/suppliers/__tests__/SuppliersPage.test.jsx`)
- [x] CHANGELOG atualizado

## Resolucao

**Concluido em:** 2026-04-16

**Solucao:** Criado `DataListShell` com cabecalho (titulo, icone, contagem opcional, toolbar) e tema claro/escuro; secao "Lista de Fornecedores" em `SuppliersPage` passa a usar o componente mantendo `cardStyle`, busca, `BulkActionsBar`, tabela HTML e `EmptyState`.

**Arquivos alterados:**
- `FRONTEND/src/components/common/DataListShell.jsx`
- `FRONTEND/src/pages/suppliers/SuppliersPage.jsx`
- `docs/CHANGELOG.md`
- `docs/patterns/data-grids-inventory.md` / `data-grid-shell.md` (ja existentes)

**Decisoes:** `sx` permite injetar o mesmo `cardStyle` da pagina para nao alterar o gradiente/cartao do modo escuro.

**Pontos de atencao:** Migrar outras telas do Grupo A do inventario em historias futuras (EP-009 permanece ativo para esse objetivo).
