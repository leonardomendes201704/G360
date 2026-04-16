# US-019: Fechar modal e feedback claro ao salvar Novo Tenant

| Campo              | Valor                          |
|--------------------|--------------------------------|
| **ID**             | US-019                         |
| **Epico**          | EP-005                         |
| **Prioridade**     | Media                          |
| **Story Points**   | 3                              |
| **Sprint**         | A definir                      |
| **Status**         | Resolved                       |
| **Responsavel**    |                                |
| **Criado em**      | 2026-04-15                     |

## User Story
**Como** administrador da plataforma,  
**Quero** que, apos salvar um novo tenant com sucesso, o modal feche e eu receba um feedback explicito (ex.: mensagem de sucesso),  
**Para** entender que a operacao concluiu e nao interpretar o formulario vazio como erro ou estado indefinido.

## Contexto / Problema
Ao salvar um **novo tenant**, o modal **nao fecha**; apenas **limpa os campos**. Isso gera confusao: o usuario nao tem certeza se o cadastro foi gravado ou se o formulario apenas resetou.

## Criterios de Aceite
- [x] Dado um cadastro de novo tenant **bem-sucedido**, quando a API retornar sucesso, entao o modal **deve fechar** (ou transicionar para estado de sucesso inequivoco, preferencialmente fechando o modal).
- [x] Dado o salvamento bem-sucedido, entao deve ser exibido **feedback positivo** claro (ex.: Snackbar/notificacao "Tenant criado com sucesso" ou equivalente no padrao do projeto).
- [x] Dado erro no salvamento, entao o modal **permanece aberto** com mensagem de erro visivel (comportamento esperado para correcao).

## Tasks
| ID   | Descricao | Status | Estimativa |
|------|-----------|--------|------------|
| T-01 | Ajustar fluxo pos-POST em `TenantModal` / `TenantAdminPage`: fechar modal + snackbar em sucesso | New | 2h |
| T-02 | Garantir que lista de tenants atualize apos criacao (se aplicavel) | New | 0.5h |
| T-03 | Teste manual: criar tenant, validar fechamento e mensagem | New | 0.5h |

## Notas Tecnicas
- Relacionado historicamente a BUG-001 / US-001 (tenant "piscando" / limpeza de campos); reforcar como melhoria de UX se o comportamento atual ainda limpar sem fechar.
- Arquivos provaveis: `FRONTEND/src/components/modals/TenantModal.jsx`, `FRONTEND/src/pages/admin/TenantAdminPage.jsx`.

## Definicao de Pronto (DoD)
- [x] Comportamento validado em ambiente de desenvolvimento
- [x] Sem regressao no fluxo de edicao de tenant existente (se compartilharem o mesmo modal)

## Resolucao
**Concluido em:** 2026-04-15  
**Solucao:** Em `handleCreate`, apos `POST` bem-sucedido: `enqueueSnackbar` de sucesso, **`setCreateOpen(false)` imediato** (antes de `fetchTenants`/`pool-stats`), para o modal nao permanecer aberto durante refresh. `handleSubmit` passou a usar **`await handleCreate`** / **`await handleUpdate`**. Fluxo de edicao aguarda atualizacao do tenant antes do PUT do admin. `TenantModal.jsx`: removido `setTimeout` de 600ms — **`onClose()`** apos `onSuccess()`.  
**Arquivos alterados:**  
- `FRONTEND/src/pages/admin/TenantAdminPage.jsx`  
- `FRONTEND/src/components/modals/TenantModal.jsx`
