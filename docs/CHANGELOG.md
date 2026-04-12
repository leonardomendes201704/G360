# Changelog

Todas as alteracoes relevantes do projeto G360 serao documentadas neste arquivo.
Formato baseado em [Keep a Changelog](https://keepachangelog.com/).

---

## [2026-04-12]

### Added
- **US-005:** Componente `StandardGrid` — tabela padronizada com busca, ordenacao, paginacao e acoes por linha
  - `FRONTEND/src/components/common/StandardGrid.jsx`
- **US-006:** Componente `KpiGrid` + adaptacao do `StatsCard` existente com suporte a `onClick`, `iconName` e `hexColor`
  - `FRONTEND/src/components/common/KpiGrid.jsx`
  - `FRONTEND/src/components/common/StatsCard.jsx` (editado)
- **US-007:** Componente `FilterDrawer` — painel off-canvas lateral para filtros com MUI Drawer
  - `FRONTEND/src/components/common/FilterDrawer.jsx`
- **US-008:** Componente `LoadingOverlay` — overlay semi-transparente reutilizavel com spinner
  - `FRONTEND/src/components/common/LoadingOverlay.jsx`
- **US-009:** Componente `StandardModal` — wrapper padronizado do MUI Dialog com header, footer e loading
  - `FRONTEND/src/components/common/StandardModal.jsx`

### Changed
- **MyApprovalsPage** refatorada como piloto: KPIs inline substituidos por `StatsCard` + `KpiGrid`, overlay inline substituido por `LoadingOverlay`
  - `FRONTEND/src/pages/approvals/MyApprovalsPage.jsx`

### Fixed
- **US-004/BUG-004:** Corrigido erro ao clicar em "Nova GMUD". Dois bugs: (1) `projectService.getAll()` retornava objeto paginado `{data, meta}` sendo tratado como array — causava `TypeError: projectsList.map is not a function`. (2) Guard `if (!open || !mounted)` no ChangeModal criava deadlock impedindo modal de abrir.
  - `FRONTEND/src/components/modals/ChangeModal.jsx`
- **US-003/BUG-003:** Corrigido layout shift ao navegar entre categorias na tela de Aprovacoes. Lista de items agora permanece renderizada com overlay de loading por cima (ao inves de desmontar). Adicionado estado `switching`, `minHeight` no container e preservacao de scroll.
  - `FRONTEND/src/pages/approvals/MyApprovalsPage.jsx`
- **US-002/BUG-002:** Corrigido Portal do Suporte que nao permitia abrir chamados no tenant Devcraft Studio. Causa: tabelas `ServiceCatalog` e `TicketCategory` nao existiam no schema `tenant_devcraft` (migrations/seed nunca executados). Solucao: executado `npm run deploy:tenants`.
  - Nenhum arquivo de codigo alterado — problema operacional (migrations/seed pendentes)
- **US-001/BUG-001:** Corrigido comportamento de "pisca" ao salvar tenant. Modal agora exibe loading (`CircularProgress`), feedback de sucesso (`Alert`) e so fecha apos dados serem atualizados no backend. Corrigido `useEffect` que resetava campos durante animacao de fechamento.
  - `FRONTEND/src/components/modals/TenantModal.jsx` — Estados saving/success, bloqueio de close durante save, guard `!open` no useEffect
  - `FRONTEND/src/pages/admin/TenantAdminPage.jsx` — Reordenado close apos await fetch em handleCreate e handleUpdate

### Added
- **Backlog completo** com 4 Epicos, 17 User Stories, 4 Bugs (83 Story Points) organizados em 4 fases de priorizacao, formato Azure DevOps
  - `docs/backlog/_INDEX.md` — Indice geral com resumo e metricas
  - `docs/backlog/BUGS.md` — Registro de 4 bugs criticos
  - `docs/backlog/EP-001-correcoes-criticas/` — 4 historias (US-001 a US-004)
  - `docs/backlog/EP-002-componentes-reutilizaveis/` — 5 historias (US-005 a US-009)
  - `docs/backlog/EP-003-padronizacao-visual/` — 4 historias (US-010 a US-013)
  - `docs/backlog/EP-004-melhorias-ux-dashboard/` — 4 historias (US-014 a US-017)

### Docs
- **CLAUDE.md** criado com diretrizes do agente: gestao de backlog, templates Azure DevOps, regras de gestao, diretriz de documentacao de conclusao de tasks, diretriz de changelog
  - `CLAUDE.md`
- **README.md** criado com documentacao completa do projeto: arquitetura, stack, instalacao, execucao, testes e deploy
  - `README.md`
- **.gitignore** criado com exclusoes para node_modules, .env, logs, chaves SSL, backups SQL
  - `.gitignore`

---

*Mantido pelo agente Claude conforme diretriz do CLAUDE.md*
