# US-011: Revisar visual do submenu do usuario

| Campo              | Valor                                       |
|--------------------|---------------------------------------------|
| **ID**             | US-011                                      |
| **Epico**          | EP-003                                      |
| **Prioridade**     | Media                                       |
| **Story Points**   | 3                                           |
| **Sprint**         | A definir                                   |
| **Status**         | New                                         |
| **Responsavel**    |                                             |
| **Criado em**      | 2026-04-12                                  |

## User Story
**Como** usuario do sistema,
**Quero** que o submenu do usuario (dropdown do avatar/nome) tenha visual alinhado ao design system,
**Para** ter uma experiencia consistente ao acessar perfil, configuracoes e logout.

## Problema Atual
O visual do submenu esta destoando do restante do layout, com arredondamento excessivo das bordas e estilo diferente do design system geral.

## Criterios de Aceite
- [ ] Dado que clico no avatar/nome, quando o submenu abre, entao o visual segue o design system (bordas, sombra, espacamento)
- [ ] Dado que o submenu esta aberto, quando visualizo os itens, entao a hierarquia visual e clara
- [ ] Dado que o arredondamento foi ajustado, quando comparo com outros dropdowns do sistema, entao o estilo e consistente

## Tasks
| ID   | Descricao                                                     | Status | Estimativa |
|------|---------------------------------------------------------------|--------|------------|
| T-01 | Ajustar border-radius do componente de submenu do usuario     | New    | 1h         |
| T-02 | Alinhar estilo (sombra, padding, fonte) com design system     | New    | 1h         |
| T-03 | Validar visual em desktop e mobile                            | New    | 1h         |

## Notas Tecnicas
- Componente provavelmente em `FRONTEND/src/components/` (header/navbar)
- Utilizar MUI Menu/Popover com estilos do tema global

## Definicao de Pronto (DoD)
- [ ] Visual atualizado e consistente com design system
- [ ] Validado em desktop e mobile
