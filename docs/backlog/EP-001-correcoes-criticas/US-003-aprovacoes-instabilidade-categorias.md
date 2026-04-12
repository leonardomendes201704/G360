# US-003: Corrigir instabilidade ao navegar entre categorias em Aprovacoes

| Campo              | Valor                                       |
|--------------------|---------------------------------------------|
| **ID**             | US-003                                      |
| **Epico**          | EP-001                                      |
| **Prioridade**     | Alta                                        |
| **Story Points**   | 5                                           |
| **Sprint**         | A definir                                   |
| **Status**         | New                                         |
| **Responsavel**    |                                             |
| **Criado em**      | 2026-04-12                                  |

## User Story
**Como** aprovador no sistema,
**Quero** navegar entre categorias de aprovacao de forma fluida e sem instabilidade visual,
**Para** revisar e aprovar itens pendentes com confianca e agilidade.

## Problema Atual
Ao clicar nas categorias de aprovacoes, a interface pisca e se move, gerando sensacao de instabilidade. A atualizacao de estado precisa ser revisada com overlay de loading para suavizar a transicao.

## Criterios de Aceite
- [ ] Dado que estou na tela de aprovacoes, quando troco de categoria, entao a transicao ocorre sem "pisca" ou deslocamento de tela
- [ ] Dado que os dados estao carregando, quando troco de categoria, entao um indicador de loading sutil e exibido
- [ ] Dado que os dados carregaram, quando a transicao completa, entao o scroll da pagina permanece na posicao esperada

## Tasks
| ID   | Descricao                                                          | Status | Estimativa |
|------|--------------------------------------------------------------------|--------|------------|
| T-01 | Investigar causa do re-render e deslocamento ao trocar categoria   | New    | 2h         |
| T-02 | Implementar skeleton/placeholder durante carregamento de dados     | New    | 2h         |
| T-03 | Manter altura minima do container para evitar layout shift         | New    | 1h         |
| T-04 | Preservar posicao de scroll durante troca de categoria             | New    | 1h         |
| T-05 | Testar navegacao entre todas as categorias de aprovacao            | New    | 1h         |

## Notas Tecnicas
- Provavelmente causado por `setState` que desmonta/remonta a lista de itens
- Solucao: usar skeleton loader com altura fixa enquanto dados carregam
- Arquivos provaveis: `FRONTEND/src/pages/approvals/`

## Definicao de Pronto (DoD)
- [ ] Codigo implementado e revisado
- [ ] Transicao entre categorias testada sem flicker visual
- [ ] Sem regressoes no fluxo de aprovacao
