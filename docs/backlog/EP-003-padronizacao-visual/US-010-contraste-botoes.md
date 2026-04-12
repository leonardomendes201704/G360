# US-010: Padronizar contraste de botoes em todo o sistema

| Campo              | Valor                                       |
|--------------------|---------------------------------------------|
| **ID**             | US-010                                      |
| **Epico**          | EP-003                                      |
| **Prioridade**     | Baixa                                       |
| **Story Points**   | 3                                           |
| **Sprint**         | A definir                                   |
| **Status**         | New                                         |
| **Responsavel**    |                                             |
| **Criado em**      | 2026-04-12                                  |

## User Story
**Como** usuario do sistema,
**Quero** que todos os botoes primarios tenham fonte branca com contraste adequado,
**Para** identificar facilmente as acoes principais em qualquer tela.

## Locais Identificados
- Tela de login: botao "Entrar na plataforma"
- Tela de tenants: botao "+ Novo Tenant"
- Modal de edicao do tenant: botao "Salvar"
- Demais botoes primarios do sistema

## Criterios de Aceite
- [ ] Dado que um botao usa cor primaria (contained/filled), quando renderizado, entao a fonte e branca
- [ ] Dado que a correcao foi aplicada, quando verifico em todas as telas identificadas, entao o contraste e consistente
- [ ] Dado que o tema do sistema e alterado, quando uso dark/light mode, entao o contraste se mantem adequado

## Tasks
| ID   | Descricao                                                       | Status | Estimativa |
|------|-----------------------------------------------------------------|--------|------------|
| T-01 | Ajustar tema MUI global para botoes contained (cor da fonte)    | New    | 1h         |
| T-02 | Verificar e corrigir overrides locais que sobrepoem o tema      | New    | 2h         |
| T-03 | Validar contraste em todas as telas identificadas               | New    | 1h         |

## Notas Tecnicas
- Correcao provavelmente no ThemeProvider/tema global MUI
- Verificar `FRONTEND/src/` para customizacao de tema (createTheme)
- Ajustar `palette.primary.contrastText` para `#fff`

## Definicao de Pronto (DoD)
- [ ] Tema global corrigido
- [ ] Validado visualmente em todas as telas identificadas
- [ ] Sem regressoes visuais em dark/light mode
