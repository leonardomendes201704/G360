# US-004: Corrigir erro ao criar nova GMUD

| Campo              | Valor                                       |
|--------------------|---------------------------------------------|
| **ID**             | US-004                                      |
| **Epico**          | EP-001                                      |
| **Prioridade**     | Alta                                        |
| **Story Points**   | 5                                           |
| **Sprint**         | A definir                                   |
| **Status**         | New                                         |
| **Responsavel**    |                                             |
| **Criado em**      | 2026-04-12                                  |

## User Story
**Como** gestor de mudancas,
**Quero** criar uma nova GMUD (Gestao de Mudancas) sem erros,
**Para** registrar e acompanhar requisicoes de mudanca no sistema conforme processo ITIL.

## Problema Atual
A funcionalidade de criacao de nova GMUD apresenta erro ao ser acionada, tornando o fluxo indisponivel para uso.

## Criterios de Aceite
- [ ] Dado que clico em "Nova GMUD", quando o formulario abre, entao nenhum erro e exibido
- [ ] Dado que preencho os campos obrigatorios, quando submeto o formulario, entao a GMUD e criada com sucesso
- [ ] Dado que houve erro no backend, quando a operacao falha, entao uma mensagem de erro clara e exibida

## Tasks
| ID   | Descricao                                                        | Status | Estimativa |
|------|------------------------------------------------------------------|--------|------------|
| T-01 | Reproduzir o erro e capturar log do console/network              | New    | 1h         |
| T-02 | Investigar endpoint POST de criacao de change-request            | New    | 2h         |
| T-03 | Verificar se formulario envia payload correto (campos, tenant)   | New    | 1h         |
| T-04 | Corrigir bug identificado (frontend e/ou backend)                | New    | 3h         |
| T-05 | Adicionar tratamento de erro no formulario de criacao            | New    | 1h         |
| T-06 | Testar fluxo completo de criacao de GMUD                         | New    | 1h         |

## Notas Tecnicas
- Verificar endpoint: `POST /api/v1/change-requests`
- Verificar se templates de GMUD estao carregando corretamente
- Pode ser problema de validacao no backend ou campo obrigatorio nao mapeado
- Arquivos provaveis: `FRONTEND/src/pages/changes/`, `BACKEND/src/controllers/change-request.controller.js`

## Definicao de Pronto (DoD)
- [ ] Codigo implementado e revisado
- [ ] Testes de integracao passando (criacao de GMUD via API)
- [ ] Fluxo testado manualmente (criar, visualizar, editar GMUD)
- [ ] Sem regressoes no modulo de GMUD
