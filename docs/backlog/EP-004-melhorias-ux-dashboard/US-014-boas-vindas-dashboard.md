# US-014: Melhorar secao de boas-vindas do Dashboard

| Campo              | Valor                                       |
|--------------------|---------------------------------------------|
| **ID**             | US-014                                      |
| **Epico**          | EP-004                                      |
| **Prioridade**     | Media                                       |
| **Story Points**   | 3                                           |
| **Sprint**         | A definir                                   |
| **Status**         | New                                         |
| **Responsavel**    |                                             |
| **Criado em**      | 2026-04-12                                  |

## User Story
**Como** usuario do sistema,
**Quero** que a secao de boas-vindas do dashboard seja mais objetiva e organizada,
**Para** acessar rapidamente as funcionalidades mais usadas sem desperdicio de espaco.

## Problema Atual
A secao de boas-vindas ocupa muito espaco, os botoes de acesso rapido nao tem disposicao otima, o contraste visual e insuficiente e o botao de configuracoes nao esta posicionado adequadamente.

## Criterios de Aceite
- [ ] Dado que acesso o dashboard, quando a secao de boas-vindas carrega, entao a altura e compacta e objetiva
- [ ] Dado que os botoes de acesso rapido existem, quando os visualizo, entao a disposicao e hierarquia sao claras
- [ ] Dado que o botao de configuracoes existe, quando o procuro, entao esta posicionado a direita absoluta

## Tasks
| ID   | Descricao                                                      | Status | Estimativa |
|------|----------------------------------------------------------------|--------|------------|
| T-01 | Reduzir altura da secao de boas-vindas                         | New    | 1h         |
| T-02 | Reorganizar botoes de acesso rapido com melhor disposicao      | New    | 2h         |
| T-03 | Aumentar contraste visual dos elementos                        | New    | 1h         |
| T-04 | Reposicionar botao de configuracoes para direita absoluta      | New    | 30min      |
| T-05 | Validar visual em diferentes resolucoes                        | New    | 1h         |

## Notas Tecnicas
- Arquivos provaveis: `FRONTEND/src/pages/dashboard/`
- Considerar grid layout para botoes de acesso rapido

## Definicao de Pronto (DoD)
- [ ] Layout atualizado e validado visualmente
- [ ] Responsividade testada
- [ ] Sem regressoes no dashboard
