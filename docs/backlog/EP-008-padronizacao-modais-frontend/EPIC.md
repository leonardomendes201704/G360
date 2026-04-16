# EP-008: Padronizacao e componentizacao de modais (Frontend)

| Campo | Valor |
|-----------------|--------------------------|
| **ID** | EP-008 |
| **Prioridade** | Alta |
| **Sprint** | A definir |
| **Status** | Closed |
| **Responsavel** | |
| **Criado em** | 2026-04-16 |

## Descricao

Hoje o frontend usa **dezenas** de implementacoes de `Dialog` (MUI) com layouts, tamanhos, cores e rodapes diferentes. Ja existe um [`StandardModal`](../../../FRONTEND/src/components/common/StandardModal.jsx), mas **nao esta adotado** nas telas; varios modais replicam manualmente `DialogTitle`, `DialogContent`, `DialogActions` e estilos.

Este epico consolida **um padrao unico** de modal: tamanhos predefinidos, cores alinhadas ao tema, **icone + titulo** no cabecalho, **footer fixo** com botoes configuraveis, **conteudo com scroll**, acessibilidade e facil manutencao.

## PBI / Feature principal

| Tipo | ID | Titulo |
|------|-----|--------|
| **Product Backlog Item (Feature)** | **US-022** | Padronizacao de modais — shell reutilizavel e migracao progressiva |

A historia [US-022](./US-022-padronizacao-modais-shell-e-migracao.md) concentra criterios de aceite, tasks tecnicas e definicao de pronto.

## Inventario

Lista tecnica de usos de `Dialog` / modais: [INVENTARIO-MODAIS.md](./INVENTARIO-MODAIS.md).

## Criterios de Aceite do Epico

- [x] Existe um **componente de casca** oficial (evolucao de `StandardModal` ou novo `G360Modal`) documentado e usado como base para novos modais.
- [x] **Tokens** de tamanho, cores, bordas e espacamentos definidos (tema MUI +/ou CSS variables) e aplicados ao shell.
- [x] **Confirmacao** (`ConfirmDialog` ou equivalente) alinhada visualmente ao mesmo sistema.
- [x] **Migracao progressiva** dos modais existentes em lotes priorizados (ver tasks em US-022), sem regressao funcional.
- [x] **Padrao de uso** descrito para desenvolvedores (props, scroll, footer, loading, nested dialogs).

## Historias Vinculadas

| ID | Titulo | Status | Prioridade |
|--------|-------------------------|----------|------------|
| US-022 | Padronizacao de modais — shell e migracao | Resolved | Alta |

## Boas praticas (manutencao e uso)

1. **Um shell, muitos conteudos** — Formularios e visualizacoes importam o wrapper; evitar copiar `sx` de `Dialog` entre arquivos.
2. **Layout em tres zonas fixas** — Header (titulo + icone opcional + fechar), **body** (`flex` + `minHeight: 0` + `overflow: auto`), footer (acoes). O scroll ocorre **só no body**.
3. **Presets de largura** — Mapear `maxWidth` (`xs`–`xl`) a nomes de produto (ex.: `sm` = formularios simples, `md` = detalhe, `lg` = wizard) para decisao rapida e consistencia.
4. **Footer** — API com array de acoes (`label`, `onClick`, `variant`, `color`, `disabled`, `loading`) ou `renderActions` para casos excepcionais; botao primario a **direita** (convencao MUI).
5. **Estado de loading** — Bloquear fechamento por backdrop/ESC e desabilitar acoes enquanto `loading`.
6. **Tema claro/escuro** — Ler cores de `theme` / variaveis do projeto; evitar hex fixos nos consumidores do shell.
7. **Acessibilidade** — Manter titulo associado ao dialog (MUI faz grande parte); garantir foco e ordem de tab nos botoes do footer.
8. **Dialogs aninhados** — Evitar; preferir passos internos, segundo painel ou drawer. Se inevitavel, documentar e testar z-index e foco.
9. **Testes** — Testes unitarios no shell; testes de fluxo nos modais criticos (ja cobertos por Vitest/Playwright onde existir).

## Notas

- A US-009 (EP-002) ja previa “Modal padrao”; este epico **formaliza a adocao** e a **migracao** em escala.
- O [Command Palette](../../../FRONTEND/src/components/common/CommandPalette.jsx) usa `Dialog` com UX especifica (comando rapido); pode permanecer fora do shell padrao ou receber variante `variant="command"` apos avaliacao.

---
*Indice geral: [`_INDEX.md`](../_INDEX.md)*
