# Portal de Suporte — fluxo e chamados (tickets)

## Visão geral

O **Portal de Suporte** é a área do utilizador final para **abrir e acompanhar chamados** (Service Desk do lado do solicitante).

| Rota | Ficheiro | Descrição |
|------|----------|-----------|
| `/portal` | `FRONTEND/src/pages/helpdesk/PortalPage.jsx` | Lista “Meus Chamados”, catálogo por **categoria** e **serviço**, assistente “Novo ticket”, integração com KB (sugestões ao digitar título) |
| `/portal/tickets/:id` | `FRONTEND/src/pages/helpdesk/TicketDetails.jsx` (ou equivalente) | Detalhe do chamado, mensagens, anexos |

Dados carregados no portal (entre outros): `ticketService.getAll()`, catálogo de serviços, categorias, ativos, grupos de suporte.

## Abrir um chamado

1. **Novo ticket** → assistente por categoria ou seleção direta de serviço.
2. Modal com título, descrição, ativo relacionado (opcional), grupo de suporte (opcional), campos dinâmicos (`formSchema` do `ServiceCatalog`).
3. `POST` de criação com `categoryId`, `serviceId`, `customAnswers`, etc. (`ticket.service` / API tickets).

O backend gera código **HD-AAAA-NNNN**, calcula SLA (política do serviço / grupo / fallback por prioridade) e pode atribuir analista (round-robin do grupo, conforme `HelpdeskConfig`).

## Estados e prioridades (Ticket)

**Estados** válidos na API (`PATCH .../status`): `OPEN`, `IN_PROGRESS`, `WAITING_USER`, `RESOLVED`, `CLOSED` — ver `TicketController.updateStatus`.

**Prioridades** usuais: `LOW`, `MEDIUM`, `HIGH`, `URGENT` (fallback de SLA em `ticket.service.js`).

## “Tipos” de chamado

No produto, o **tipo** corresponde ao **serviço do catálogo** (`ServiceCatalog`): cada serviço pertence a uma `TicketCategory` e pode ter formulário e SLA próprios.

## Seed de demonstração

Cria **até 5 chamados por serviço ativo** — um por **estado** (`OPEN` … `CLOSED`), até ao máximo de 5 estados.

```bash
cd BACKEND
npm run seed:portal-tickets:all
```

- **Idempotência:** títulos `[Seed Portal] {nome do serviço} — {STATUS}`; execuções repetidas não duplicam.
- **Solicitante:** `SEED_PORTAL_REQUESTER_EMAIL` ou `SEED_APPROVALS_USER_EMAIL` ou `admin@g360.com.br`; se o email não existir, usa o primeiro utilizador ativo (com aviso).
- **Catálogo grande:** `SEED_PORTAL_MAX_SERVICES=N` processa só os **N** primeiros serviços ativos (ordenados por nome).
- **Pré-requisito:** serviços ativos no catálogo (ex.: `npm run seed:catalog` / catálogo ITIL por tenant).

Scripts: `BACKEND/src/scripts/seed-portal-tickets-showcase.js`, `seed-portal-tickets-showcase-all-tenants.js`.

## API / backend (referência)

- Criação e listagem: `BACKEND/src/services/ticket.service.js`, `BACKEND/src/controllers/ticket.controller.js`
- Atualização de estado: `TicketService.updateStatus` (e-mails/notificações conforme configuração)

## Relação com a fila interna

A fila de atendimento da equipa (ex.: **Central de Serviços** `/servicedesk`) usa os mesmos registos `Ticket` com filtros por perfil; o portal mostra apenas chamados do **requester** autenticado (`getAll` com papel `REQUESTER`).
