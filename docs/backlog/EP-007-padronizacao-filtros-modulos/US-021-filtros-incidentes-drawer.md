# US-021: Filtros de Incidentes em drawer off-canvas

| Campo | Valor |
|--------------------|----------------------------|
| **ID** | US-021 |
| **Epico** | EP-007 |
| **Prioridade** | Media |
| **Story Points** | 3 |
| **Sprint** | - |
| **Status** | Resolved |
| **Responsavel** | |
| **Criado em** | 2026-04-15 |

## User Story

**Como** usuario da Gestao de Incidentes,
**Quero** abrir os filtros em um painel lateral (off-canvas),
**Para** alinhar a experiencia ao padrao do sistema e liberar espaco na pagina.

## Criterios de Aceite

- [x] Criterios estruturados (status, prioridade, categoria, responsavel, SLA) ficam no `FilterDrawer`
- [x] Busca rapida permanece na barra da listagem
- [x] Botao "Filtros" com indicador de quantidade de filtros ativos (sem contar busca)
- [x] Acoes Limpar/Aplicar do drawer conforme componente; Limpar no drawer zera criterios do drawer mantendo busca; acao global de limpar tudo disponivel na barra quando aplicavel

## Tasks

| ID | Descricao | Status | Estimativa |
|------|----------------------------------------|--------------|------------|
| T-01 | Substituir Collapse de filtros por FilterDrawer + barra compacta | Resolved | 2h |
| T-02 | Documentar padrao em docs/patterns/filter-drawer.md | Resolved | 0.5h |

## Notas Tecnicas

- Estado rascunho (`draftFilters`) ao abrir o drawer; "Aplicar" persiste em `usePersistedFilters`.
- KPIs continuam aplicando filtros diretamente em `filters`.

## Definicao de Pronto (DoD)

- [x] Codigo implementado e revisado
- [x] Testes unitarios passando (N/A alteracao puramente de UI; regressao manual na tela)
- [x] Documentacao atualizada
- [x] Sem regressoes identificadas

## Resolucao

**Concluido em:** 2026-04-15

**Solucao:** Removido o card com `Collapse`; adicionada barra compacta com botoes "Filtros" (abre `FilterDrawer`) e "Limpar" ( `clearFilters`, inclui busca). Campos de filtro estruturado movidos para o drawer com estado `draftFilters` sincronizado ao abrir; "Aplicar" grava em `filters`; "Limpar" no drawer zera apenas os cinco criterios do drawer, preservando `search`.

**Arquivos alterados:**
- `FRONTEND/src/pages/incidents/IncidentsPage.jsx`
- `docs/patterns/filter-drawer.md` (novo)
- `docs/backlog/_INDEX.md`
- `docs/backlog/EP-007-padronizacao-filtros-modulos/EPIC.md` (novo)
- `docs/backlog/EP-007-padronizacao-filtros-modulos/US-021-filtros-incidentes-drawer.md` (novo)
- `docs/CHANGELOG.md`

**Decisoes:** Manter KPIs atualizando `filters` diretamente; ao reabrir o drawer, o rascunho reflete o estado atual (incluindo alteracoes via KPI).

**Pontos de atencao:** Outras telas de listagem podem ser migradas no mesmo padrao (EP-007).
