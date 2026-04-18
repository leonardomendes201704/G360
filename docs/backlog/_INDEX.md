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
| EP-005 | Melhorias de UX - Administracao e Configuracao | Fase 5 | Media      | Closed | 2         | EP-002, EP-003 |
| EP-006 | Melhorias de UX - Dashboard do Tenant (refinamentos) | Fase 6 | Media      | Closed | 1         | EP-004     |
| EP-007 | Padronizacao de filtros em modulos (off-canvas)       | -      | Media      | Closed | 1         | EP-002     |
| EP-008 | Padronizacao e componentizacao de modais (Frontend)     | -      | Alta       | Closed | 1         | EP-002, EP-003 |
| EP-009 | Padronizacao de listas e grelhas (Frontend)              | -      | Media      | Closed | 2         | EP-002     |
| EP-010 | Listas Grupo B — casca DataListShell (Frontend)          | -      | Media      | Closed | 2         | EP-002, EP-009 |

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

### EP-005 - Melhorias de UX - Administracao e Configuracao

| ID     | Titulo                                                   | Pontos | Prioridade | Status |
|--------|----------------------------------------------------------|--------|------------|--------|
| US-018 | Footer fixo no modal Novo Tenant (botoes nao cortados)  | 3      | Media      | Resolved |
| US-019 | Fechar modal e feedback claro ao salvar Novo Tenant      | 3      | Media      | Resolved |

### EP-006 - Melhorias de UX - Dashboard do Tenant (refinamentos)

| ID     | Titulo                                                   | Pontos | Prioridade | Status |
|--------|----------------------------------------------------------|--------|------------|--------|
| US-020 | KPIs do dashboard tenant: titulos sem quebra de linha     | 2      | Media      | Resolved |

### EP-007 - Padronizacao de filtros em modulos (off-canvas)

| ID     | Titulo                                                   | Pontos | Prioridade | Status |
|--------|----------------------------------------------------------|--------|------------|--------|
| US-021 | Filtros de Incidentes em drawer off-canvas                | 3      | Media      | Resolved |

### EP-008 - Padronizacao e componentizacao de modais (Frontend)

| ID     | Titulo                                                   | Pontos | Prioridade | Status |
|--------|----------------------------------------------------------|--------|------------|--------|
| US-022 | Padronizacao de modais — shell reutilizavel e migracao progressiva | 13     | Alta       | Resolved |

### EP-009 - Padronizacao de listas e grelhas (Frontend)

| ID     | Titulo                                                   | Pontos | Prioridade | Status |
|--------|----------------------------------------------------------|--------|------------|--------|
| US-023 | Inventario de grelhas + casca DataListShell e primeira migracao | 5      | Media      | Closed |
| US-024 | Portal Meus Chamados — casca DataListShell               | 2      | Media      | Closed |

### EP-010 - Listas Grupo B — casca DataListShell (Frontend)

| ID     | Titulo                                                   | Pontos | Prioridade | Status |
|--------|----------------------------------------------------------|--------|------------|--------|
| US-025 | DataListShell — Problemas (ITIL) + Riscos (lista)        | 5      | Media      | Closed |
| US-026 | DataListShell — restante Grupo B (financeiro, SD, tempo) | 5      | Media      | Closed |

## Resumo

| Metrica                    | Valor |
|----------------------------|-------|
| Total de Epicos            | 10    |
| Total de Historias         | 26    |
| Total de Story Points      | 124   |
| Total de Bugs              | 5     |
| Historias Concluidas       | 26    |
| Historias Abertas (novas)  | 0     |
| Bugs Resolvidos            | 5     |

## Proximos IDs Disponiveis

| Tipo    | Proximo ID |
|---------|------------|
| Epic    | EP-011     |
| Story   | US-027     |
| Bug     | BUG-006    |

## Ordem de Execucao Recomendada

```
EP-001 ─> EP-002 ─> EP-003 ─> EP-004 (Dashboard UX, encerrado) ─> EP-005 (Admin/Config) ─> EP-006 (Dashboard tenant)
EP-008 (Padronizacao modais) — depende de EP-002, EP-003; pode correr em paralelo a outros epicos fechados
```

---
*Ultima atualizacao: 2026-04-18*
