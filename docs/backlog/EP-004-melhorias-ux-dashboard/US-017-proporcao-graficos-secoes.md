# US-017: Otimizar proporcao dos graficos e secoes do Dashboard

| Campo              | Valor                                       |
|--------------------|---------------------------------------------|
| **ID**             | US-017                                      |
| **Epico**          | EP-004                                      |
| **Prioridade**     | Media                                       |
| **Story Points**   | 5                                           |
| **Sprint**         | A definir                                   |
| **Status**         | New                                         |
| **Responsavel**    |                                             |
| **Criado em**      | 2026-04-12                                  |

## User Story
**Como** usuario do sistema,
**Quero** que os graficos e secoes do dashboard tenham proporcoes equilibradas,
**Para** ter melhor aproveitamento do espaco e leitura visual da pagina.

## Ajustes Identificados
1. **Grafico de incidentes** — Aumentar altura vertical para melhor leitura e proporcao
2. **Distribuicao de tarefas e riscos** — Reduzir altura para ~50% do grafico de incidentes
3. **Atividades recentes** — Ocupar 100% da largura em linha unica (leitura horizontal)

## Criterios de Aceite
- [ ] Dado que o grafico de incidentes e exibido, quando visualizo, entao a altura e suficiente para boa leitura
- [ ] Dado que as secoes de distribuicao existem, quando comparadas ao grafico de incidentes, entao ocupam ~50% da altura
- [ ] Dado que atividades recentes e exibida, quando visualizo, entao ocupa 100% da largura

## Tasks
| ID   | Descricao                                                         | Status | Estimativa |
|------|-------------------------------------------------------------------|--------|------------|
| T-01 | Aumentar altura do grafico de incidentes                          | New    | 1h         |
| T-02 | Reduzir altura das secoes de distribuicao de tarefas e riscos     | New    | 1h         |
| T-03 | Ajustar secao de atividades recentes para 100% largura            | New    | 1h         |
| T-04 | Equilibrar grid layout geral do dashboard                         | New    | 2h         |
| T-05 | Validar proporcoes em diferentes resolucoes                       | New    | 1h         |

## Notas Tecnicas
- Ajustar CSS Grid/Flexbox no layout do dashboard
- Testar em resolucoes: 1366x768, 1920x1080, 2560x1440
- Arquivos: `FRONTEND/src/pages/dashboard/`

## Definicao de Pronto (DoD)
- [ ] Proporcoes ajustadas conforme especificacao
- [ ] Responsividade validada em 3 resolucoes
- [ ] Visual equilibrado sem scroll excessivo
