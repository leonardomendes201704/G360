# US-001: Corrigir comportamento de salvamento do cadastro de tenant

| Campo              | Valor                                       |
|--------------------|---------------------------------------------|
| **ID**             | US-001                                      |
| **Epico**          | EP-001                                      |
| **Prioridade**     | Alta                                        |
| **Story Points**   | 5                                           |
| **Sprint**         | A definir                                   |
| **Status**         | New                                         |
| **Responsavel**    |                                             |
| **Criado em**      | 2026-04-12                                  |

## User Story
**Como** administrador do sistema,
**Quero** que ao salvar um novo tenant o sistema exiba feedback visual claro de sucesso,
**Para** ter confianca de que os dados foram persistidos corretamente sem sensacao de perda de informacao.

## Problema Atual
Ao salvar um tenant novo, a tela "pisca e limpa os dados", gerando falsa sensacao de perda de informacao. O fluxo de persistencia, feedback visual e estado de loading/sucesso precisa ser revisado.

## Criterios de Aceite
- [ ] Dado que preenchi o formulario de novo tenant, quando clico em salvar, entao um overlay/spinner de loading e exibido
- [ ] Dado que o salvamento foi bem-sucedido, quando a operacao completa, entao uma mensagem de sucesso (toast/snackbar) e exibida
- [ ] Dado que o salvamento foi bem-sucedido, quando a operacao completa, entao o formulario nao pisca nem limpa os dados abruptamente
- [ ] Dado que houve erro no salvamento, quando a operacao falha, entao uma mensagem de erro clara e exibida mantendo os dados preenchidos

## Tasks
| ID   | Descricao                                                         | Status | Estimativa |
|------|-------------------------------------------------------------------|--------|------------|
| T-01 | Investigar causa do "pisca" no componente de cadastro de tenant   | New    | 2h         |
| T-02 | Implementar estado de loading durante requisicao de salvamento    | New    | 2h         |
| T-03 | Adicionar feedback visual de sucesso (toast/snackbar)             | New    | 1h         |
| T-04 | Garantir que formulario nao reseta estado durante transicao       | New    | 2h         |
| T-05 | Implementar tratamento de erro com mensagem amigavel              | New    | 1h         |
| T-06 | Testar fluxo completo (sucesso + erro + loading)                  | New    | 1h         |

## Notas Tecnicas
- Verificar se o problema esta no `useEffect` ou re-render apos `setState`
- Verificar se a navegacao (react-router) esta causando unmount/remount do componente
- Arquivos provaveis: `FRONTEND/src/pages/config/` (tela de tenants)

## Definicao de Pronto (DoD)
- [ ] Codigo implementado e revisado
- [ ] Testes unitarios passando
- [ ] Fluxo testado manualmente (criar tenant, editar tenant)
- [ ] Sem regressoes nos demais formularios do sistema
