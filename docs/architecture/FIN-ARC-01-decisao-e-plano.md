# FIN-ARC-01 — Custos de projeto vs módulo financeiro

**Estado:** decisão de produto **pendente** (documento para acordo futuro entre negócio, finanças e PMO).  
**Backlog:** [docs/backlog/melhorias-feedback-gestor.md](../backlog/melhorias-feedback-gestor.md) (linha FIN-ARC-01).

---

## Explicação em linguagem simples (o que precisam decidir)

Hoje existem **dois sítios** onde o dinheiro ligado a projetos pode aparecer:

1. **Dentro do projeto** — os **custos de projeto** (lançamentos depois do projeto aprovado, muitas vezes ligados a uma proposta vencedora, com anexo e fluxo de aprovação próprio).
2. **Dentro de finanças** — as **despesas** (fluxo clássico por centro de custo, que o time financeiro já utiliza).

A decisão é: **onde fica a “verdade” oficial** desse dinheiro e **como** finanças e gestão de projeto trabalham juntos sem confusão.

### O que fechar em 1–2 frases (com finanças + quem gere projetos)

1. **O registo oficial do custo do projeto fica onde?**
   - **Só no projeto:** finanças pode não ver o mesmo movimento na lista de despesas (ou só via relatórios à parte).
   - **Só em finanças:** o custo “nasce” como despesa; o projeto deixa de ser o sítio principal do registo (mudança forte para quem opera projetos).
   - **Nos dois, ligados (espelho):** o custo continua a ser criado e aprovado no **projeto**, mas **replica-se ou liga-se** a uma **despesa em finanças** quando fizer sentido (ex.: após aprovação ou pagamento), para todos verem o mesmo valor no sítio certo.

2. **Quem aprova o quê?** Manter só aprovação de custo de projeto, ou exigir também visibilidade no fluxo de despesas?

3. **Relatórios e totais:** regras claras para **não contar duas vezes** o mesmo dinheiro quando houver espelho ou duas fontes.

**Resumo:** escolher se o custo do projeto é **uma coisa à parte**, **a mesma coisa que uma despesa**, ou **nasce no projeto mas tem cópia/ligação em finanças** para alinhar equipas.

---

## Contexto técnico resumido (estado do código)

- **`ProjectCost`:** modelo ligado a `Project` e opcionalmente `ProjectProposal`; API em `BACKEND/src/controllers/project/project-cost.controller.js`; aprovações **PROJECT_COST** em `approval-tier.service.js` / `approval.controller.js`.
- **`Expense`:** despesas gerais com `costCenterId`; sem `projectId` no schema Prisma atual neste repositório.
- **Atenção:** `budget.service.js` (aprovação de orçamento) e `expense.repository.js` (`sumProjectExpenses`) referem `projectId` em despesas, mas **Expense** / **BudgetItem** no Prisma atual **não** incluem esse campo — há **desalinhamento** a corrigir na fase de saneamento, independentemente da opção de produto escolhida.

---

## Plano de implantação (após a decisão)

Quando a opção estiver fechada, seguir por fases (detalhe técnico pode virar ADR numerado).

| Fase | Objetivo |
|------|-----------|
| **0** | ADR com a opção escolhida (A/B/C), critérios e impacto em dados e telas; corrigir inconsistência orçamento / `sumProjectExpenses` vs Prisma. |
| **1** | Se houver espelho: estender modelo (ex.: `Expense` com `projectId`, `projectCostId`, `proposalId` opcionais) + script multi-tenant + `prisma generate`; backfill opcional. |
| **2** | Serviço de sincronização idempotente nos estados de `ProjectCost` (aprovação, pagamento, cancelamento) para criar/atualizar despesa espelhada; permissões alinhadas. |
| **3** | UI finanças (filtros, ligação ao projeto) e UI projeto (indicador “refletido em finanças”); relatórios sem dupla contagem. |
| **4** | Homologação; atualizar backlog FIN-ARC-01; se a meta for uma única entidade no longo prazo, planear deprecação de `ProjectCost` após convivência. |

### Opções de arquitetura (para o ADR)

- **A — Espelho (recomendada para evolução gradual):** `ProjectCost` como fonte operacional no projeto; `Expense` espelhada nos eventos acordados; ligações explícitas para relatórios.
- **B — Big bang:** concentrar tudo em `Expense` com campos de projeto/proposta; descontinuar `ProjectCost` (maior risco e esforço).
- **C — Só projeto:** sem espelho; finanças consome só leituras/APIs se necessário.

---

## Próximo passo

1. Reunir decisão **A / B / C** (ou variante) com critérios de relatório e aprovação.  
2. Registrar no **ADR** (ex.: `docs/architecture/ADR-0XX-fin-arc-01-...md`) e linkar a partir do backlog quando **Corrigido** for marcado.

*Documento criado para suportar a decisão FIN-ARC-01; alterar este ficheiro quando a decisão estiver tomada.*
