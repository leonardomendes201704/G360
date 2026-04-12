# Registro de Bugs - G360

> Bugs identificados durante auditoria de UX/UI.
> Formato compativel com Azure DevOps Work Items.

---

## BUG-001: Cadastro de tenant pisca e limpa dados ao salvar

| Campo            | Valor                                          |
|------------------|------------------------------------------------|
| **ID**           | BUG-001                                        |
| **Severidade**   | Alta                                           |
| **Status**       | Resolved                                       |
| **Modulo**       | Configuracao / Tenants                         |
| **Historia**     | US-001                                         |
| **Encontrado em**| 2026-04-12                                     |
| **Resolvido em** | 2026-04-12                                     |

**Passos para Reproduzir:**
1. Acessar Configuracao > Tenants
2. Clicar em "+ Novo Tenant"
3. Preencher todos os campos
4. Clicar em "Salvar"

**Resultado Esperado:** Feedback de sucesso e permanencia na tela com dados salvos.

**Resultado Atual:** Tela pisca e limpa os dados, gerando falsa sensacao de perda de informacao.

**Correcao Aplicada:** Adicionado loading state, feedback de sucesso, e reordenado fluxo para fechar modal somente apos dados serem atualizados. Corrigido useEffect que resetava campos durante animacao de fechamento. Arquivos: `TenantModal.jsx`, `TenantAdminPage.jsx`.

---

## BUG-002: Portal do Suporte nao permite abrir novo chamado

| Campo            | Valor                                          |
|------------------|------------------------------------------------|
| **ID**           | BUG-002                                        |
| **Severidade**   | Alta                                           |
| **Status**       | Resolved                                       |
| **Modulo**       | Help Desk / Portal do Suporte                  |
| **Historia**     | US-002                                         |
| **Encontrado em**| 2026-04-12                                     |
| **Resolvido em** | 2026-04-12                                     |

**Passos para Reproduzir:**
1. Acessar Portal do Suporte
2. Clicar em "Novo Chamado"
3. Observar mensagem de erro

**Resultado Esperado:** Categorias e servicos disponiveis para selecao.

**Resultado Atual:** Mensagem "Nenhuma categoria com servicos disponivel no momento" exibida mesmo com catalogo cadastrado.

**Correcao Aplicada:** Causa raiz: tabelas `ServiceCatalog` e `TicketCategory` nao existiam no schema `tenant_devcraft` (migrations nunca executadas). Solucao: executado `npm run deploy:tenants` que roda migrations + seed do catalogo ITIL em todos os tenants. Resultado: 24 servicos e 9 categorias criados.

---

## BUG-003: Aprovacoes pisca e desloca tela ao trocar categoria

| Campo            | Valor                                          |
|------------------|------------------------------------------------|
| **ID**           | BUG-003                                        |
| **Severidade**   | Alta                                           |
| **Status**       | Resolved                                       |
| **Modulo**       | Aprovacoes                                     |
| **Historia**     | US-003                                         |
| **Encontrado em**| 2026-04-12                                     |
| **Resolvido em** | 2026-04-12                                     |

**Passos para Reproduzir:**
1. Acessar tela de Aprovacoes
2. Clicar em diferentes categorias de aprovacao
3. Observar comportamento visual

**Resultado Esperado:** Transicao suave entre categorias com loading indicator.

**Resultado Atual:** Interface pisca e se move (layout shift), gerando sensacao de instabilidade.

**Correcao Aplicada:** Substituido loading que desmontava a lista por overlay absoluto com CircularProgress. Adicionado estado `switching`, minHeight no container e preservacao de scroll position. Arquivo: `MyApprovalsPage.jsx`.

---

## BUG-004: Erro ao clicar em "Nova GMUD"

| Campo            | Valor                                          |
|------------------|------------------------------------------------|
| **ID**           | BUG-004                                        |
| **Severidade**   | Alta                                           |
| **Status**       | New                                            |
| **Modulo**       | GMUD / Gestao de Mudancas                      |
| **Historia**     | US-004                                         |
| **Encontrado em**| 2026-04-12                                     |
| **Resolvido em** |                                                |

**Passos para Reproduzir:**
1. Acessar modulo GMUD
2. Clicar em "Nova GMUD"
3. Observar erro

**Resultado Esperado:** Formulario de criacao de GMUD aberto e funcional.

**Resultado Atual:** Sistema apresenta erro e o fluxo fica indisponivel.

**Correcao Aplicada:**

---

*Ultima atualizacao: 2026-04-12*
