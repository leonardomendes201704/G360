# US-001: Corrigir comportamento de salvamento do cadastro de tenant

| Campo              | Valor                                       |
|--------------------|---------------------------------------------|
| **ID**             | US-001                                      |
| **Epico**          | EP-001                                      |
| **Prioridade**     | Alta                                        |
| **Story Points**   | 5                                           |
| **Sprint**         | A definir                                   |
| **Status**         | Resolved                                    |
| **Responsavel**    | Claude Agent                                |
| **Criado em**      | 2026-04-12                                  |
| **Concluido em**   | 2026-04-12                                  |

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
| T-01 | Investigar causa do "pisca" no componente de cadastro de tenant   | Done   | 2h         |
| T-02 | Implementar estado de loading durante requisicao de salvamento    | Done   | 2h         |
| T-03 | Adicionar feedback visual de sucesso (toast/snackbar)             | Done   | 1h         |
| T-04 | Garantir que formulario nao reseta estado durante transicao       | Done   | 2h         |
| T-05 | Implementar tratamento de erro com mensagem amigavel              | Done   | 1h         |
| T-06 | Testar fluxo completo (sucesso + erro + loading)                  | Done   | 1h         |

## Notas Tecnicas
- Verificar se o problema esta no `useEffect` ou re-render apos `setState`
- Verificar se a navegacao (react-router) esta causando unmount/remount do componente
- Arquivos provaveis: `FRONTEND/src/pages/config/` (tela de tenants)

## Definicao de Pronto (DoD)
- [x] Codigo implementado e revisado
- [x] Build passando sem erros (vite build)
- [x] Fluxo testado (criar tenant, editar tenant)
- [x] Sem regressoes nos demais formularios do sistema

## Resolucao
**Concluido em:** 2026-04-12

**Causa raiz:** Dois problemas combinados geravam o efeito de "pisca":
1. O modal chamava `onSuccess()` e `onClose()` sequencialmente sem aguardar o refresh dos dados. O modal fechava instantaneamente enquanto a lista ainda carregava.
2. O `useEffect` do formulario tinha `open` nas dependencias, causando reset dos campos toda vez que o estado do modal mudava — inclusive durante a animacao de fechamento, o que fazia os campos ficarem visivelmente vazios por um instante.
3. Na `TenantAdminPage.jsx`, `setCreateOpen(false)` era chamado ANTES de `fetchTenants()` completar, causando o mesmo efeito.

**Solucao aplicada:**
- Adicionado estado `saving` com `CircularProgress` no botao durante a requisicao
- Adicionado estado `success` com `Alert` de sucesso antes de fechar o modal
- Modal so fecha apos `onSuccess()` completar (com `await`) + delay de 600ms para o usuario ver o feedback
- `useEffect` agora retorna imediatamente se `!open`, evitando reset durante fechamento
- `reset()` chamado com valores explicitos ao inves de sequencia de `setValue`
- Dialog bloqueia fechamento (`onClose={undefined}`) enquanto `saving=true`
- Na `TenantAdminPage.jsx`, `setCreateOpen(false)` e `setEditTenant(null)` movidos para DEPOIS do `await fetchTenants()`

**Arquivos alterados:**
- `FRONTEND/src/components/modals/TenantModal.jsx` — Loading state, feedback de sucesso, correcao do useEffect, botao com estados
- `FRONTEND/src/pages/admin/TenantAdminPage.jsx` — Reordenado close apos await fetch em handleCreate e handleUpdate

**Decisoes:** Optou-se por um delay de 600ms apos sucesso para que o usuario veja o Alert antes do modal fechar, equilibrando feedback visual com agilidade.

**Pontos de atencao:** Verificar se outros modais do sistema (GMUD, Incidentes, etc.) possuem o mesmo padrao problematico de fechar antes do fetch.
