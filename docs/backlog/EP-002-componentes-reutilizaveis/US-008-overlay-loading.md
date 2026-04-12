# US-008: Criar componente Overlay de loading

| Campo              | Valor                                       |
|--------------------|---------------------------------------------|
| **ID**             | US-008                                      |
| **Epico**          | EP-002                                      |
| **Prioridade**     | Media                                       |
| **Story Points**   | 3                                           |
| **Sprint**         | A definir                                   |
| **Status**         | New                                         |
| **Responsavel**    |                                             |
| **Criado em**      | 2026-04-12                                  |

## User Story
**Como** usuario do sistema,
**Quero** que ao trocar abas, categorias ou salvar dados haja um feedback visual de carregamento,
**Para** nao ter a sensacao de "pisca" ou perda de estado durante transicoes.

## Criterios de Aceite
- [ ] Dado que uma operacao assincrona inicia, quando o loading e ativado, entao um overlay sutil e exibido sobre a area de conteudo
- [ ] Dado que a operacao completa, quando o loading e desativado, entao o overlay some suavemente
- [ ] Dado que o overlay esta ativo, quando o usuario tenta interagir, entao cliques sao bloqueados na area coberta

## Tasks
| ID   | Descricao                                               | Status | Estimativa |
|------|---------------------------------------------------------|--------|------------|
| T-01 | Implementar componente LoadingOverlay com animacao suave | New    | 2h         |
| T-02 | Implementar variantes (fullscreen, inline, skeleton)     | New    | 2h         |
| T-03 | Criar hook useLoading para facilitar uso                 | New    | 1h         |
| T-04 | Criar testes unitarios                                   | New    | 1h         |
| T-05 | Aplicar em 1 tela piloto (ex: Aprovacoes)                | New    | 1h         |

## Notas Tecnicas
- Criar em `FRONTEND/src/components/shared/LoadingOverlay/`
- Utilizar MUI Backdrop + CircularProgress como base
- Variante skeleton: usar MUI Skeleton para placeholders de conteudo
- Resolver problema de "pisca" das telas de Aprovacoes e Tenant (EP-001)

## Definicao de Pronto (DoD)
- [ ] Componente criado com props documentadas
- [ ] Testes unitarios passando
- [ ] Aplicado em pelo menos 1 tela piloto
