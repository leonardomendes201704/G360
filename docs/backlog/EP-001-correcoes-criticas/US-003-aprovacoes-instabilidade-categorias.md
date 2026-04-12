# US-003: Corrigir instabilidade ao navegar entre categorias em Aprovacoes

| Campo              | Valor                                       |
|--------------------|---------------------------------------------|
| **ID**             | US-003                                      |
| **Epico**          | EP-001                                      |
| **Prioridade**     | Alta                                        |
| **Story Points**   | 5                                           |
| **Sprint**         | A definir                                   |
| **Status**         | Resolved                                    |
| **Responsavel**    | Claude Agent                                |
| **Criado em**      | 2026-04-12                                  |
| **Concluido em**   | 2026-04-12                                  |

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
| T-01 | Investigar causa do re-render e deslocamento ao trocar categoria   | Done   | 2h         |
| T-02 | Implementar overlay de loading (ao inves de desmontar a lista)     | Done   | 2h         |
| T-03 | Manter altura minima do container para evitar layout shift         | Done   | 1h         |
| T-04 | Preservar posicao de scroll durante troca de categoria             | Done   | 1h         |
| T-05 | Testar navegacao entre todas as categorias de aprovacao            | Done   | 1h         |

## Notas Tecnicas
- Provavelmente causado por `setState` que desmonta/remonta a lista de itens
- Solucao: usar skeleton loader com altura fixa enquanto dados carregam
- Arquivos provaveis: `FRONTEND/src/pages/approvals/`

## Definicao de Pronto (DoD)
- [x] Codigo implementado e revisado
- [x] Transicao entre categorias testada sem flicker visual
- [x] Build passando sem erros
- [x] Sem regressoes no fluxo de aprovacao

## Resolucao
**Concluido em:** 2026-04-12

**Causa raiz:** Ao trocar de categoria, `fetchData()` chamava `setLoading(true)` que desmontava a lista de items e mostrava apenas um `CircularProgress` centralizado. Isso reduzia drasticamente a altura do conteudo, causando layout shift (o browser ajustava o scroll automaticamente). O conteudo subia empurrando o header para fora da viewport.

**Solucao aplicada:**
- Substituido o ternario `loading ? spinner : content` por um **overlay absoluto** com `CircularProgress` sobre o conteudo existente — a lista nunca desmonta durante troca de aba
- Adicionado estado `switching` separado de `loading` para diferenciar carregamento inicial de troca de aba
- Container de items com `minHeight: 300px` para manter tamanho constante
- Preservacao de scroll position via `window.scrollTo(0, scrollY)` apos fetch
- `preventDefault()` nos handlers de click das tabs e summary cards

**Arquivos alterados:**
- `FRONTEND/src/pages/approvals/MyApprovalsPage.jsx` — Overlay loading, estado switching, minHeight, scroll preservation

**Decisoes:** A lista permanece renderizada (com overlay semi-transparente por cima) durante a troca de aba, evitando qualquer desmontagem que cause layout shift. O polimento final (scroll residual do breadcrumb) sera totalmente resolvido quando os KPIs forem padronizados (US-006/EP-002), reduzindo a altura total da pagina.

**Pontos de atencao:** Outras telas com abas/filtros que fazem fetch ao trocar (Service Desk, Incidentes) podem ter o mesmo padrao. Considerar aplicar overlay loading como componente reutilizavel (US-008).
