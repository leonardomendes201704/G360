# US-002: Corrigir impossibilidade de abrir chamado no Portal do Suporte

| Campo              | Valor                                       |
|--------------------|---------------------------------------------|
| **ID**             | US-002                                      |
| **Epico**          | EP-001                                      |
| **Prioridade**     | Alta                                        |
| **Story Points**   | 8                                           |
| **Sprint**         | A definir                                   |
| **Status**         | New                                         |
| **Responsavel**    |                                             |
| **Criado em**      | 2026-04-12                                  |

## User Story
**Como** usuario do portal de suporte,
**Quero** conseguir abrir um novo chamado selecionando categoria e servico,
**Para** poder registrar minha solicitacao ou incidente e receber atendimento.

## Problema Atual
Ao tentar adicionar um novo chamado, o sistema apresenta a mensagem: "Nenhuma categoria com servicos disponivel no momento." E necessario investigar se e falha de carregamento, configuracao ou regra de negocio invalida.

## Criterios de Aceite
- [ ] Dado que existem categorias cadastradas no catalogo de servicos, quando abro novo chamado, entao as categorias sao listadas corretamente
- [ ] Dado que seleciono uma categoria, quando a categoria possui servicos, entao os servicos sao exibidos para selecao
- [ ] Dado que nao existem categorias/servicos, quando abro novo chamado, entao uma mensagem orientativa e exibida com instrucao para o administrador
- [ ] Dado que o tenant possui catalogo configurado, quando qualquer usuario acessa o portal, entao o fluxo de abertura funciona sem erros

## Tasks
| ID   | Descricao                                                              | Status | Estimativa |
|------|------------------------------------------------------------------------|--------|------------|
| T-01 | Investigar endpoint de listagem de categorias/servicos do catalogo     | New    | 2h         |
| T-02 | Verificar se o seed do catalogo esta populando dados do tenant correto | New    | 2h         |
| T-03 | Verificar filtro de tenant na query de categorias no frontend          | New    | 1h         |
| T-04 | Corrigir logica de carregamento de categorias com servicos ativos      | New    | 3h         |
| T-05 | Adicionar tratamento de erro e mensagem orientativa quando vazio       | New    | 1h         |
| T-06 | Testar fluxo completo de abertura de chamado apos correcao             | New    | 2h         |

## Notas Tecnicas
- Verificar endpoint: `GET /api/v1/service-catalog` e filtros de tenant
- Verificar se `seed-catalog.js` popula o tenant correto
- Pode ser problema de resolucao de tenant no middleware
- Arquivos provaveis: `FRONTEND/src/pages/helpdesk/`, `BACKEND/src/services/service-catalog.service.js`

## Definicao de Pronto (DoD)
- [ ] Codigo implementado e revisado
- [ ] Testes de integracao passando (API de catalogo)
- [ ] Fluxo testado manualmente (abrir chamado com categoria e servico)
- [ ] Validado com pelo menos 2 tenants diferentes
