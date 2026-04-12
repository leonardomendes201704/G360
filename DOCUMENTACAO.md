# G360 / ITBM — Documentação do sistema

Plataforma de gestão empresarial **multi-tenant** (nome do pacote backend: **g360-backend**; pasta do repositório: **ITBM**). Este documento consolida arquitetura, segurança, API, jobs, variáveis de ambiente, módulos de negócio e referências técnicas — **alinhado ao código** em `BACKEND/` e `FRONTEND/`.

**Documentação complementar:** `docs/documentacao-modulos-itbm.html` (manual por módulo, regras RN-* e diagramas; **inclui uma cópia integral deste `.md`** na secção «Documentação técnica», no mesmo ficheiro HTML). Para voltar a gerar essa secção a partir deste ficheiro: `node docs/sync-documentacao-html.js` na raiz do repositório. **Matriz RBAC:** `rbac-matrix.json`. **Exploração de API:** Swagger em `/api/docs` (apenas fora de produção).

---

## 1. Visão geral da arquitetura

| Camada | Tecnologia | Observações |
|--------|------------|-------------|
| Frontend | React 19, Vite 6, React Router 6 | SPA: Material UI 7, Emotion, Tailwind 4 (PostCSS), axios |
| Backend | Node.js, Express 4 | API REST sob prefixo **`/api/v1`** |
| Banco | PostgreSQL | Schema **`public`**: catálogo de tenants e configurações globais; **um schema por tenant** para dados de negócio |
| ORM | Prisma 5 | `BACKEND/src/prisma/schema.prisma` |
| Auth | JWT (access) + refresh token (BD) | Header `Authorization: Bearer`; opcional `X-Tenant-Slug` |
| Docs API | Swagger UI | `/api/docs` e `/api/docs.json` se `NODE_ENV !== 'production'` |

Fluxo típico: o cliente envia JWT; `tenant-resolver` (global em `/api`) resolve `req.prisma` para o schema do tenant; `authMiddleware` nas rotas protegidas; `authorize()` aplica `rbac-matrix.json`; serviços aplicam **escopo** (`access-scope.js`) onde implementado.

---

## 2. Stack tecnológica (versões de referência)

### 2.1 Backend (`BACKEND/package.json`)

- **Core:** `express`, `express-async-errors`, `cors`, `helmet`, `morgan`, `dotenv`
- **Dados:** `@prisma/client`, `pg`
- **Auth / segurança:** `jsonwebtoken`, `bcryptjs`, `express-rate-limit`
- **Integrações:** `@azure/msal-node`, `@microsoft/microsoft-graph-client`, `ldapjs`, `nodemailer`, `imapflow`, `mailparser`
- **Utilitários:** `yup`, `multer`, `xlsx`, `marked`, `luxon`, `node-cron`, `winston`, `swagger-jsdoc`, `swagger-ui-express`, `isomorphic-dompurify`, `file-type`, `selfsigned`
- **Entrada:** `src/app.js` — HTTPS opcional (certificados em `BACKEND/src/certs`)

### 2.2 Frontend (`FRONTEND/package.json`)

- **Build:** Vite 6, `@vitejs/plugin-react`
- **UI:** `@mui/material`, `@mui/x-data-grid`, `@mui/x-date-pickers`, `@mui/x-charts`, `recharts`, `react-big-calendar`, `gantt-task-react`
- **Form / dados:** `react-hook-form`, `@hookform/resolvers`, `yup`, `formik`, `axios`, `jwt-decode`, `lodash`, `date-fns`
- **UX:** `notistack`, `@hello-pangea/dnd`, `@dnd-kit/*`, `lucide-react`, `react-quill-new`, `jspdf`, `jspdf-autotable`
- **Testes:** Vitest, Testing Library, Playwright (E2E)

---

## 3. Estrutura relevante do repositório

| Caminho | Conteúdo |
|---------|----------|
| `BACKEND/src/app.js` | Express: Helmet, CORS, rate limit global, `securityLogger`, `tenantResolver`, rotas, health, uploads estáticos |
| `BACKEND/src/routes/` | Definição REST por domínio; agregado em `routes/index.js` |
| `BACKEND/src/middlewares/` | `auth`, `permission` (`authorize`), `tenant-resolver`, `audit`, `sanitize`, `rate-limit`, `security-logger`, `error-handler`, uploads |
| `BACKEND/src/services/` | Regras de negócio e orquestração |
| `BACKEND/src/repositories/` | Acesso a dados Prisma |
| `BACKEND/src/utils/` | `access-scope`, `audit-sanitize`, `audit-log-scope`, `permission-check`, `notification-prefs`, `notification-sse-hub`, etc. |
| `BACKEND/src/jobs/` | Jobs auxiliares (ex.: notificações) |
| `FRONTEND/src/` | Páginas, componentes, contextos (`AuthContext`, `ThemeContext`, `TaskTimerContext`), serviços API |
| `rbac-matrix.json` | Módulos e ações canónicos para UI e backend |

---

## 4. Multi-tenant e resolução de tenant

- **Catálogo:** modelo `Tenant` no schema `public` (slug, `schemaName`, plano, `enabledModules`, etc.).
- **`tenantResolver()` (rotas autenticadas):** prioridade — payload JWT (`schemaName` / `tenantSlug`) → decodificar `Authorization: Bearer` se ainda não houver `req.user` → **GET com `?token=`** apenas para JWT com `purpose: 'sse'` (SSE de notificações) → header `x-tenant-slug` → cliente Prisma padrão.
- **`tenantResolverPublic()`:** login/Azure/LDAP — tenant por `tenantSlug` no body/params/header.
- **`tenantResolverAdmin()`:** operações de super-admin no catálogo (`req.prisma` = client público).

---

## 5. Segurança, governança e conformidade

### 5.1 Autenticação

- **Login:** local (email/senha), **Azure AD** (MSAL), **LDAP** — conforme rotas em `/auth/login`, `/auth/azure`, `/auth/ldap`.
- **Tokens:** access JWT (payload: `userId`, `email`, `roles`, `tenantSlug`, `schemaName`); refresh armazenado na tabela `RefreshToken` com revogação no logout.
- **Endpoints públicos:** `POST /auth/login`, `/auth/azure`, `/auth/ldap`, `/auth/refresh`, `/auth/logout`, `GET /auth/azure-config/:tenantSlug`.
- **Endpoints autenticados:** `POST /auth/stream-token`, `GET /auth/me`, `PATCH /auth/me/notification-preferences`.
- **Auditoria de sessão (AuditLog, módulo `AUTH`):** eventos `AUTH_LOGIN`, `AUTH_REFRESH`, `AUTH_LOGOUT` gravados no controller (login bem-sucedido por canal LOCAL/AZURE/LDAP; refresh e logout após validação do refresh token). Não dependem do middleware `audit()` em rotas sem JWT completo.

### 5.2 Rate limiting (`rate-limit.middleware.js`)

| Limiter | Uso típico | Notas |
|---------|------------|--------|
| `loginLimiter` | `/auth/login`, Azure, LDAP | Chave por **email** no body; limite reforçado em produção |
| `globalLimiter` | Todas as rotas `/api` | Chave **`uid:<userId>`** se Bearer JWT válido; senão IP. Health `GET /api/health` é ignorado |
| `strictLimiter` | Operações sensíveis (ex.: refresh) | Limite mais baixo |
| `referenceLimiter` | Endpoints de referência leves | — |

`RATE_LIMIT_BYPASS=true` desativa limites para testes de carga.

### 5.3 Proteção HTTP e payload

- **Helmet:** CSP, HSTS, `noSniff`, `hidePoweredBy`, `Referrer-Policy`, `Permissions-Policy`.
- **CORS:** origens em desenvolvimento (localhost e IPs privados); em produção `ALLOWED_ORIGINS` (lista separada por vírgulas).
- **Sanitização global:** middleware `sanitize` em `req.body` (mitigação XSS).
- **Limites de body:** JSON/urlencoded 100kb em `app.js`.

### 5.4 Logging de segurança

- **`securityLogger`:** em respostas **401, 403, 429** regista evento via **Winston** (`logger.warn` com `category: 'SECURITY'`), incluindo IP, método, path, utilizador quando existir.
- **Funções auxiliares:** `logFailedLogin`, `logBlockedUpload`, `writeSecurityLog` — mesmo canal (sem duplicar `appendFile` manual).

### 5.5 Auditoria de dados (AuditLog)

- **Middleware `audit(module, action?)`:** interceta `res.json` / `res.send` em sucesso 2xx; deriva ação (POST→CREATE, PUT/PATCH→UPDATE, DELETE→DELETE, GET→READ) se omitida; grava `oldData`/`newData` **sanitizados** (`audit-sanitize.util.js` — passwords, tokens, emails mascarados, profundidade limitada).
- **Requisito:** `req.user.userId` e `req.prisma`; sem utilizador autenticado não grava (evita linhas inválidas).
- **Entidade:** `entityId` obtido de `req.params` (`id`, `ticketId`, `minuteId`, `costId`, etc.) ou corpo.
- **Rotas com auditoria:** dezenas de módulos; **Help Desk** (`HELPDESK`) e **Problemas** (`PROBLEM`) incluem mutações; ver `ticket.routes.js` e `problem.routes.js`.
- **Listagem / export:** `GET /audit-logs` e `GET /audit-logs/export` (CSV) com **mesmo filtro RBAC** que a listagem (`audit-log-scope.util.js`). Export: limite `AUDIT_LOG_EXPORT_MAX` (default 10 000, máx. 100 000), BOM UTF-8.
- **Retenção:** cron diário **03:30** — remove registos com `createdAt` anterior a **N dias** (`AUDIT_LOG_RETENTION_DAYS`, default **365**). Desativar pruning: `AUDIT_LOG_RETENTION_DAYS=0` ou `AUDIT_LOG_RETENTION_DISABLED=true`.

### 5.6 Notificações em tempo real (SSE)

- **`GET /notifications/stream`:** Server-Sent Events; **não** envia o access token completo na query.
- **Fluxo:** cliente autenticado chama **`POST /auth/stream-token`** → recebe JWT de curta duração com **`purpose: 'sse'`** → `EventSource` usa `?token=<sse_jwt>`.
- **Expiração SSE:** `JWT_SSE_EXPIRES_IN` (ex.: `10m`).
- **Tenant:** `tenant-resolver` valida o token SSE e preenche `req.user` para `authorize('NOTIFICATIONS', 'READ')`.

### 5.7 RBAC e escopo

- **Matriz:** `rbac-matrix.json` — módulos `HELPDESK`, `INCIDENT`, `PROBLEM`, `PROJECTS`, `GMUD`, `FINANCE`, `CONTRACTS`, `SUPPLIERS`, `ASSETS`, `TASKS`, `KB`, `RISKS`, `APPROVALS`, `CONFIG`, `ACTIVITY_LOG`, `NOTIFICATIONS`, `UPLOAD`, `SUPER_ADMIN`, etc.
- **`authorize(module, action)`:** carrega utilizador com permissões e verifica par `module`+`action`.
- **Escopo (`getUserAccessScope` / `access-scope.js`):** administradores globais; gestores por departamentos/centros geridos; restantes escopo próprio — aplicado em listagens (ex.: notificações com links, audit log para não-super-admin).

---

## 6. Variáveis de ambiente (referência)

| Variável | Função |
|----------|--------|
| `DATABASE_URL` | PostgreSQL (com schema default ou `?schema=public`) |
| `JWT_SECRET` | Assinatura HS256 dos JWT |
| `JWT_EXPIRES_IN` | TTL do access token (ex.: `15m`) |
| `JWT_SSE_EXPIRES_IN` | TTL do token só para SSE (ex.: `10m`) |
| `FRONTEND_URL` | Redirects e links em e-mails (ex.: `/tasks/:id`) |
| `ALLOWED_ORIGINS` | CORS em produção (lista separada por vírgulas) |
| `NODE_ENV` | `production` desativa Swagger; afeta nível de log |
| `PORT` | Porta HTTP(S) do backend (default **8500**) |
| `RATE_LIMIT_BYPASS` | `true` relaxa rate limits |
| `DEV_HTTP` | HTTP para testes |
| `NODE_APP_INSTANCE` | PM2: apenas instância **0** executa crons |
| `AUDIT_LOG_RETENTION_DAYS` | Dias de retenção de `AuditLog` (0 = não apagar via job) |
| `AUDIT_LOG_RETENTION_DISABLED` | `true` desliga o job de pruning |
| `AUDIT_LOG_EXPORT_MAX` | Máximo de linhas no CSV de audit |

Variáveis adicionais podem existir para SMTP, Azure, LDAP e testes (ver `.env` local).

---

## 7. Domínios da API (`/api/v1`)

Definidos em `BACKEND/src/routes/index.js`:

| Prefixo | Domínio |
|---------|---------|
| `/auth` | Login, refresh, logout, me, stream-token, preferências de notificação |
| `/tenants` | Administração de empresas (super-admin) |
| `/users`, `/roles` | Utilizadores e perfis |
| `/departments`, `/cost-centers`, `/suppliers` | Organização e fornecedores |
| `/accounts`, `/fiscal-years`, `/budgets`, `/budget-comparison`, `/expenses`, `/contracts`, `/finance-dashboard` | Financeiro |
| `/asset-categories`, `/assets`, `/software-licenses` | Ativos e licenças |
| `/projects`, `/project-tasks`, `/tasks` | Projetos e tarefas |
| `/changes`, `/change-templates`, `/freeze-windows` | GMUD |
| `/incidents` | Incidentes |
| `/tickets`, `/service-catalog`, `/sla-policies`, `/problems`, `/helpdesk-config`, `/support-groups` | Help Desk |
| `/corporate-risks`, `/approvals`, `/approval-tiers`, `/audit-logs` | Riscos, aprovações, auditoria |
| `/knowledge-base`, `/knowledge-categories` | Base de conhecimento |
| `/notifications` | Lista, marcar lidas, **stream** SSE |
| `/dashboard`, `/integrations`, `/uploads`, `/reference`, `/global-settings` | Dashboard, integrações, ficheiros, referência, settings globais |

**Estáticos:** `GET /uploads/...` servidos pelo Express. **Health:** `GET /api/health`, `GET /api/v1/health`.

---

## 8. Jobs agendados (`CronService`)

| Agenda (cron) | Função |
|----------------|--------|
| `30 3 * * *` | Pruning de **AuditLog** por tenant (retenção configurável) |
| `0 8 * * *` | Vencimento de **contratos** e **licenças** (alertas) |
| `*/5 * * * *` | **SLA de tickets** — deteção de estouro, notificações |
| `* * * * *` | **IMAP** — processamento de e-mails de resposta (inbound) |

Apenas **uma instância** (PM2 `NODE_APP_INSTANCE` 0 ou indefinido) agenda tarefas.

---

## 9. Módulos funcionais (resumo de negócio)

### 9.1 Autenticação e sessão

- LocalStorage típico: `g360_token`, `g360_refresh_token`, `g360_user`, `g360_tenant_slug`.
- Interceptor axios: refresh em 401; anexar `X-Tenant-Slug` quando aplicável.

### 9.2 Dashboard

- `DashboardRouter`, API `/dashboard` — KPIs conforme serviço.

### 9.3 Projetos (PPM)

- Propostas, custos, atas, follow-ups, membros, vínculos com tickets/GMUD; aprovações na esteira.

### 9.4 Tarefas (`TASKS`)

- Checklist, comentários, anexos, time logs, timer flutuante; `riskId` opcional (mitigação ERM).

### 9.5 GMUD

- RFC, risco, CAB, freeze windows, PIR; ligação a incidentes e tickets.

### 9.6 Incidentes (ITIL)

- Prioridade, SLA, histórico, comentários, anexos; vínculos a ativos e mudanças.

### 9.7 Help Desk

- Portal `/portal`, Service Desk `/servicedesk`, catálogo, políticas SLA, grupos, métricas, export CSV de fila; **auditoria** em mutações de tickets e problemas.

### 9.8 Ativos e licenças

- Manutenções, vínculos CMDB; alertas de licença (cron).

### 9.9 Fornecedores e contratos

- Cadastro; contratos com aditivos, anexos, alertas 30/15/7 dias.

### 9.10 Financeiro

- Exercícios, orçamentos, despesas, comparação, dashboard financeiro.

### 9.11 Riscos corporativos (ERM)

- Heatmap, tratamento, ligação a tarefas de mitigação.

### 9.12 Base de conhecimento

- Categorias, artigos, deflexão no portal quando implementado.

### 9.13 Aprovações

- `/approvals` — consolida pendências; `/approval-tiers` — níveis configuráveis.

### 9.14 Organização (CONFIG)

- Departamentos, centros de custo, utilizadores, perfis, import Azure (quando habilitado).

### 9.15 Plataforma e auditoria

- Tenants, global settings, **log de atividades** (`/activities` no frontend) com API `/audit-logs` + **export CSV**.

### 9.16 Notificações

- In-app, e-mail em muitos fluxos; **SSE** com token dedicado; preferências `PATCH /auth/me/notification-preferences`; polling de fallback no layout.

---

## 10. Integrações técnicas

- **LDAP:** `Integration` tipo LDAP + `LdapService`; login `/auth/ldap`.
- **Azure AD:** integração em BD + MSAL; login `/auth/azure`; `GET /auth/azure-config/:tenantSlug`.
- **E-mail:** `MailService` / templates; notificações podem disparar envio.
- **IMAP:** `InboundEmailService` + cron para respostas ligadas a tickets (quando configurado).
- **`/integrations`:** atualização e teste de integrações por tipo (CONFIG).

---

## 11. Redirecionamentos e legado

- `GET /tasks/:id` no backend redireciona **301** para `FRONTEND_URL/tasks/:id`.

---

## 12. Testes e qualidade

- **Backend:** Jest, Supertest; config separada para integração (`jest-integration.config.js`); carga opcional (Artillery).
- **Frontend:** Vitest + Testing Library; Playwright para E2E.

---

## 13. Implantação e base de dados

Comandos principais (ver também scripts npm em `BACKEND/package.json`):

- `npm run prisma:generate`
- `npx prisma migrate deploy` (por schema se necessário)
- **`npm run deploy:tenants`** — migrations em todos os tenants + seed idempotente do catálogo ITIL
- `npm run seed`, `seed:catalog`, `seed:catalog:all` conforme necessidade
- Provisionamento de tenant: `node src/scripts/provision-tenant.js` (quando aplicável)

**Scripts operacionais:** o directório `BACKEND/src/scripts/` contém utilitários de manutenção (migração multi-tenant, seeds parciais, diagnóstico RBAC, integrações, resets controlados, certificados, etc.). **Reveja o código e o comentário de cada script antes de executar** — não fazem parte do fluxo normal da API em runtime.

---

## 14. Frontend — mapa de rotas (SPA)

Definidas em `FRONTEND/src/App.jsx`. Rotas públicas: `/login`, `/auth/callback`. Demais rotas passam por `PrivateRoute` (layout `MainLayout` + `FloatingTimer`).

| Rota | Área |
|------|------|
| `/`, `/dashboard` | Redirecionamento e dashboard (`DashboardRouter`) |
| `/modern-dashboard` | Dashboard alternativo (demo) |
| `/projects`, `/projects/portfolio`, `/projects/team-status-report`, `/projects/:id` | Projetos |
| `/tasks`, `/tasks/time-report`, `/tasks/:id` | Tarefas |
| `/knowledge` | Base de conhecimento |
| `/changes` | GMUD |
| `/incidents` | Incidentes |
| `/assets` | Ativos |
| `/risks` | Riscos corporativos |
| `/suppliers` | Fornecedores |
| `/contracts`, `/contracts/:id` | Contratos |
| `/finance`, `/finance/budget/:id`, `/finance/compare` | Financeiro |
| `/activities` | Log de atividades / auditoria (UI) |
| `/approvals` | Minhas aprovações |
| `/config/organization`, `/config/tenants`, `/config/global` | Organização, tenants, settings globais |
| `/portal`, `/portal/tickets/:id` | Portal do solicitante |
| `/servicedesk`, `/servicedesk/settings`, `/servicedesk/catalog`, `/servicedesk/problems` | Service Desk, catálogo, problemas |

Qualquer outro path cai no fallback para `/login`.

---

## 15. Nomenclatura

- Repositório **ITBM**; npm backend **g360-backend**; UI **G360 Enterprise**. Tratar como um produto com nomes legados coexistindo.

---

*Última revisão alinhada ao código-fonte: rotas backend e frontend, middlewares de segurança, auditoria, SSE, rate limits, cron e export de compliance. Para detalhes de endpoint por rota, use Swagger (`/api/docs`) ou os ficheiros `BACKEND/src/routes/*.routes.js`.*
