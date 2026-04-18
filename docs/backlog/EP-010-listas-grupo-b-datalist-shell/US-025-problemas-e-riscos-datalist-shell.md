# US-025: DataListShell — Gestao de Problemas (ITIL) + Registro de riscos (lista)

| Campo | Valor |
|--------------------|----------------------------|
| **ID** | US-025 |
| **Epico** | EP-010 |
| **Prioridade** | Media |
| **Story Points** | 5 |
| **Sprint** | - |
| **Status** | Closed |
| **Responsavel** | |
| **Criado em** | 2026-04-18 |
| **Concluido em** | 2026-04-18 |

## User Story

**Como** utilizador de helpdesk e de riscos,
**Quero** cabecalhos de lista consistentes com o resto do produto,
**Para** reconhecer padroes visuais e contagem sem duplicar codigo de cartao.

## Criterios de Aceite

- [x] **`ProblemManagement`**: lista principal com **`DataListShell`** (titulo, icone, contagem, botao Declarar na toolbar)
- [x] **`RisksPage`**: modo **Lista** com **`DataListShell`** envolvendo `BulkActionsBar` + tabela; titulo «Registro de riscos»
- [x] Vitest **`ProblemManagement.test.jsx`** e **`RisksPage.test.jsx`** a verde (asserts do modal alinhados ao titulo real do `StandardModal`)

## Tasks

| ID | Descricao | Status |
|------|----------------------------------------|--------------|
| T-01 | Implementar shell em `ProblemManagement.jsx` | Done |
| T-02 | Implementar shell em lista `RisksPage.jsx` | Done |
| T-03 | Ajustar testes ProblemManagement | Done |

## Definicao de Pronto (DoD)

- [x] Codigo e documentacao de backlog
- [x] CHANGELOG e inventario
- [x] Testes passando

## Resolucao

**Concluido em:** 2026-04-18

**Solucao:** `DataListShell` em `ProblemManagement` com `count={problems.length}` e toolbar com «Declarar Problema». Em `RisksPage`, modo LIST passou a ser um unico cartao com «Registro de riscos», `count={risks.length}`, `BulkActionsBar` e `TableContainer` com borda superior para separar da barra em massa; removido o contorno duplicado do `Paper` exterior.

**Arquivos alterados:**
- `FRONTEND/src/pages/helpdesk/ProblemManagement.jsx`
- `FRONTEND/src/pages/RisksPage.jsx`
- `FRONTEND/src/pages/helpdesk/__tests__/ProblemManagement.test.jsx`
- `docs/patterns/data-grids-inventory.md`
- `docs/CHANGELOG.md`
- `docs/backlog/_INDEX.md`
- `docs/backlog/EP-010-listas-grupo-b-datalist-shell/EPIC.md`

**Pontos de atencao:** Restantes ficheiros Grupo B seguem em US futuras dentro do EP-010.
