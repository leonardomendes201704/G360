# US-009: Criar componente Modal padrao

| Campo              | Valor                                       |
|--------------------|---------------------------------------------|
| **ID**             | US-009                                      |
| **Epico**          | EP-002                                      |
| **Prioridade**     | Media                                       |
| **Story Points**   | 5                                           |
| **Sprint**         | A definir                                   |
| **Status**         | New                                         |
| **Responsavel**    |                                             |
| **Criado em**      | 2026-04-12                                  |

## User Story
**Como** usuario do sistema,
**Quero** que todos os modais/formularios tenham visual e comportamento padronizado,
**Para** ter uma experiencia previsivel e consistente em qualquer tela.

## Padrao Visual Definido
- Raio de borda padronizado (nao excessivamente arredondado)
- Cabecalho consistente com titulo e botao fechar
- Area de conteudo com suporte a formularios e anexos
- Rodape com acoes previsiveis (Cancelar / Salvar)

## Criterios de Aceite
- [ ] Dado que uso o componente, quando configuro titulo/conteudo/acoes, entao o modal renderiza no padrao definido
- [ ] Dado que o modal possui formulario, quando ha validacao, entao os erros sao exibidos inline
- [ ] Dado que o modal suporta anexos, quando adiciono arquivo, entao o preview e exibido na area de anexos
- [ ] Dado que clico fora do modal ou no X, quando o modal fecha, entao nenhum dado e perdido sem confirmacao

## Tasks
| ID   | Descricao                                                      | Status | Estimativa |
|------|----------------------------------------------------------------|--------|------------|
| T-01 | Implementar componente StandardModal com MUI Dialog             | New    | 2h         |
| T-02 | Implementar cabecalho padrao (titulo, subtitulo, fechar)        | New    | 1h         |
| T-03 | Implementar rodape padrao com acoes configuráveis               | New    | 1h         |
| T-04 | Implementar area de anexos (upload, preview, remocao)           | New    | 3h         |
| T-05 | Implementar confirmacao de descarte ao fechar com dados sujos   | New    | 2h         |
| T-06 | Criar testes unitarios                                          | New    | 1h         |
| T-07 | Aplicar em 1 tela piloto (ex: modal de Problemas ITIL)         | New    | 2h         |

## Notas Tecnicas
- Criar em `FRONTEND/src/components/shared/StandardModal/`
- Base: MUI Dialog com customizacao de estilos
- Props: title, subtitle, children, actions[], onClose, maxWidth, attachments (opcional)
- Corrigir modais com cantos excessivamente arredondados (ex: Declarar Problema)

## Definicao de Pronto (DoD)
- [ ] Componente criado com props documentadas
- [ ] Testes unitarios passando
- [ ] Aplicado em pelo menos 1 tela piloto
- [ ] Validado que modais existentes nao regrediram
