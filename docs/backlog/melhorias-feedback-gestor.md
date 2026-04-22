# Melhorias e correções — feedback do gestor

Documento de **tarefas de acompanhamento** derivadas do texto de revisão. Marcar **Corrigido** quando o desenvolvimento estiver entregue (merge) e **Homologado** quando o gestor/QA validar em ambiente de homologação.

> **Visualização em Markdown:** cada tabela é um bloco de linhas **consecutivas** (cabeçalho, separador, linhas de dados). Não inserir linhas em branco *entre* essas linhas — se o editor “esticar” o espaçamento, a tabela deixa de ser reconhecida e aparece como texto com `|`.

**Convenções**

- **Bug** — comportamento incorreto ou regressão.
- **UX** — usabilidade, layout, consistência visual.
- **Produto** — regra de negócio, fluxo ou decisão de escopo.
- **Arquitetura** — alinhar módulos / modelo de dados antes de implementar.
- **Corrigido / Homologado** — substituir `[ ]` por `[x]` na célula quando aplicável.

---

## Orçamentos e despesas

| ID | Tipo | Tarefa | Corrigido | Homologado |
|----|------|--------|:---------:|:----------:|
| ORC-01 | Bug | **Navegação “voltar”:** ao lançar orçamento dentro de um orçamento salvo, a seta de voltar deve regressar à **lista/tela de orçamentos**, não ao **dashboard**. Mapear rota/histórico (`navigate`, `location.state`, breadcrumbs). | [x] | [ ] |
| DES-01 | Bug | **Minhas aprovações — anexo:** ao enviar despesa para aprovação, garantir visualização do **anexo** na aba “Minhas aprovações” (mesma origem de dados que aprovação; links assinados / permissões). | [x] | [x] |
| DES-02 | Produto | **Rejeição de despesa:** hoje só existe **rejeição definitiva**; incluir fluxo de **devolução para ajuste** (reprovar com revisão), com estado claro para o solicitante e reenvio. | [x] | [ ] |
| DES-03 | Produto | **Despesas manuais:** tratar como **não previstas / fora do orçamento** — exigir **aprovação** (ou fluxo dedicado), **destaque visual** (badge, cor, ícone) e regras claras no catálogo de aprovação. | [x] | [ ] |
| FIN-ARC-01 | Arquitetura | **Custos de projetos:** decidir se o controlo permanece **no módulo de projeto** ou migra / espelha no **módulo financeiro** (ex.: “custos de projeto” com aprovação de despesa e ligação a **propostas** em finanças). Documentar decisão e impacto em dados e telas. | [ ] | [ ] |

---

## Contratos

| ID | Tipo | Tarefa | Corrigido | Homologado |
|----|------|--------|:---------:|:----------:|
| CTR-01 | UX | **Modal de aditivo:** redesenhar layout (hierarquia, espaçamento, largura, scroll); alinhar ao padrão de modais do G360. | [ ] | [ ] |
| CTR-02 | Produto | **Histórico de aditivos:** exibir **rastreabilidade** do que cada aditivo alterou (campos antes/depois, valores, datas, anexos), não só “incremento” sem contexto. | [ ] | [ ] |

---

## GMUD

| ID | Tipo | Tarefa | Corrigido | Homologado |
|----|------|--------|:---------:|:----------:|
| GMUD-01 | UX | **Consistência de UI:** avaliar uso de **modal** (como no resto do sistema) para criação/edição de GMUD, mantendo padrão de experiência. | [ ] | [ ] |
| GMUD-02 | Produto | **Pós-conclusão:** após GMUD **finalizada** (sucesso ou falha), **bloquear edição** (somente leitura + auditoria). | [ ] | [ ] |

---

## Minhas aprovações (transversal)

| ID | Tipo | Tarefa | Corrigido | Homologado |
|----|------|--------|:---------:|:----------:|
| APR-01 | UX | **Visualização (ícone “olhinho”):** enriquecer viewer (metadados, anexos, histórico resumido, layout). | [ ] | [ ] |
| APR-02 | Produto | **Motivo de reprovação / devolução:** em **todos** os fluxos “reprovar com ajuste”, “reprovar definitivo” ou “enviar para revisão”, **registar e exibir motivo** no histórico (ver também ATAS-03 e padrão global). | [ ] | [ ] |

---

## Módulo de tarefas (gerais)

| ID | Tipo | Tarefa | Corrigido | Homologado |
|----|------|--------|:---------:|:----------:|
| TAR-01 | Bug | **Status Backlog:** criar tarefa com status backlog gera erro — alinhar **coluna Kanban “Backlog”** com estados da API/validador (mesma lógica que tarefas de projeto); **Kanban** com **scroll horizontal** quando há várias colunas (ex.: ver **Canceladas** com sidebar aberta). | [x] | [ ] |
| TAR-02 | Bug | **Clique no Kanban:** abrir detalhe/drawer da tarefa ao clicar no cartão (sem conflito com drag). | [x] | [ ] |
| TAR-03 | Bug | **Expandir ações:** no modo expandido, permitir **marcar concluído** nas ações (checkbox / handler); **salvar checklist** sem recarregar o modal nem a lista com loading global (estado checked consistente). | [x] | [ ] |
| TAR-04 | Bug | **Data de vencimento:** corrigir **off-by-one** (ex.: 30/04 aparece 29/04) — parsing `YYYY-MM-DD` em **calendário local** (`parseLocalCalendarDateInput`); lista/Kanban/PDF/modal com `formatDueDate` / `formatDate` / `getTaskDeadlineDate`. | [x] | [ ] |
| TAR-05 | Bug | **Lista:** vencimento não deve mostrar texto genérico **“agora”** em detrimento da **data**; definir regra (ex.: “hoje”, data formatada, relativo só quando fizer sentido). | [x] | [ ] |

---

## Projetos

| ID | Tipo | Tarefa | Corrigido | Homologado |
|----|------|--------|:---------:|:----------:|
| PRJ-01 | Bug | **Transição de status:** corrigir **Planejamento → Em andamento** (demais transições OK) — validação backend, workflow ou permissão RBAC. | [ ] | [ ] |
| PRJ-02 | UX | **GMUD / consistência:** avaliar **modal** para fluxos de projeto alinhados ao restante do sistema. | [ ] | [ ] |
| PRJ-03 | Produto | **Tipos de projeto:** permitir **criar tipo na hora** (botão “+” / modal rápido) sem sair do formulário de projeto. | [ ] | [ ] |
| PRJ-04 | Produto | **Área solicitante:** origem = **cadastro de Centro de custo** (ou lista alinhada ao cadastro), não texto solto. | [ ] | [ ] |
| PRJ-05 | UX | **Formulário de projeto:** padronizar **densidade e largura** de campos (evitar fino demais / grosso demais); revisão de grid e componentes MUI. | [ ] | [ ] |
| PRJ-06 | UX | **Valor do orçamento:** aplicar **máscara monetária** consistente com finanças. | [ ] | [ ] |
| PRJ-07 | Produto | **Tarefas de projeto:** expor **timer** de tempo (paridade com expectativa de timesheet). | [ ] | [ ] |
| PRJ-08 | Produto | **Equipe e tarefas:** permitir **membros de outros centros de custo** em tarefas e em **equipes** de projeto (regras de visibilidade e aprovação). | [ ] | [ ] |
| PRJ-09 | Bug | **Backlog projeto:** existe **card** indicador mas **sem Kanban** de backlog — erro ao criar tarefa backlog; alinhar UI + API + colunas. | [ ] | [ ] |

---

## Riscos de projetos

| ID | Tipo | Tarefa | Corrigido | Homologado |
|----|------|--------|:---------:|:----------:|
| RSK-01 | UX | **Criação/edição de risco:** considerar **modal em wizard** (passos: identificação, avaliação, mitigação). | [ ] | [ ] |
| RSK-02 | Produto | **Categorias:** botão **“+”** ao lado do seletor para **nova categoria** inline (com validação). | [ ] | [ ] |
| RSK-03 | Bug | **Estratégia de mitigação:** dados guardados mas **viewer** indica que não há estratégia — corrigir query, chave de serialização ou componente de leitura. | [ ] | [ ] |
| RSK-04 | Produto | **Notas de ação de mitigação:** ao clicar, abrir **modal** com **justificativa** e **anexo opcional**; persistir e mostrar no histórico. | [ ] | [ ] |

---

## ATAs de projeto

| ID | Tipo | Tarefa | Corrigido | Homologado |
|----|------|--------|:---------:|:----------:|
| ATA-01 | UX | **Badge na aba “Atas”:** mostrar **quantidade** de atas do projeto no tab (como outras abas). | [ ] | [ ] |
| ATA-02 | UX | **Pautas discutidas:** substituir **badges** por **lista** legível (evitar “badge demais”). | [ ] | [ ] |
| ATA-03 | Produto | **Rejeição de ata:** ao rejeitar **definitivo** ou **com ajuste**, **obrigar e exibir motivo**; refletir no histórico (ligar a APR-02 se for padrão global). | [ ] | [ ] |

---

## Abas de projeto — custos, equipe, status report

| ID | Tipo | Tarefa | Corrigido | Homologado |
|----|------|--------|:---------:|:----------:|
| ABA-01 | UX | **Ordem das abas:** posicionar aba **Custos depois** da aba **Propostas**. | [ ] | [ ] |
| ABA-02 | Produto | **Aba Custos:** fluxo restrito — **incluir NF**, **anexar** e **submeter aprovação**; **modal enxuto** só com campos necessários. | [ ] | [ ] |
| ABA-03 | Arquitetura | **Equipe:** documentar e implementar modelo desejado (papéis, CC, convidados externos, aprovações). | [ ] | [ ] |
| SR-01 | Produto | **Status report — tipo único:** apenas **STATUS**; remover outros tipos de follow-up deste fluxo. | [ ] | [ ] |
| SR-02 | UX | **Modal e criação:** simplificar criação e edição alinhada ao tipo único. | [ ] | [ ] |
| SR-03 | Produto | **Linha do tempo / visualização:** mostrar **somente mudanças de status** com **data** e **autor** — sem “reagendar”, “concluir” ou **editar** na linha (somente leitura após registo). | [ ] | [ ] |

---

## Incidentes (módulo + service desk)

| ID | Tipo | Tarefa | Corrigido | Homologado |
|----|------|--------|:---------:|:----------:|
| INC-01 | Produto | **SLA por nível:** configuração em **Configurações** (matriz nível → tempos de resposta/resolução ou política associada). | [ ] | [ ] |
| INC-02 | Produto | **Pós-criação:** exibir ação **“Resolver incidente”** com **modal só de resolução** (campos mínimos, fluxo simplificado). | [ ] | [ ] |
| INC-03 | UX | **Modal de criação (service desk):** remover **departamento** que mistura **diretoria**; manter **“Qual sua área”** baseada em **centro de custo** ou **perfil do utilizador**. | [ ] | [ ] |
| INC-04 | Bug | **Abrir chamado:** corrigir **erro** ao abrir/detalhar chamado (logs, rota, tenant). | [ ] | [ ] |
| INC-05 | UX | **Modal de incidente:** aumentar largura útil, reduzir sensação de “fino e comprido”; alinhar ao design system. | [ ] | [ ] |

---

## Problemas

| ID | Tipo | Tarefa | Corrigido | Homologado |
|----|------|--------|:---------:|:----------:|
| PRB-01 | Bug | **CRUD com erro:** reproduzir, corrigir e **replanejar** módulo (listagem, criação, edição, permissões, testes). | [ ] | [ ] |

---

## Padrão global — reprovações e histórico

| ID | Tipo | Tarefa | Corrigido | Homologado |
|----|------|--------|:---------:|:----------:|
| GLB-01 | Produto | **Auditoria de decisões:** em fluxos com **reprovar / revisão / definitivo**, garantir **motivo obrigatório** (onde aplicável) e **histórico visível** (quem, quando, texto). Inventariar módulos: despesas, atas, GMUD, aprovações genéricas, etc. | [ ] | [ ] |

---

## Resumo por prioridade sugerida (editável)

1. **Bloqueadores / erros:** PRJ-01, PRB-01, INC-04, PRJ-09, RSK-03, ORC-01.
2. **Fluxo financeiro e aprovações:** DES-01, DES-02, DES-03, GLB-01, ATA-03.
3. **Consistência UX (modais, listas, badges):** GMUD-01, PRJ-02, ATA-01, ATA-02, SR-01–SR-03, CTR-01.
4. **Decisões de produto antes de codar grande:** FIN-ARC-01, ABA-03.

---

## Como usar este ficheiro

- **Corrigido:** marcar `[x]` quando a correção estiver **implementada e merged** (ou pronta em branch de release).
- **Homologado:** marcar `[x]` quando o **gestor ou QA** validar no ambiente de **homologação** (ou critério interno equivalente).
- Ao implementar, referenciar o **ID** (ex.: `PRJ-01`) na mensagem de commit ou PR.
- Itens **Arquitetura** devem ter decisão registada (ADR curto ou secção no `CHANGELOG` / wiki interna) antes de alterações profundas em schema.

---

*Gerado a partir do feedback textual do gestor — pode ser fatiado em fases no roadmap do projeto.*
