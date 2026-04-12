# US-015: Ajustar score e pontuacao do Dashboard

| Campo              | Valor                                       |
|--------------------|---------------------------------------------|
| **ID**             | US-015                                      |
| **Epico**          | EP-004                                      |
| **Prioridade**     | Media                                       |
| **Story Points**   | 3                                           |
| **Sprint**         | A definir                                   |
| **Status**         | New                                         |
| **Responsavel**    |                                             |
| **Criado em**      | 2026-04-12                                  |

## User Story
**Como** usuario do sistema,
**Quero** que o score e pontuacao do dashboard sejam exibidos de forma clara e sem ambiguidade,
**Para** entender minha performance e a do time sem interpretar erroneamente os dados.

## Problema Atual
A posicao do score precisa de ajuste e a exibicao quando zerada gera leitura fraca ou interpretacao ambigua. Falta botao de ajuda explicando os elementos do dashboard.

## Criterios de Aceite
- [ ] Dado que meu score e zero, quando visualizo o dashboard, entao o valor zero e exibido de forma clara (nao vazio/invisivel)
- [ ] Dado que o score existe, quando o posicionamento e ajustado, entao a leitura e intuitiva
- [ ] Dado que ha um botao de ajuda, quando clico nele, entao um tooltip/modal explica os elementos do dashboard

## Tasks
| ID   | Descricao                                                    | Status | Estimativa |
|------|--------------------------------------------------------------|--------|------------|
| T-01 | Ajustar posicao do componente de score no layout             | New    | 1h         |
| T-02 | Tratar exibicao de score zero (valor visivel, cor neutra)    | New    | 1h         |
| T-03 | Adicionar botao de ajuda (?) com tooltip explicativo         | New    | 2h         |
| T-04 | Validar visual com diferentes valores de score               | New    | 1h         |

## Notas Tecnicas
- Usar MUI Tooltip ou Popover para ajuda contextual
- Score zero: usar cor neutra (cinza) ao inves de ocultar

## Definicao de Pronto (DoD)
- [ ] Score exibido corretamente em todos os cenarios (zero, baixo, alto)
- [ ] Botao de ajuda funcional
- [ ] Validado visualmente
