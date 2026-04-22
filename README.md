# G360 - Enterprise Management Platform

Plataforma empresarial multi-tenant para gestao integrada de TI e negocios, unificando service desk (ITIL), gerenciamento de projetos (PPM), gestao financeira, ativos, riscos corporativos e governanca em uma unica aplicacao SaaS.

## Visao Geral

O G360 foi projetado para empresas de medio e grande porte que necessitam consolidar operacoes de TI e gestao corporativa. A plataforma oferece isolamento completo por tenant (schema PostgreSQL dedicado), controle de acesso granular (RBAC) com 18+ modulos e notificacoes em tempo real via SSE.

## Funcionalidades Principais

### Service Desk & Help Desk
- Suporte multi-nivel (N1/N2) com atribuicao round-robin
- Catalogo de servicos com formularios dinamicos
- Gestao de SLA com pausa/retomada e alertas de escalonamento
- Notas internas (tecnicas) e mensagens publicas
- Escalacao para problemas e vinculacao com GMUDs

### Gerenciamento de Projetos (PPM)
- Propostas com fluxo de aprovacao e rastreamento de custos
- Atas de reuniao com workflow de aprovacao
- Membros de equipe com papeis por projeto
- Riscos vinculados a tarefas de mitigacao
- Follow-ups e acoes com responsaveis

### Gestao de Mudancas (GMUD)
- RFC com avaliacao de risco
- Templates reutilizaveis
- Votacao do CAB (Change Advisory Board)
- Calendario de freeze windows com deteccao de conflitos
- PIR (Post-Implementation Review)

### Gestao Financeira
- Planejamento por ano fiscal com cenarios "what-if"
- Orcamentos por departamento/centro de custo (OPEX/CAPEX)
- Rastreamento de despesas com integracao NF-e
- Dashboard com KPIs e analise de variancia

### Gestao de Ativos e Licencas
- Registro de ativos com categorias e depreciacao
- Agendamento e historico de manutencao
- Alertas de expiracao de licencas de software

### Gestao de Riscos Corporativos
- Heatmap de riscos (probabilidade x impacto)
- Rastreamento de tratamento
- Criacao automatica de tarefas de mitigacao

### Incidentes e Problemas
- Categorizacao ITIL com SLA
- Matriz de prioridade (impacto x urgencia)
- Gestao de problemas com resolucao em cascata

### Outros Modulos
- **Fornecedores e Contratos** - Ciclo de vida com alertas de renovacao (30/15/7 dias)
- **Base de Conhecimento** - Artigos categorizados com tags e anexos
- **Workflows de Aprovacao** - Alcadas por tipo de entidade e faixa de valor
- **Auditoria** - Trilha completa de acoes com diff de dados e exportacao CSV
- **Notificacoes em Tempo Real** - SSE com fallback para polling

## Stack Tecnologica

### Backend
| Tecnologia | Uso |
|---|---|
| Node.js + Express | API REST |
| PostgreSQL + Prisma | Banco de dados e ORM |
| JWT + Refresh Tokens | Autenticacao |
| Helmet + Rate Limiting | Seguranca |
| SSE (Server-Sent Events) | Notificacoes em tempo real |
| Nodemailer + IMAP | Email transacional e inbound |
| node-cron | Jobs agendados |
| Winston | Logging |
| Swagger | Documentacao da API |

### Frontend
| Tecnologia | Uso |
|---|---|
| React 19 + Vite 6 | SPA e build |
| Material UI 7 | Componentes de interface |
| React Router 6 | Roteamento |
| React Hook Form + Yup | Formularios e validacao |
| Recharts + MUI X-Charts | Graficos e dashboards |
| MUI Data Grid | Tabelas de dados |
| Axios | Cliente HTTP |
| Playwright + Vitest | Testes E2E e unitarios |

## Arquitetura

```
                    +-------------------+
                    |    Frontend       |
                    |  React/Vite:5176  |
                    +--------+----------+
                             |
                             | HTTPS
                             v
                    +--------+----------+
                    |    Backend        |
                    | Express API:8500  |
                    +--------+----------+
                             |
              +--------------+--------------+
              |              |              |
        +-----+----+  +-----+----+  +------+---+
        | Schema   |  | Schema   |  | Schema   |
        | Tenant A |  | Tenant B |  | public   |
        +----------+  +----------+  +----------+
                    PostgreSQL
```

**Multi-Tenancy:** Cada tenant possui um schema PostgreSQL isolado. O `TenantManager` gerencia um pool de PrismaClients com cache LRU (max 30 clientes).

**RBAC:** Matriz centralizada (`rbac-matrix.json`) com 4 perfis base:
- **Super Admin** - Acesso total
- **Manager** - Gestao de area
- **Collaborator** - Acesso padrao
- **CAB Member** - Membro do comite de mudancas

**Seguranca:** Helmet (CSP, HSTS), rate limiting por rota, sanitizacao de entrada (DOMPurify), auditoria automatica, bcrypt para senhas.

## Pre-requisitos

- Node.js 18+
- PostgreSQL 15+
- npm ou yarn

## Instalacao

```bash
# Clonar o repositorio
git clone https://github.com/leonardomendes201704/G360.git
cd G360

# Backend
cd BACKEND
npm install
cp .env.example .env        # configurar variaveis de ambiente
npx prisma generate
npx prisma migrate dev
npm run seed                 # criar usuario admin e dados iniciais

# Frontend
cd ../FRONTEND
npm install
cp .env.example .env        # configurar URL da API
```

## Variaveis de Ambiente

### Backend (.env)
```env
PORT=8500
DATABASE_URL="postgresql://user:password@localhost:5432/itbm?schema=public"
JWT_SECRET="sua-chave-secreta"
JWT_EXPIRES_IN="1d"
REFRESH_TOKEN_EXPIRES_IN="7d"
FRONTEND_URL="http://localhost:5176"
NODE_ENV="development"
```

### Frontend (.env)
```env
VITE_API_URL="http://localhost:8500/api/v1"
```

## Executando o Projeto

```bash
# Terminal 1 - Backend
cd BACKEND
npm run dev

# Terminal 2 - Frontend
cd FRONTEND
npm run dev
```

O backend estara disponivel em `https://localhost:8500` e o frontend em `https://localhost:5176` (HTTP se sem certificados locais; ver `vite.config.js`).

### Docker (Postgres + backend + frontend)

Na raiz do repositorio:

```bash
docker compose up -d --build
```

- **Frontend:** http://localhost:8080 (Nginx com build estatico do Vite)
- **API:** http://localhost:8500 (HTTP; `DEV_HTTP=true` no contentor)
- **PostgreSQL no host:** `127.0.0.1:5433` (mesmas credenciais que em `docker-compose.yml`)

A API aplica o schema com `prisma db push` ao iniciar. Para dados iniciais:

```bash
docker compose exec backend npm run seed
```

Apenas o Postgres (sem API/frontend): `docker compose up -d g360-postgres`.

**Deploy num servidor Linux (rede interna, IP, atualizacoes):** ver [docs/deploy-docker-linux.md](docs/deploy-docker-linux.md).

O ficheiro `rbac-matrix.json` na raiz do repositorio entra nas imagens de **backend** e **frontend** (resolucao de permissoes RBAC).

**Credenciais padrao (apos seed):**
- Email: `admin@g360.com.br`
- Senha: `L89*Eb5v@`

## Documentacao da API

Com o backend rodando em modo desenvolvimento, acesse o Swagger UI em:
```
https://localhost:8500/api/docs
```

## Testes

```bash
# Backend - testes unitarios
cd BACKEND
npm test

# Backend - testes de integracao
npm run test:integration

# Frontend - testes unitarios
cd FRONTEND
npm test

# Frontend - testes E2E
npx playwright test
```

## Deploy

O backend utiliza PM2 para gerenciamento de processos em producao:

```bash
cd BACKEND
pm2 start ecosystem.config.js
```

Para migrar todos os tenants em producao:
```bash
npm run deploy:tenants
```

## Integracoes Suportadas

- **Azure Active Directory** - Autenticacao via MSAL/OAuth
- **LDAP** - Autenticacao via diretorio
- **Email (SMTP/IMAP)** - Envio transacional e processamento de respostas por email

## Estrutura do Projeto

```
G360/
├── BACKEND/
│   ├── src/
│   │   ├── app.js              # Setup do Express
│   │   ├── routes/             # 43 modulos de API
│   │   ├── controllers/        # Handlers de requisicao
│   │   ├── services/           # Logica de negocio
│   │   ├── middlewares/        # Auth, audit, rate limit, tenant
│   │   ├── utils/              # RBAC, sanitizacao, SSE hub
│   │   ├── jobs/               # Cron jobs (SLA, alertas, IMAP)
│   │   ├── prisma/             # Schema, migrations, seeds
│   │   └── config/             # Tenant manager, logger, RBAC
│   └── package.json
├── FRONTEND/
│   ├── src/
│   │   ├── pages/              # 18+ diretorios de paginas
│   │   ├── components/         # Compartilhados e por dominio
│   │   ├── contexts/           # Auth, Theme, TaskTimer
│   │   ├── services/           # API client (Axios)
│   │   └── App.jsx             # Roteamento principal
│   └── package.json
├── .github/workflows/          # CI/CD (backend + frontend)
├── rbac-matrix.json            # Matriz canonica de permissoes
└── README.md
```

## Licenca

ISC
