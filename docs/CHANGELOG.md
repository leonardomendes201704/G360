# Changelog

Todas as alteracoes relevantes do projeto G360 serao documentadas neste arquivo.
Formato baseado em [Keep a Changelog](https://keepachangelog.com/).

---

## [2026-04-12]

### Fixed
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
