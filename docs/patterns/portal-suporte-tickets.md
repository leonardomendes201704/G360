# Portal de Suporte — fluxo e chamados (tickets)

## Visão geral

O **Portal de Suporte** é a área do utilizador final para **abrir e acompanhar chamados** (Service Desk do lado do solicitante).

| Rota | Ficheiro | Descrição |
|------|----------|-----------|
| `/portal` | `FRONTEND/src/pages/helpdesk/PortalPage.jsx` | Lista “Meus Chamados”, catálogo por **categoria** e **serviço**, assistente “Novo ticket”, integração com KB (sugestões ao digitar título) |
| `/portal/tickets/:id` | `FRONTEND/src/pages/helpdesk/TicketDetails.jsx` (ou equivalente) | Detalhe do chamado, mensagens, anexos |

Dados carregados no portal (entre outros): `ticketService.getAll()`, catálogo de serviços, categorias, ativos, grupos de suporte.

Na lista: **indicadores** (totais por estado, clicáveis para filtrar; cores alinhadas aos chips de status), **busca** textual e **filtros** laterais (status, serviço, categoria) aplicados em memória sobre os chamados do solicitante; **ordenação** ao clicar nos cabeçalhos das colunas e **paginação** da grelha.

## Abrir um chamado

1. **Novo ticket** → assistente por categoria ou seleção direta de serviço.
2. Modal com título, descrição, ativo relacionado (opcional), grupo de suporte (opcional), campos dinâmicos (`formSchema` do `ServiceCatalog`).
3. `POST` de criação com `categoryId`, `serviceId`, `customAnswers`, etc. (`ticket.service` / API tickets).

O backend gera código compacto **`HD` + 2 dígitos do ano + sequência de 4 dígitos** (ex.: `HD260359`, sem hífens), calcula SLA (política do serviço / grupo / fallback por prioridade) e pode atribuir analista (round-robin do grupo, conforme `HelpdeskConfig`).

## Estados e prioridades (Ticket)

**Estados** válidos na API (`PATCH .../status`): `OPEN`, `IN_PROGRESS`, `WAITING_USER`, `RESOLVED`, `CLOSED` — ver `TicketController.updateStatus`.

**Prioridades** usuais: `LOW`, `MEDIUM`, `HIGH`, `URGENT` (fallback de SLA em `ticket.service.js`).

## “Tipos” de chamado

No produto, o **tipo** corresponde ao **serviço do catálogo** (`ServiceCatalog`): cada serviço pertence a uma `TicketCategory` e pode ter formulário e SLA próprios.

## Carga de chamados de exemplo (dev)

Cria **até 5 chamados por serviço ativo** — um por **estado** (`OPEN` … `CLOSED`). Títulos e descrições usam texto **neutro** (sem prefixos de demo). Para bases antigas com textos legados, usar `npm run db:sanitize-labels` no `BACKEND`.

```bash
cd BACKEND
npm run seed:portal-tickets:all
npm run seed:portal-tickets:reset   # apaga chamados gerados por este fluxo e recria
```

- **Idempotência:** **serviço** + **estado** + **solicitante** + **título** exacto (`{nome do serviço} — requisição {1..5}`).
- **Solicitante:** `SEED_PORTAL_REQUESTER_EMAIL` ou `SEED_APPROVALS_USER_EMAIL` ou `admin@g360.com.br`; se o email não existir, usa o primeiro utilizador ativo (com aviso).
- **Catálogo grande:** `SEED_PORTAL_MAX_SERVICES=N` processa só os **N** primeiros serviços ativos (ordenados por nome).
- **Pré-requisito:** serviços ativos no catálogo (ex.: `npm run seed:catalog` / catálogo ITIL por tenant).

Scripts: `BACKEND/src/scripts/seed-portal-tickets-showcase.js`, `seed-portal-tickets-showcase-all-tenants.js`, `sanitize-production-like-labels.js`.

## API / backend (referência)

- Criação e listagem: `BACKEND/src/services/ticket.service.js`, `BACKEND/src/controllers/ticket.controller.js`
- **Código do chamado:** gerado na criação (sequência por ano civil); formato compacto **`HD` + 2 dígitos do ano + 4 dígitos** (ex.: `HD260359`). Se a base ainda tiver códigos antigos `HD-AAAA-NNNN`, migrar com `npm run db:migrate-ticket-codes` no `BACKEND` (script `migrate-ticket-codes-legacy-format.js`).
- Atualização de estado: `TicketService.updateStatus` (e-mails/notificações conforme configuração)

## Relação com a fila interna

A fila de atendimento da equipa (ex.: **Central de Serviços** `/servicedesk`) usa os mesmos registos `Ticket` com filtros por perfil; o portal mostra apenas chamados do **requester** autenticado (`getAll` com papel `REQUESTER`).
