# EP-011: DataListTable parametrizavel + migracao incremental de listas

| Campo | Valor |
|-----------------|--------------------------|
| **ID** | EP-011 |
| **Prioridade** | Media |
| **Sprint** | - |
| **Status** | Active |
| **Responsavel** | |
| **Criado em** | 2026-04-18 |

## Descricao

Introduzir o componente **`DataListTable`** (`DataListShell` + tabela MUI + ordenacao client-side + paginacao) parametrizavel por **colunas** (`render`, `sortRows` opcional), e migrar as listagens grandes **uma pagina por vez**, alinhando comportamento ao Portal (sort + pagina) sem duplicar markup.

## Criterios de Aceite do Epico

- [x] Componente `DataListTable` documentado em `docs/patterns/data-list-table.md`
- [ ] Todas as linhas da fila abaixo migradas ou justificadas (sub-tabela / excecao)
- [ ] Testes vitest do componente; paginas migradas sem regressao visual grave

## Historias Vinculadas

| ID | Titulo | Status | Prioridade |
|--------|-------------------------|----------|------------|
| US-027 | DataListTable + piloto Service Desk | Closed | Media |
| US-028 | Migracao Portal «Meus Chamados» para DataListTable | Closed | Media |

## Fila sugerida (ordem flexivel)

1. ~~Service Desk (`ServiceDeskDashboard`)~~ (piloto US-027)
2. ~~Portal — `PortalPage` (Meus Chamados)~~ (US-028)
3. Incidentes, Problemas, GMUD (Changes), Ativos, Knowledge (lista), Projetos, Tarefas (lista), Finance (tabs com tabela), Contratos, Fornecedores, Riscos (lista), Auditoria/Atividades, Organizacao (tabelas HTML — avaliar)

## Notas

- **`StandardGrid`** mantem-se para linhas planas + `columns[].key`.
- **`DataListShell`** sozinho continua valido quando so se precisa do cartao sem tabela padronizada.
