# US-026: DataListShell — restante Grupo B (financeiro, SD, contrato, tempo)

| Campo | Valor |
|--------------------|----------------------------|
| **ID** | US-026 |
| **Epico** | EP-010 |
| **Prioridade** | Media |
| **Story Points** | 5 |
| **Sprint** | - |
| **Status** | Closed |
| **Responsavel** | |
| **Criado em** | 2026-04-18 |
| **Concluido em** | 2026-04-18 |

## User Story

**Como** utilizador das areas financeiras, service desk, contratos e registo de tempo,
**Quero** listas com o mesmo cartao/cabecalho que o resto do produto,
**Para** consistencia visual e contagem visivel sem duplicar padroes.

## Criterios de Aceite

- [x] **`ServiceDeskDashboard`**: tabela de chamados com **`DataListShell`**
- [x] **`DREPage`**: bloco «Detalhamento Mensal» com **`DataListShell`**
- [x] **`TimeReportPage`**: «Resumo por Colaborador» (quando aplicavel) e «Detalhamento» com **`DataListShell`**
- [x] **`FinancePage`**: separadores Orçamentos e Plano de contas com **`DataListShell`**
- [x] **`CatalogAdmin`**: tres separadores (servicos, categorias, SLA) com **`DataListShell`**
- [x] **`ContractDetailsPage`**: separadores Anexos e Aditivos com **`DataListShell`**

## Resolucao

**Concluido em:** 2026-04-18

**Solucao:** Import de **`DataListShell`** em cada pagina; titulos e contagens alinhados ao dominio; botoes de accao (Anexar, Novo Servico, etc.) na **toolbar** onde ja existiam na mesma linha do titulo; `TableContainer` sem elevacao duplicada (`elevation={0}`, `borderRadius: 0`) dentro do shell.

**Arquivos alterados:**
- `FRONTEND/src/pages/servicedesk/ServiceDeskDashboard.jsx`
- `FRONTEND/src/pages/finance/DREPage.jsx`
- `FRONTEND/src/pages/tasks/TimeReportPage.jsx`
- `FRONTEND/src/pages/finance/FinancePage.jsx`
- `FRONTEND/src/pages/servicedesk/CatalogAdmin.jsx`
- `FRONTEND/src/pages/contracts/ContractDetailsPage.jsx`
- `docs/patterns/data-grids-inventory.md`
- `docs/CHANGELOG.md`
- `docs/backlog/_INDEX.md`
- `docs/backlog/EP-010-listas-grupo-b-datalist-shell/EPIC.md`

**Pontos de atencao:** Suite vitest global pode ter timeouts/flakes nao ligados a estas paginas; nao ha testes dedicados a todas as paginas migradas neste lote.
