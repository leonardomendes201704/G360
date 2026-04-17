# Minhas aprovações — fluxo e referência técnica

## Visão geral

A tela **Minhas aprovações** (`/approvals`, `FRONTEND/src/pages/approvals/MyApprovalsPage.jsx`) é a **caixa de entrada única** de itens que **aguardam decisão** (aprovar / rejeitar / devolver para ajustes) do utilizador autenticado. Não lista histórico de itens já concluídos; o histórico de ações do utilizador na esteira vem de `GET /api/v1/approvals/history` (auditoria com módulo `APPROVALS`).

**Permissão:** `APPROVALS` + `READ` para ver contagens e lista; `WRITE` ou `BYPASS_APPROVAL` para aprovar/rejeitar.

## Fluxo no frontend

1. **Carregamento:** `approvalService.getCounts()` e `approvalService.getPending(tab)` em paralelo.
2. **KPIs (cartões):** contagens por tipo (`expenses`, `projectCosts`, `minutes`, `gmuds`, `projects`, `proposals`, `budgets`) + total. Clicar num cartão filtra o mesmo tipo (via estado `activeTab`).
3. **Tabs:** equivalentes aos tipos; `all` pede a lista sem filtro `type` na API.
4. **Lista:** cada linha tem tipo, título, subtítulo, valor (quando existir), data, ações **Ver detalhes**, **Aprovar**, **Rejeitar**.
5. **Detalhes:** `ApprovalDetailsModal` chama `GET /approvals/:type/:id/detail`.
6. **Aprovar:** `POST /approvals/:type/:id/approve`.
7. **Rejeitar:** modal com motivo obrigatório; opcional **Permitir ajustes e reenvio** (`requiresAdjustment`) para `project`, `minute`, `projectCost`, `proposal`, `gmud` (comportamento varia por tipo no backend).

## API (backend)

| Método | Rota | Função |
|--------|------|--------|
| GET | `/approvals/counts` | Pendências por tipo para o utilizador |
| GET | `/approvals/pending?type=` | Lista unificada; `type` opcional: `expenses`, `projectCosts`, `minutes`, `gmuds`, `projects`, `proposals`, `budgets` |
| GET | `/approvals/:type/:id/detail` | Detalhe para modal |
| POST | `/approvals/:type/:id/approve` | Aprovar |
| POST | `/approvals/:type/:id/reject` | Corpo: `{ reason, requiresAdjustment }` |
| GET | `/approvals/history?limit=` | Auditoria do utilizador (módulo APPROVALS) |

Implementação: `BACKEND/src/controllers/approval.controller.js`.  
Regras de **quem** vê cada pendência: `BACKEND/src/services/approval-tier.service.js` (alçadas parametrizáveis `ApprovalTier`, exceto **GMUD**, que usa `ChangeApprover`).

## Tipos (`type` na API e no frontend)

| `type` | Origem | Estado “pendente” típico | Notas |
|--------|--------|---------------------------|--------|
| `expense` | `Expense` | `AGUARDANDO_APROVACAO` | Visível conforme CC gestor / alçadas `EXPENSE` |
| `projectCost` | `ProjectCost` | `AGUARDANDO_APROVACAO` | Projeto gestor / alçadas `PROJECT_COST` |
| `minute` | `MeetingMinute` | `PENDING` | Super Admin vê todas as atas pendentes; senão projeto / alçada `MEETING_MINUTE` |
| `gmud` | `ChangeRequest` | `PENDING_APPROVAL` ou `WAITING_CAB` | Aprovador em `ChangeApprover` com `status: PENDING` (não usa `ApprovalTier`) |
| `project` | `Project` | `approvalStatus: PENDING_APPROVAL` | Baseline / liberação para execução; Super Admin ou gestor CC / alçada `PROJECT` |
| `proposal` | `ProjectProposal` | `AGUARDANDO_APROVACAO` | Super Admin ou gestor projeto / alçada `PROPOSAL` |
| `budget` | `Budget` | `status: PENDING_APPROVAL` | Itens com centros de custo e alçadas `BUDGET` |

## GMUD vs alçadas

- **Despesas, custos de projeto, atas, propostas, projetos (baseline), orçamentos** podem usar **ApprovalTier** (por perfil, faixa de valor e âmbito).
- **GMUD** usa apenas **ChangeApprover** + estados do workflow em `ChangeRequestService` (`BACKEND/src/services/change-request.service.js`).

## Seed de demonstração

Para criar **um item pendente por tipo** (7 tipos: despesa, custo de projeto, ata, GMUD, projeto baseline, proposta, orçamento) visíveis ao utilizador alvo:

```bash
cd BACKEND
npm run seed:approvals-showcase:all
```

Variáveis opcionais:

- `SEED_APPROVALS_USER_EMAIL` — email do utilizador que deve ser **gestor do CC demo** e **aprovador** das pendências (default `admin@g360.com.br`).  
  Se esse email **não existir** no tenant, o script usa o **primeiro utilizador ativo** (com aviso no console).

O script é **idempotente** (prefixo `[Seed Aprovações]` e códigos estáveis: `DEPT-G360-APPROVAL-DEMO`, `CC-G360-APPROVAL-DEMO`, `PRJ-G360-PENDING-BASELINE`, `PRJ-G360-APPROVAL-CTX`, `GMUD-G360-APPROVAL-DEMO`).

**Dependências:** se não houver fornecedor, conta contábil ou ano fiscal, o script cria registos mínimos automaticamente (`ensureSupplier` / `ensureAccountingAccount` / `ensureFiscalYear`).

## Ficheiros principais

- Frontend: `FRONTEND/src/pages/approvals/MyApprovalsPage.jsx`, `FRONTEND/src/components/modals/ApprovalDetailsModal.jsx`, `FRONTEND/src/services/approval.service.js`
- Backend: `BACKEND/src/controllers/approval.controller.js`, `BACKEND/src/routes/approval.routes.js`, `BACKEND/src/services/approval-tier.service.js`
- Seed: `BACKEND/src/scripts/seed-approvals-showcase.js`, `BACKEND/src/scripts/seed-approvals-showcase-all-tenants.js`
