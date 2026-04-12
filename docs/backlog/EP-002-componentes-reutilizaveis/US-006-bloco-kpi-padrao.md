# US-006: Criar componente de Bloco de KPI padrao

| Campo              | Valor                                       |
|--------------------|---------------------------------------------|
| **ID**             | US-006                                      |
| **Epico**          | EP-002                                      |
| **Prioridade**     | Alta                                        |
| **Story Points**   | 5                                           |
| **Sprint**         | A definir                                   |
| **Status**         | New                                         |
| **Responsavel**    |                                             |
| **Criado em**      | 2026-04-12                                  |

## User Story
**Como** usuario do sistema,
**Quero** que os indicadores (KPIs) tenham visual padronizado em todas as telas,
**Para** identificar rapidamente metricas importantes com leitura consistente.

## Padrao Visual Definido
- Icone em destaque (lado esquerdo ou topo)
- Valor principal em fonte grande e cor primaria
- Texto descritivo menor abaixo do valor
- Layout responsivo (adaptar para mobile)
- Altura compacta para nao ocupar espaco excessivo

## Criterios de Aceite
- [ ] Dado que uso o componente, quando configuro icone/valor/label, entao o KPI renderiza no padrao definido
- [ ] Dado que a tela e visualizada em mobile, quando o viewport e reduzido, entao o KPI se adapta responsivamente
- [ ] Dado que o valor e zero, quando o KPI e exibido, entao a leitura e clara sem ambiguidade
- [ ] Dado que ha multiplos KPIs, quando exibidos lado a lado, entao o alinhamento e consistente

## Tasks
| ID   | Descricao                                                  | Status | Estimativa |
|------|------------------------------------------------------------|--------|------------|
| T-01 | Definir interface/props do componente (icon, value, label, color) | New | 1h     |
| T-02 | Implementar componente KpiCard com MUI                     | New    | 2h         |
| T-03 | Implementar variantes (com tendencia, com tooltip de ajuda)| New    | 2h         |
| T-04 | Implementar responsividade                                 | New    | 1h         |
| T-05 | Criar testes unitarios                                     | New    | 1h         |
| T-06 | Aplicar em 1 tela piloto (ex: Dashboard ou Service Desk)   | New    | 2h         |

## Notas Tecnicas
- Criar em `FRONTEND/src/components/shared/KpiCard/`
- Utilizar MUI Card como base com customizacao de estilos
- Props: icon, value, label, color, trend (opcional), tooltip (opcional)
- Telas que usarao: Dashboard, Aprovacoes, Service Desk, Incidentes, GMUD

## Definicao de Pronto (DoD)
- [ ] Componente criado com props documentadas
- [ ] Testes unitarios passando
- [ ] Aplicado em pelo menos 1 tela piloto
- [ ] Visual validado em desktop e mobile
