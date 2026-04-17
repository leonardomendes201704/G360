# US-024: Portal de Chamados — casca DataListShell em «Meus Chamados»

| Campo | Valor |
|--------------------|----------------------------|
| **ID** | US-024 |
| **Epico** | EP-009 |
| **Prioridade** | Media |
| **Story Points** | 2 |
| **Sprint** | - |
| **Status** | Closed |
| **Responsavel** | |
| **Criado em** | 2026-04-18 |
| **Concluido em** | 2026-04-18 |

## User Story

**Como** utilizador do Portal de Suporte,
**Quero** que a lista «Meus Chamados» partilhe o mesmo padrão visual das outras listas do produto,
**Para** ter consistência com o resto da aplicação e preparar evoluções comuns (toolbar, contagem).

## Criterios de Aceite

- [x] Secção da tabela de chamados envolvida por **`DataListShell`** (título, ícone, contagem filtrada)
- [x] Quando há refinamento e o total na conta difere do filtrado, contexto adicional visível (toolbar: «de N na conta»)
- [x] Testes **`PortalPage.test.jsx`** a verde

## Tasks

| ID | Descricao | Status |
|------|----------------------------------------|--------------|
| T-01 | Integrar `DataListShell` em `PortalPage.jsx` | Done |
| T-02 | Executar vitest `PortalPage.test.jsx` | Done |

## Definicao de Pronto (DoD)

- [x] Codigo implementado
- [x] Testes passando
- [x] Inventario e CHANGELOG atualizados

## Resolucao

**Concluido em:** 2026-04-18

**Solucao:** Substituído o bloco `Stack` + `Typography` do cabeçalho «Meus Chamados» por **`DataListShell`** com `title`, `titleIcon="confirmation_number"`, `accentColor` alinhada ao helpdesk, `count={filteredTickets.length}` e **`toolbar`** opcional com texto «de {tickets.length} na conta» quando `hasListRefinement` e totais diferem. O **`TableContainer`** e paginação permanecem em `children`.

**Arquivos alterados:**
- `FRONTEND/src/pages/helpdesk/PortalPage.jsx`
- `docs/patterns/data-grids-inventory.md`
- `docs/CHANGELOG.md`
- `docs/backlog/EP-009-padronizacao-listas-grids-frontend/EPIC.md`
- `docs/backlog/_INDEX.md`

**Decisoes:** Contagem principal no título via prop `count` do shell; o subtítulo «x de y» do desenho anterior foi desdobrado em `(count)` + toolbar só quando relevante, para não duplicar números quando lista não está refinada.

**Pontos de atencao:** EP-009 pode encerrar após Grupo A completo; migracoes Grupo B/C continuam opcionais por historia futura.
