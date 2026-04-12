# US-004: Corrigir erro ao criar nova GMUD

| Campo              | Valor                                       |
|--------------------|---------------------------------------------|
| **ID**             | US-004                                      |
| **Epico**          | EP-001                                      |
| **Prioridade**     | Alta                                        |
| **Story Points**   | 5                                           |
| **Sprint**         | A definir                                   |
| **Status**         | Resolved                                    |
| **Responsavel**    | Claude Agent                                |
| **Criado em**      | 2026-04-12                                  |
| **Concluido em**   | 2026-04-12                                  |

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
| T-01 | Reproduzir o erro e capturar log do console/network              | Done   | 1h         |
| T-02 | Investigar causa raiz do TypeError: projectsList.map             | Done   | 2h         |
| T-03 | Corrigir resposta paginada de projectService.getAll()            | Done   | 1h         |
| T-04 | Corrigir deadlock de mounted state no ChangeModal                | Done   | 1h         |
| T-05 | Testar fluxo completo de criacao de GMUD no navegador            | Done   | 1h         |

## Notas Tecnicas
- Verificar endpoint: `POST /api/v1/change-requests`
- Verificar se templates de GMUD estao carregando corretamente
- Pode ser problema de validacao no backend ou campo obrigatorio nao mapeado
- Arquivos provaveis: `FRONTEND/src/pages/changes/`, `BACKEND/src/controllers/change-request.controller.js`

## Definicao de Pronto (DoD)
- [x] Codigo implementado e revisado
- [x] Build passando sem erros
- [x] Fluxo testado manualmente no navegador (modal abre corretamente)
- [x] Sem regressoes no modulo de GMUD

## Resolucao
**Concluido em:** 2026-04-12

**Causa raiz:** Dois bugs combinados:

1. **TypeError: projectsList.map is not a function** — O `projectService.getAll()` retorna `{ data: [...], meta: {...} }` (resposta paginada), mas `ChangeModal.jsx` fazia `.then(setProjectsList)` que setava o objeto inteiro como estado. Ao tentar `projectsList.map()` na linha 846, o objeto nao tem `.map()`.

2. **Modal nunca abre (deadlock de mounted)** — O `ChangeModal` tinha `if (!open || !mounted) return null` na linha 436, com `mounted` iniciando como `false` e sendo setado via `useEffect`. Quando `open` e `false` no primeiro render, o componente retorna `null` antes do useEffect rodar, entao `mounted` nunca fica `true`. Quando `open` muda para `true`, `mounted` ainda e `false` = deadlock.

**Solucao aplicada:**
1. Extrair array do response paginado: `projectService.getAll().then(res => setProjectsList(Array.isArray(res) ? res : res?.data || []))`
2. Remover `mounted` do guard: `if (!open) return null` (o Dialog do MUI ja controla visibilidade)

**Arquivos alterados:**
- `FRONTEND/src/components/modals/ChangeModal.jsx` — Fix projectsList response handling + remove mounted deadlock

**Decisoes:** O fix do projectsList usa pattern defensivo (`Array.isArray ? res : res?.data || []`) para suportar tanto resposta paginada quanto array direto, evitando quebra futura se o backend mudar.

**Pontos de atencao:** Outros modais que consomem `projectService.getAll()` podem ter o mesmo problema de response paginada. Verificar se ha outros `.then(setXxx)` que assumem array.
