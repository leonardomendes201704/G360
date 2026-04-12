# US-013: Aplicar componentes padrao nas telas dos modulos

| Campo              | Valor                                       |
|--------------------|---------------------------------------------|
| **ID**             | US-013                                      |
| **Epico**          | EP-003                                      |
| **Prioridade**     | Alta                                        |
| **Story Points**   | 13                                          |
| **Sprint**         | A definir                                   |
| **Status**         | New                                         |
| **Responsavel**    |                                             |
| **Criado em**      | 2026-04-12                                  |
| **Depende de**     | US-005, US-006, US-007, US-008, US-009      |

## User Story
**Como** usuario do sistema,
**Quero** que todas as telas utilizem os componentes padronizados (Grid, KPI, Off-canvas, Modal, Loading),
**Para** ter experiencia visual e funcional consistente em todo o sistema.

## Telas e Componentes a Aplicar

| Tela                  | Grid Padrao | KPI Padrao | Off-canvas | Modal Padrao | Loading |
|-----------------------|:-----------:|:----------:|:----------:|:------------:|:-------:|
| Aprovacoes            |             | X          |            |              | X       |
| Portal do Suporte     | X           |            |            |              |         |
| Service Desk          |             | X          |            |              |         |
| Incidentes            | X           | X          | X          |              |         |
| Gestao de Problemas   | X           | X          |            | X            |         |
| GMUD                  | X           | X          | X          |              |         |

## Criterios de Aceite
- [ ] Dado que os componentes base existem (EP-002), quando aplico nas telas listadas, entao o visual e consistente
- [ ] Dado que a tela de Aprovacoes usa KpiCard, quando visualizo os indicadores, entao seguem o padrao compacto
- [ ] Dado que Incidentes e GMUD usam FilterDrawer, quando abro filtros, entao sao off-canvas lateral
- [ ] Dado que Gestao de Problemas usa StandardModal, quando declaro problema, entao o modal segue o padrao
- [ ] Dado que todas as grids usam StandardGrid, quando navego entre telas, entao a experiencia de listagem e identica

## Tasks
| ID   | Descricao                                                          | Status | Estimativa |
|------|--------------------------------------------------------------------|--------|------------|
| T-01 | Aplicar KpiCard padrao na tela de Aprovacoes                       | New    | 2h         |
| T-02 | Aplicar LoadingOverlay na tela de Aprovacoes                       | New    | 1h         |
| T-03 | Aplicar StandardGrid na tela do Portal do Suporte                  | New    | 3h         |
| T-04 | Aplicar KpiCard padrao na tela do Service Desk                     | New    | 2h         |
| T-05 | Aplicar StandardGrid + KpiCard + FilterDrawer na tela de Incidentes | New   | 4h         |
| T-06 | Corrigir contraste de cores da grid de Incidentes                  | New    | 1h         |
| T-07 | Reestruturar tela de Gestao de Problemas (KPIs, busca, filtros)    | New    | 4h         |
| T-08 | Aplicar StandardModal na tela de Declarar Problema                 | New    | 2h         |
| T-09 | Aplicar StandardGrid + KpiCard + FilterDrawer na tela de GMUD      | New    | 4h         |
| T-10 | Testar todas as telas alteradas (regressao visual e funcional)     | New    | 3h         |

## Notas Tecnicas
- Tela de Gestao de Problemas e a mais defasada (nao possui KPIs, busca nem filtros)
- Grid de Incidentes tem texto com cores ilegíveis — corrigir contraste ao aplicar StandardGrid
- GMUD e Incidentes sao as telas que mais se beneficiam do off-canvas de filtros

## Definicao de Pronto (DoD)
- [ ] Todos os componentes aplicados nas telas listadas
- [ ] Testes visuais validados em cada tela
- [ ] Sem regressoes funcionais (CRUD, filtros, acoes)
- [ ] Consistencia visual confirmada entre todas as telas
