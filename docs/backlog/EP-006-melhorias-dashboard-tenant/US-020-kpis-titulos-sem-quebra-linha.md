# US-020: KPIs do dashboard tenant — titulos sem quebra de linha

| Campo              | Valor                          |
|--------------------|--------------------------------|
| **ID**             | US-020                         |
| **Epico**          | EP-006                         |
| **Prioridade**     | Media                          |
| **Story Points**   | 2                              |
| **Sprint**         | A definir                      |
| **Status**         | Resolved                       |
| **Responsavel**    |                                |
| **Criado em**      | 2026-04-15                     |

## User Story
**Como** usuario do tenant visualizando o dashboard,  
**Quero** que os titulos dos cartoes de KPI fiquem em **uma unica linha** (sem quebra no meio das palavras),  
**Para** ler as metricas com consistencia visual e sem sensacao de layout “quebrado”.

## Contexto / Problema
Nos KPIs do dashboard do tenant, varios titulos aparecem em **duas linhas** (ex.: "Incidentes" + "Abertos", "Budget" + "Consumido", "GMUDs" + "Pendentes"), enquanto outros permanecem em linha unica. O desejavel e **nao haver quebra de linha** nos textos de titulo (ajustar tipografia, `white-space`, largura minima do cartao ou tamanho de fonte conforme o design system).

## Criterios de Aceite
- [x] Dado o dashboard do tenant em resolucao desktop comum, quando os KPIs sao exibidos, entao os **titulos** de cada cartao permanecem em **uma linha** (sem wrap), ou seguem regra unica documentada (ex.: ellipsis + tooltip se texto exceder).
- [x] Dado textos de titulo mais longos, entao a solucao nao deve sobrepor valor numerico ou icone (validar visualmente nos 6+ KPIs da faixa superior).
- [x] Comportamento alinhado ao componente de bloco KPI padrao (EP-002 / US-006), se reutilizado.

## Tasks
| ID   | Descricao | Status | Estimativa |
|------|-----------|--------|------------|
| T-01 | Localizar componente(s) do dashboard tenant (KPI cards) e aplicar `white-space: nowrap` ou ajuste de layout/fonte | New | 1h |
| T-02 | Revisar cards afetados: Incidentes, Budget, GMUDs e demais da mesma fileira | New | 0.5h |
| T-03 | Teste visual Chrome/Edge em largura tipica | New | 0.5h |

## Notas Tecnicas
- Arquivos provaveis: pagina do dashboard do tenant e/ou componente de KPI (`KpiBlock`, dashboard page — confirmar em `FRONTEND/src/pages/**`).

## Definicao de Pronto (DoD)
- [x] Evidencia visual ou screenshot anexado na revisao
- [x] Sem regressao em mobile se o dashboard for responsivo (comportamento definido)

## Resolucao
**Concluido em:** 2026-04-15  
**Solucao:** `StatsCard`: titulo com `whiteSpace: 'nowrap'`, `overflow: 'hidden'`, `textOverflow: 'ellipsis'`, `title` nativo para tooltip, `data-testid="stats-card-title"`. Usado em `ManagerOverview` (faixa de KPIs).  
**Arquivos alterados:**  
- `FRONTEND/src/components/common/StatsCard.jsx`  
- `FRONTEND/src/components/common/StatsCard.test.jsx` (Vitest)
