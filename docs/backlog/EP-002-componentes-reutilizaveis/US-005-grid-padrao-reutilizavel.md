# US-005: Criar componente de Grid padrao reutilizavel

| Campo              | Valor                                       |
|--------------------|---------------------------------------------|
| **ID**             | US-005                                      |
| **Epico**          | EP-002                                      |
| **Prioridade**     | Alta                                        |
| **Story Points**   | 13                                          |
| **Sprint**         | A definir                                   |
| **Status**         | New                                         |
| **Responsavel**    |                                             |
| **Criado em**      | 2026-04-12                                  |

## User Story
**Como** desenvolvedor do sistema,
**Quero** um componente de grid reutilizavel com funcionalidades padronizadas,
**Para** garantir consistencia visual e funcional em todas as listagens do sistema, reduzindo retrabalho.

## Funcionalidades Requeridas
- Campo de pesquisa integrado
- Filtros configuráveis
- Ordenacao por coluna (asc/desc)
- Paginacao com selecao de quantidade por pagina (10, 25, 50, 100)
- Botoes de acao por linha (visualizar, editar, excluir) com espacamento adequado
- Exportacao (CSV/Excel)
- Versao para impressao
- Responsividade

## Criterios de Aceite
- [ ] Dado que uso o componente em uma tela, quando configuro colunas e datasource, entao a grid renderiza com todas as funcionalidades
- [ ] Dado que digito no campo de pesquisa, quando ha resultados, entao a grid filtra os dados em tempo real
- [ ] Dado que clico no cabecalho de uma coluna, quando a coluna e ordenavel, entao os dados sao reordenados
- [ ] Dado que ha mais registros que o limite por pagina, quando navego entre paginas, entao a paginacao funciona corretamente
- [ ] Dado que clico em exportar, quando ha dados, entao um arquivo CSV/Excel e gerado
- [ ] Dado que os botoes de acao estao na linha, quando visualizo a grid, entao os botoes tem espacamento adequado sem risco de clique acidental

## Tasks
| ID   | Descricao                                                           | Status | Estimativa |
|------|---------------------------------------------------------------------|--------|------------|
| T-01 | Definir interface/props do componente (colunas, acoes, config)      | New    | 2h         |
| T-02 | Implementar estrutura base com MUI DataGrid                         | New    | 4h         |
| T-03 | Implementar campo de pesquisa com debounce                          | New    | 2h         |
| T-04 | Implementar ordenacao por coluna                                    | New    | 1h         |
| T-05 | Implementar paginacao com seletor de registros por pagina           | New    | 2h         |
| T-06 | Implementar botoes de acao com espacamento e hierarquia visual      | New    | 2h         |
| T-07 | Implementar exportacao CSV/Excel                                    | New    | 3h         |
| T-08 | Implementar versao para impressao (CSS print)                       | New    | 2h         |
| T-09 | Criar testes unitarios do componente                                | New    | 3h         |
| T-10 | Aplicar componente em 1 tela piloto (ex: listagem de tenants)       | New    | 2h         |

## Notas Tecnicas
- Base: `@mui/x-data-grid` (ja instalado no projeto)
- Criar em `FRONTEND/src/components/shared/StandardGrid/`
- Props: columns, rows, onAction, searchable, exportable, printable, pageSize
- Considerar server-side pagination para grandes volumes

## Definicao de Pronto (DoD)
- [ ] Componente criado com props documentadas
- [ ] Testes unitarios passando (Vitest)
- [ ] Aplicado em pelo menos 1 tela piloto
- [ ] Sem regressoes visuais
