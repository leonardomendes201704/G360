# US-007: Criar componente Off-canvas de filtros

| Campo              | Valor                                       |
|--------------------|---------------------------------------------|
| **ID**             | US-007                                      |
| **Epico**          | EP-002                                      |
| **Prioridade**     | Media                                       |
| **Story Points**   | 5                                           |
| **Sprint**         | A definir                                   |
| **Status**         | New                                         |
| **Responsavel**    |                                             |
| **Criado em**      | 2026-04-12                                  |

## User Story
**Como** usuario do sistema,
**Quero** que os filtros das listagens abram em um painel lateral (off-canvas),
**Para** ter mais espaco util na tela principal e aplicar filtros sem perder contexto.

## Criterios de Aceite
- [ ] Dado que clico no botao de filtros, quando o off-canvas abre, entao os filtros sao exibidos em painel lateral
- [ ] Dado que aplico filtros, quando clico em "Aplicar", entao a listagem e atualizada e o painel fecha
- [ ] Dado que quero limpar filtros, quando clico em "Limpar", entao todos os filtros sao resetados
- [ ] Dado que fechei o off-canvas, quando reabro, entao os filtros aplicados sao preservados

## Tasks
| ID   | Descricao                                                     | Status | Estimativa |
|------|---------------------------------------------------------------|--------|------------|
| T-01 | Implementar componente base com MUI Drawer                    | New    | 2h         |
| T-02 | Implementar renderizacao dinamica de campos de filtro          | New    | 3h         |
| T-03 | Implementar botoes Aplicar e Limpar                           | New    | 1h         |
| T-04 | Implementar persistencia de estado dos filtros                 | New    | 2h         |
| T-05 | Criar testes unitarios                                        | New    | 1h         |
| T-06 | Aplicar em 1 tela piloto (ex: Incidentes ou GMUD)             | New    | 2h         |

## Notas Tecnicas
- Criar em `FRONTEND/src/components/shared/FilterDrawer/`
- Base: MUI Drawer (anchor="right")
- Props: filters (config array), onApply, onClear, open, onClose
- Telas prioritarias: Incidentes, GMUD

## Definicao de Pronto (DoD)
- [ ] Componente criado com props documentadas
- [ ] Testes unitarios passando
- [ ] Aplicado em pelo menos 1 tela piloto
