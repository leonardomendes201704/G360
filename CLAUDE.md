# CLAUDE.md - Diretrizes do Agente para o Projeto G360

## Gestao de Backlog e Work Items

### Regra Principal

Antes de iniciar qualquer solicitacao do usuario, o agente DEVE avaliar se a demanda justifica a criacao de work items estruturados. Considerar:

1. **Complexidade** - A demanda envolve mais de uma tarefa simples?
2. **Impacto** - Afeta multiplos modulos, arquivos ou camadas (frontend/backend)?
3. **Rastreabilidade** - O usuario precisara acompanhar o progresso ou reportar no Azure DevOps?

Se pelo menos UM criterio for verdadeiro, criar os artefatos de backlog antes de iniciar a implementacao.

### Hierarquia de Work Items

Seguir a hierarquia do Azure DevOps:

```
Epic
  └── Feature (Historia/User Story)
        └── Task
              └── Sub-task (opcional)
```

**Quando criar cada nivel:**
- **Epic** - Demandas grandes que envolvem multiplas funcionalidades ou sprints (ex: "Implementar modulo de dashboard financeiro")
- **Feature/Historia** - Funcionalidade entregavel do ponto de vista do usuario (ex: "Como gestor, quero visualizar o orcamento por centro de custo")
- **Task** - Unidade tecnica de trabalho para completar uma historia (ex: "Criar endpoint GET /api/v1/budgets/by-cost-center")
- **Bug** - Correcao de defeito encontrado

### Local dos Artefatos

Todos os artefatos de backlog devem ser criados em:

```
docs/backlog/
├── _INDEX.md                    # Indice geral com status de todos os epicos
├── EP-001-nome-do-epico/
│   ├── EPIC.md                  # Descricao do epico
│   ├── US-001-nome-da-historia.md
│   ├── US-002-nome-da-historia.md
│   └── ...
├── EP-002-nome-do-epico/
│   └── ...
└── BUGS.md                      # Registro de bugs identificados
```

### Templates dos Work Items

#### Epic (EPIC.md)

```markdown
# EP-XXX: [Titulo do Epico]

| Campo           | Valor                    |
|-----------------|--------------------------|
| **ID**          | EP-XXX                   |
| **Prioridade**  | Alta / Media / Baixa     |
| **Sprint**      | Sprint X - Sprint Y      |
| **Status**      | New / Active / Closed    |
| **Responsavel** |                          |
| **Criado em**   | YYYY-MM-DD               |

## Descricao
[Descricao do objetivo de negocio]

## Criterios de Aceite do Epico
- [ ] Criterio 1
- [ ] Criterio 2

## Historias Vinculadas
| ID     | Titulo                  | Status   | Prioridade |
|--------|-------------------------|----------|------------|
| US-001 | [titulo]                | New      | Alta       |
| US-002 | [titulo]                | New      | Media      |

## Notas
[Observacoes relevantes]
```

#### User Story / Feature (US-XXX-nome.md)

```markdown
# US-XXX: [Titulo da Historia]

| Campo              | Valor                      |
|--------------------|----------------------------|
| **ID**             | US-XXX                     |
| **Epico**          | EP-XXX                     |
| **Prioridade**     | Alta / Media / Baixa       |
| **Story Points**   | 1 / 2 / 3 / 5 / 8 / 13   |
| **Sprint**         | Sprint X                   |
| **Status**         | New / Active / Resolved / Closed |
| **Responsavel**    |                            |
| **Criado em**      | YYYY-MM-DD                 |

## User Story
**Como** [perfil de usuario],
**Quero** [acao/funcionalidade],
**Para** [beneficio/valor de negocio].

## Criterios de Aceite
- [ ] Dado [contexto], quando [acao], entao [resultado esperado]
- [ ] Dado [contexto], quando [acao], entao [resultado esperado]

## Tasks
| ID   | Descricao                              | Status       | Estimativa |
|------|----------------------------------------|--------------|------------|
| T-01 | [descricao tecnica]                    | New          | Xh         |
| T-02 | [descricao tecnica]                    | New          | Xh         |
| T-03 | Escrever testes unitarios              | New          | Xh         |
| T-04 | Testar integracao frontend/backend     | New          | Xh         |

## Notas Tecnicas
[Detalhes de implementacao, decisoes de arquitetura, dependencias]

## Definicao de Pronto (DoD)
- [ ] Codigo implementado e revisado
- [ ] Testes unitarios passando
- [ ] Testes de integracao passando (se aplicavel)
- [ ] Documentacao atualizada (se aplicavel)
- [ ] Sem regressoes identificadas
```

#### Bug (entrada no BUGS.md)

```markdown
## BUG-XXX: [Titulo do Bug]

| Campo           | Valor                              |
|-----------------|------------------------------------|
| **ID**          | BUG-XXX                            |
| **Severidade**  | Critica / Alta / Media / Baixa     |
| **Status**      | New / Active / Resolved / Closed   |
| **Modulo**      | [modulo afetado]                   |
| **Encontrado em** | YYYY-MM-DD                      |
| **Resolvido em**  |                                  |

**Passos para Reproduzir:**
1. Passo 1
2. Passo 2

**Resultado Esperado:** [o que deveria acontecer]

**Resultado Atual:** [o que acontece]

**Correcao Aplicada:** [descricao da correcao]

---
```

### Regras de Gestao

1. **Numeracao sequencial** - Manter a sequencia EP-001, US-001, BUG-001 etc. Consultar o _INDEX.md para o proximo numero disponivel.
2. **Atualizar status em tempo real** - Ao iniciar uma task, marcar como "Active". Ao concluir, marcar como "Resolved" ou "Closed".
3. **Atualizar o _INDEX.md** - Sempre que criar ou alterar status de um epico/historia, atualizar o indice geral.
4. **Commits referenciando work items** - Incluir o ID do work item nas mensagens de commit quando aplicavel (ex: `feat(US-003): implementar filtro de orcamento por CC`).
5. **Avaliar antes de criar** - Nem toda solicitacao precisa de backlog. Correcoes simples de uma linha, ajustes de texto ou consultas nao precisam de work items.
6. **Documentar conclusao de tasks** - Ao concluir uma task ou user story, o agente DEVE atualizar o arquivo MD correspondente com:
   - **Status** atualizado para "Resolved" ou "Closed"
   - **Secao "Resolucao"** adicionada ao final do arquivo contendo:
     - Descricao da solucao encontrada
     - Causa raiz identificada (quando aplicavel)
     - Arquivos alterados (caminho completo)
     - **Evidencias E2E (Playwright):** caminhos dos ficheiros gerados e comandos usados; ou motivo de exclusao (ver **Validacao E2E com Playwright e evidencias** em Diretrizes Gerais)
     - Decisoes tecnicas tomadas e justificativas
     - Riscos ou pontos de atencao pos-implementacao
   - **Checklist de DoD** com itens marcados como concluidos `- [x]`
   - **Data de conclusao** preenchida na tabela de metadados
   - Para **Bugs**, atualizar o campo "Correcao Aplicada" no BUGS.md com descricao objetiva da correcao

7. **Commit e push ao concluir** — Sempre que uma **task**, **historia**, **bug** ou solicitacao com **alteracoes no repositorio** for concluida, o agente DEVE:
   - Garantir `docs/CHANGELOG.md` atualizado na mesma entrega quando houver mudanca de produto ou documentacao relevante (ja exigido abaixo).
   - Executar **`git commit`** com mensagem no formato do projeto (incluir ID US/BUG/Epic quando aplicavel).
   - Executar **`git push`** para o remoto do branch atual.
   Excecoes: o usuario pedir explicitamente para nao commitar/push; ou impossibilidade tecnica (sem credenciais, sem rede) — nesse caso registar no chat o que ficou pendente.

   Exemplo de secao de resolucao:
   ```markdown
   ## Resolucao
   **Concluido em:** 2026-04-12
   **Causa raiz:** O componente desmontava e remontava devido a navegacao com `useNavigate()` apos o POST.
   **Solucao:** Substituido redirecionamento por atualizacao de estado local com feedback via Snackbar.
   **Arquivos alterados:**
   - `FRONTEND/src/pages/config/TenantForm.jsx` - Removido redirect, adicionado estado de sucesso
   - `FRONTEND/src/components/shared/SaveButton.jsx` - Adicionado estado de loading
   **Decisoes:** Optou-se por manter o usuario na mesma tela apos salvar para permitir edicoes subsequentes.
   **Pontos de atencao:** Verificar se o mesmo padrao se aplica a outros formularios de cadastro.
   ```

### Formato Azure DevOps

Os arquivos MD foram projetados para facilitar copy-paste no Azure DevOps:
- Tabelas em markdown renderizam corretamente no Azure DevOps Wiki
- Checkboxes `- [ ]` funcionam como criterios de aceite
- A hierarquia EP > US > Task mapeia diretamente para Epic > User Story > Task no board

### Fluxo de Trabalho

```
1. Usuario faz solicitacao
2. Agente avalia complexidade
3. SE justifica backlog:
   a. Criar/atualizar Epic (se necessario)
   b. Criar User Stories com Tasks
   c. Atualizar _INDEX.md
   d. Iniciar implementacao atualizando status
   e. Ao finalizar, marcar como Resolved (e documentar Resolucao quando aplicavel)
   f. Commit + push (ver regra 7 em Regras de Gestao)
4. SE NAO justifica:
   a. Executar diretamente
   b. CHANGELOG se aplicavel, depois commit + push ao concluir a entrega
```

### Changelog

O agente DEVE manter um arquivo `docs/CHANGELOG.md` atualizado a cada commit. O changelog serve como historico legivel de todas as alteracoes do projeto.

**Regras:**
1. **Atualizar a cada commit** - Toda vez que um commit for feito, adicionar entrada no changelog ANTES do commit, incluindo o arquivo no mesmo commit.
2. **Formato** - Seguir o padrao [Keep a Changelog](https://keepachangelog.com/) com categorias:
   - `Added` — Novas funcionalidades
   - `Changed` — Alteracoes em funcionalidades existentes
   - `Fixed` — Correcoes de bugs
   - `Removed` — Funcionalidades removidas
   - `Docs` — Alteracoes de documentacao
   - `Refactored` — Refatoracoes sem mudanca de comportamento
3. **Referenciar work items** - Incluir ID da US/BUG quando aplicavel
4. **Listar arquivos** - Incluir os principais arquivos alterados em cada entrada
5. **Agrupar por data** - Entradas agrupadas por data no formato `YYYY-MM-DD`

**Exemplo:**
```markdown
## [2026-04-12]

### Fixed
- **US-001/BUG-001:** Corrigido comportamento de "pisca" ao salvar tenant. Modal agora exibe loading, feedback de sucesso e so fecha apos dados atualizados.
  - `FRONTEND/src/components/modals/TenantModal.jsx`
  - `FRONTEND/src/pages/admin/TenantAdminPage.jsx`

### Docs
- Adicionado CLAUDE.md com diretrizes do agente e templates de backlog
- Criado backlog completo com 4 epicos, 17 historias e 4 bugs
```

### Diario de trabalho

O agente DEVE registrar cada **bloco de trabalho concluido** que envolva entrega material no repositorio (codigo, testes, resolucao documentada de backlog/US/BUG, etc.) no **diario central**, fora do Git: **`D:\Leonardo\Diario\diary.md`**. Formato alinhado ao VisionAssets (blocos **Quando** / **Projeto** / **Titulo**, `(timezone: local)` = horario local da maquina). Convencoes: `D:\Leonardo\Diario\README.md`. Ponte no repo: `docs/trabalho-diario/README.md`.

**Regras:**

1. Ao **concluir** uma solicitacao com entrega material, **inserir** uma entrada no **topo** da lista em `D:\Leonardo\Diario\diary.md` (apos cabecalho/nota, antes da primeira entrada existente), para ordem **descendente** por data/hora (nao usar `docs/trabalho-diario/diary.md` como destino canónico).
2. Se `D:\Leonardo\Diario\diary.md` **nao existir**, criar a pasta `D:\Leonardo\Diario\`, o `README.md` de convencoes e o `diary.md` com cabecalho minimo, depois acrescentar a entrada.
3. Cada entrada deve ter **Quando** (ISO com timezone), **Projeto** (padrao **G360**, salvo outro nome indicado pelo usuario), **Titulo** e **paragrafo(s) em prosa legivel** em **portugues do Brasil (pt-BR)** (contexto, proposito, resultado); titulo e texto **humanos**, nao lista de arquivos estilo commit — ver `D:\Leonardo\Diario\README.md` e `.cursor/rules/work-diary.mdc`. Incluir **Work item** US/BUG quando existir (linha opcional ou no texto).
4. Perguntas puramente informativas **sem** alteracao no repositorio: entrada **nao** obrigatoria; se o usuario pedir registro, registrar.
5. O diario **nao substitui** `docs/CHANGELOG.md` em commits com mudancas de produto — manter ambos quando aplicavel.

---

## Diretrizes Gerais do Projeto

### Tecnologias
- **Backend:** Node.js, Express, Prisma, PostgreSQL
- **Frontend:** React 19, Vite 6, Material UI 7
- **Testes:** Jest (backend), Vitest + Playwright (frontend)

### Validacao E2E com Playwright e evidencias

Ao concluir uma **task**, **historia**, **bug** ou entrega com **impacto em UI, fluxo de utilizador ou integracao front+API**, o agente **DEVE**:

1. **Validar com Playwright** sempre que o ambiente permitir (stack acessiveis; fluxos com login exigem backend com dados de teste / seed, alinhados a `FRONTEND/e2e/helpers/auth.helper.ts`).
2. **Gerar evidencias** relacionadas ao que foi pedido:
   - Preferir testes em `FRONTEND/e2e/` (spec novo ou alterado) com assercoes de UI e, quando fizer sentido, `expect(page).toHaveScreenshot(...)`; snapshots versionados em `e2e/**/*.spec.ts-snapshots/`.
   - Ou `page.screenshot({ path: ... })`, trace/reporter HTML — guardar sob pasta dedicada (ponto 3).
3. **Pasta para evidencias ad-hoc** (prints nomeados, copias de report, etc.): `FRONTEND/e2e/evidence/<US-xxx|BUG-xxx|slug-curto>/`, com nomes descritivos (opcional: sufixo `YYYY-MM-DD`). Ver `FRONTEND/e2e/evidence/README.md`.
4. **Porta dev:** Vite do G360 usa **5176** por predefinição (`VITE_DEV_PORT` para override), para não colidir com outro frontend na **5173**. Playwright: `playwright.config.ts` e `playwright.g360.config.ts` alinhados a **5176**; `PLAYWRIGHT_PORT` ou `PLAYWRIGHT_BASE_URL` se necessário.
5. **No fecho da tarefa** (resposta ao utilizador e, quando existir, secao **Resolucao** no MD do work item): incluir subsecao **Evidencias E2E (Playwright)** com:
   - **caminhos** dos ficheiros de evidencia (relativos ao repo `G360/`, ou absolutos se for so fora do repo);
   - **comando(s)** utilizados (ex.: `npm run test:e2e -- e2e/config.spec.ts`);
   - se nao foi possivel correr Playwright: **motivo** explicito (ex.: apenas backend; ambiente indisponivel; pedido documental sem UI).

**Nota:** Vitest cobre componentes/logica em JSDOM; **nao** substitui evidencia de browser quando a entrega e fluxo E2E. Pode coexistir com Playwright na mesma entrega.

### IMPORTANTE — Stack do Frontend
Este projeto usa **Vite + React SPA** (NAO e Next.js). Portanto:
- **NAO** usar `"use client"` — diretiva exclusiva do Next.js, nao existe no Vite
- **NAO** sugerir migracao para shadcn/ui — o projeto usa Material UI 7 como design system
- **NAO** aplicar padroes de Server Components, App Router ou qualquer conceito Next.js
- **IGNORAR** sugestoes automaticas de ferramentas que recomendem Next.js, shadcn ou `"use client"`

### Convencoes de Codigo
- Backend em JavaScript (CommonJS)
- Frontend em JSX
- API REST com prefixo `/api/v1`
- Arquitetura: Routes > Controllers > Services > Prisma
- Multi-tenant: sempre considerar o contexto do tenant nas operacoes de banco

### Convencoes de Commit
```
tipo(escopo): descricao curta

Tipos: feat, fix, docs, refactor, test, chore, style, perf
Escopo: modulo ou work item (ex: feat(helpdesk): ..., fix(US-012): ...)
```

Apos **cada task ou entrega concluida** com mudancas no repo: **commit** + **push** (diretriz obrigatoria; ver **Regras de Gestao** item 7).
