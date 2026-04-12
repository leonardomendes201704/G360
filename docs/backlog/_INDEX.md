# Backlog Geral - G360

> Indice centralizado de todos os Epicos, Historias e Bugs do projeto.
> Formato compativel com Azure DevOps Wiki.

## Epicos

| ID     | Titulo                                    | Fase   | Prioridade | Status | Historias | Depende de |
|--------|-------------------------------------------|--------|------------|--------|-----------|------------|
| EP-001 | Correcoes Criticas Funcionais             | Fase 1 | Alta       | Closed | 4         | -          |
| EP-002 | Componentes Reutilizaveis Base            | Fase 2 | Alta       | Closed | 5         | EP-001     |
| EP-003 | Padronizacao Visual e Identidade          | Fase 3 | Media      | Closed | 4         | EP-002     |
| EP-004 | Melhorias de UX - Dashboard e Modulos     | Fase 4 | Media      | Closed | 4         | EP-002, EP-003 |

## Historias por Epico

### EP-001 - Correcoes Criticas Funcionais

| ID     | Titulo                                                      | Pontos | Prioridade | Status |
|--------|-------------------------------------------------------------|--------|------------|--------|
| US-001 | Corrigir comportamento de salvamento do cadastro de tenant  | 5      | Alta       | Resolved |
| US-002 | Corrigir impossibilidade de abrir chamado no Portal Suporte | 8      | Alta       | Resolved |
| US-003 | Corrigir instabilidade em Aprovacoes ao navegar categorias  | 5      | Alta       | Resolved |
| US-004 | Corrigir erro ao criar nova GMUD                            | 5      | Alta       | Resolved |

### EP-002 - Componentes Reutilizaveis Base

| ID     | Titulo                                        | Pontos | Prioridade | Status |
|--------|-----------------------------------------------|--------|------------|--------|
| US-005 | Criar componente de Grid padrao reutilizavel   | 13     | Alta       | Resolved |
| US-006 | Criar componente de Bloco de KPI padrao        | 5      | Alta       | Resolved |
| US-007 | Criar componente Off-canvas de filtros          | 5      | Media      | Resolved |
| US-008 | Criar componente Overlay de loading             | 3      | Media      | Resolved |
| US-009 | Criar componente Modal padrao                   | 5      | Media      | Resolved |

### EP-003 - Padronizacao Visual e Identidade

| ID     | Titulo                                                   | Pontos | Prioridade | Status |
|--------|----------------------------------------------------------|--------|------------|--------|
| US-010 | Padronizar contraste de botoes em todo o sistema          | 3      | Baixa      | Resolved |
| US-011 | Revisar visual do submenu do usuario                      | 3      | Media      | Resolved |
| US-012 | Padronizar searchbar com icone de lupa                    | 1      | Baixa      | Resolved |
| US-013 | Aplicar componentes padrao nas telas dos modulos          | 13     | Alta       | Resolved |

### EP-004 - Melhorias de UX - Dashboard e Modulos

| ID     | Titulo                                                   | Pontos | Prioridade | Status |
|--------|----------------------------------------------------------|--------|------------|--------|
| US-014 | Melhorar secao de boas-vindas do Dashboard                | 3      | Media      | Resolved |
| US-015 | Ajustar score e pontuacao do Dashboard                    | 3      | Media      | Resolved |
| US-016 | Padronizar KPIs do Dashboard                              | 3      | Media      | Resolved |
| US-017 | Otimizar proporcao dos graficos e secoes do Dashboard     | 5      | Media      | Resolved |

## Resumo

| Metrica                    | Valor |
|----------------------------|-------|
| Total de Epicos            | 4     |
| Total de Historias         | 17    |
| Total de Story Points      | 83    |
| Total de Bugs              | 4     |
| Historias Concluidas       | 17    |
| Bugs Resolvidos            | 4     |

## Proximos IDs Disponiveis

| Tipo    | Proximo ID |
|---------|------------|
| Epic    | EP-005     |
| Story   | US-018     |
| Bug     | BUG-005    |

## Ordem de Execucao Recomendada

```
Fase 1 (EP-001) ──> Fase 2 (EP-002) ──> Fase 3 (EP-003) ──> Fase 4 (EP-004)
  Bugs criticos      Componentes base     Padronizacao         Refinamento UX
  4 historias        5 historias          4 historias          4 historias
  23 pts             31 pts               20 pts               14 pts
```

---
*Ultima atualizacao: 2026-04-12*
