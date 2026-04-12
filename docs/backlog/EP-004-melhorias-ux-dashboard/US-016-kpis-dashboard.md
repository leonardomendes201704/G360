# US-016: Padronizar KPIs do Dashboard

| Campo              | Valor                                       |
|--------------------|---------------------------------------------|
| **ID**             | US-016                                      |
| **Epico**          | EP-004                                      |
| **Prioridade**     | Media                                       |
| **Story Points**   | 3                                           |
| **Sprint**         | A definir                                   |
| **Status**         | New                                         |
| **Responsavel**    |                                             |
| **Criado em**      | 2026-04-12                                  |
| **Depende de**     | US-006 (componente KpiCard)                 |

## User Story
**Como** usuario do sistema,
**Quero** que os KPIs do dashboard sigam o padrao visual definido (icone + valor grande + texto auxiliar),
**Para** ter leitura rapida e consistente dos indicadores principais.

## Criterios de Aceite
- [ ] Dado que os KPIs do dashboard usam KpiCard (EP-002), quando renderizados, entao seguem o padrao icone+valor+texto
- [ ] Dado que ha multiplos KPIs, quando exibidos lado a lado, entao o alinhamento interno e consistente
- [ ] Dado que o formato foi padronizado, quando comparo com KPIs de outras telas, entao sao identicos

## Tasks
| ID   | Descricao                                                     | Status | Estimativa |
|------|---------------------------------------------------------------|--------|------------|
| T-01 | Substituir KPIs atuais pelo componente KpiCard padrao         | New    | 2h         |
| T-02 | Ajustar alinhamento interno (icone, valor, texto)             | New    | 1h         |
| T-03 | Validar responsividade dos KPIs no dashboard                  | New    | 1h         |

## Notas Tecnicas
- Depende do KpiCard (US-006) estar pronto
- Arquivos: `FRONTEND/src/pages/dashboard/`

## Definicao de Pronto (DoD)
- [ ] KPIs do dashboard usando componente padrao
- [ ] Visual consistente com demais telas
- [ ] Responsividade validada
