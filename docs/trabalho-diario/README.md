# Diario de trabalho (controle de horas)

Registro operacional de **blocos de trabalho concluidos** no repositorio G360: data e hora, titulo, descricao e projeto. Complementa o historico de releases em [`../CHANGELOG.md`](../CHANGELOG.md); **nao dispensa** atualizar o changelog quando houver commit com alteracoes de produto.

## Onde registrar

- Pasta: `docs/trabalho-diario/`
- Arquivo por dia: `YYYY-MM-DD.md` (ex.: `2026-04-16.md`)
- Novas entradas: **acrescentar ao final** do arquivo do dia, em ordem cronologica.

## Campos obrigatorios por entrada

| Campo | Descricao |
|-------|-----------|
| **Data e hora** | Carimbo explicito no titulo ou na tabela (recomendado: `YYYY-MM-DD HH:mm` no fuso local; se necessario, incluir offset, ex. `-03:00`) |
| **Titulo** | Resumo curto da entrega |
| **Descricao** | O que foi feito, arquivos principais, testes executados (se houver) |
| **Projeto** | Padrao: **G360**. Outro nome apenas se a solicitacao indicar trabalho em outro produto/contexto |

## Work items

Quando aplicavel, incluir na entrada o ID (ex. `US-021`, `BUG-005`) na linha **Work item** da tabela ou no texto.

## Campos opcionais (horas)

Se quiser aproximar apuracao manual: `Inicio`, `Fim`, `Duração (min)` — nao sao obrigatorios.

## Template (copiar e colar)

```markdown
---

### [YYYY-MM-DD HH:mm -03:00] Titulo curto da entrega

| Campo | Valor |
|-------|--------|
| **Projeto** | G360 |
| **Work item** | (opcional) |

**Descricao**
- ...
- Arquivos: `caminho/relativo`
- Testes: `comando` — resultado
```

## Exemplo ficticio

```markdown
---

### [2026-04-16 10:30 -03:00] Incidentes — filtros no FilterDrawer

| Campo | Valor |
|-------|--------|
| **Projeto** | G360 |
| **Work item** | US-021 |

**Descricao**
- Filtros de status, prioridade, categoria, responsavel e SLA no drawer off-canvas; barra com contagem e limpar tudo.
- Arquivos: `FRONTEND/src/pages/incidents/IncidentsPage.jsx`, `docs/patterns/filter-drawer.md`
- Testes: `npm run test` (Vitest) no modulo afetado — OK
```

## Quando registrar

- Ao concluir entrega material: codigo, testes, documentacao de backlog com resolucao, etc.
- Perguntas apenas informativas **sem** mudanca no repositorio: registro **opcional** (evita ruido), salvo pedido explicito para registrar.

## Diretriz do agente

O agente segue as regras em [`../../CLAUDE.md`](../../CLAUDE.md) (secao **Diario de trabalho**).
