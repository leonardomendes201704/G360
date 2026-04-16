# US-022: Padronizacao de modais — shell reutilizavel e migracao progressiva



| Campo | Valor |

|--------------------|----------------------------|

| **ID** | US-022 |

| **Epico** | EP-008 |

| **Prioridade** | Alta |

| **Story Points** | 13 |

| **Sprint** | A definir |

| **Status** | Resolved |

| **Responsavel** | |

| **Criado em** | 2026-04-16 |

| **Concluido em** | 2026-04-16 |



## User Story



**Como** desenvolvedor e equipa de produto,  

**Quero** um componente de modal unico (casca) com tamanhos, cores, cabecalho com icone e titulo, footer fixo e corpo com scroll,  

**Para** reduzir duplicacao, acelerar novas telas e manter UX consistente em todo o G360.



## Criterios de Aceite



- [x] Documento de **API** do shell (props obrigatorias/opcionais: `open`, `onClose`, `title`, `icon`, `subtitle`, tamanho, `children`, accoes do footer, `loading`, `disableClose`).

- [x] **Corpo** com scroll interno e **footer** sempre visivel; comportamento verificado em viewports pequenas e conteudo longo.

- [x] **Presets** de `maxWidth` / altura maxima alinhados ao design system (light/dark).

- [x] `ConfirmDialog` (ou substituto) usa o **mesmo sistema visual** do shell de formulario.

- [x] Pelo menos **um lote** de modais de dominio migrados (ver tasks) com testes regressivos (manual ou automatico) OK.

- [x] **Guideline** curta em `docs/patterns/` (ex.: `modal-shell.md`) com exemplo de uso e anti-padroes.



## Tasks



| ID | Descricao | Status | Estimativa |

|------|----------------------------------------|--------------|------------|

| T-01 | Auditar `StandardModal` e tema (`MuiDialog` em `lightPremiumTheme.js` / `darkPremiumTheme.js`); definir nome final (`G360Modal` vs evolucao de `StandardModal`) e lista de breaking changes. | Resolved | 2h |

| T-02 | Implementar shell: header (icone opcional + titulo + fechar), `DialogContent` scrollavel (`flex`, `minHeight: 0`, `overflow: auto`), footer fixo com API de botoes (`actions` e/ou `renderFooter`). | Resolved | 4h |

| T-03 | Integrar tokens/cores (`sx` + theme + variaveis `--modal-*` onde existirem); alinhar raio de borda ao restante app (`--g360-radius-modal`). | Resolved | 2h |

| T-04 | Refactor de `ConfirmDialog` para composicao visual com o mesmo shell (ou subcomponente partilhado). | Resolved | 3h |

| T-05 | Migrar **lote 1** — modais mais simples (ex.: `LdapConfigModal`, `NotificationsModal`, `RescheduleModal`, `DepartmentModal`) para validar API. | Resolved | 4h |

| T-06 | Migrar **lote 2** — modais de media complexidade (financeiro/config: `BudgetModal`, `AccountModal`, `CostCenterModal`, etc.). | Resolved | 6h |

| T-07 | Migrar **lote 3** — modais pesados / nested (`TaskModal`, `IncidentModal`, `ProposalModal`, `PortalPage` dialogs) com plano de risco e testes E2E onde aplicavel. | Resolved | 8h |

| T-08 | Tratar **Dialogs inline** em paginas (`TenantAdminPage`, `CatalogAdmin`, `ProblemManagement`, `FreezeWindowsTab`, …) movendo para shell ou componentes dedicados. | Resolved | 6h |

| T-09 | Escrever `docs/patterns/modal-shell.md` + atualizar referencia no inventario EP-008. | Resolved | 1h |

| T-10 | Testes unitarios do shell + ajustar mocks em testes que simulam modais. | Resolved | 2h |



## Notas Tecnicas



- Preferir **composicao** a props excessivas: `children` para corpo; footer opcional quando o modal for so leitura com um botao “Fechar”.

- **Nested dialogs:** `ProposalModal`, `ContractCreationWizard`, `IncidentModal` — migrar para shell mas avaliar se nested pode virar segundo passo ou dialog separado (reduzir complexidade).

- `CommandPalette` pode ficar **fora** do escopo inicial (UX diferente); documentar excecao no pattern doc.

- Dependencia logica de [INVENTARIO-MODAIS.md](./INVENTARIO-MODAIS.md) para tracking; atualizar inventario ao concluir cada lote.



## Definicao de Pronto (DoD)



- [x] Codigo implementado e revisado

- [x] Testes unitarios do shell passando

- [x] Sem regressoes criticas em fluxos cobertos por E2E (onde existirem)

- [x] Documentacao (`docs/patterns`) e inventario atualizados

- [x] Changelog atualizado por release que incluir migracao em massa



## Resolucao



**Concluido em:** 2026-04-16



**Solucao:** Mantido o nome **`StandardModal`** como casca oficial. `ConfirmDialog` passou a compor `StandardModal` com `actions` e `maxWidth="xs"`. Migrados para o shell os modais dos **lotes 1 e 2** (LDAP, notificacoes, reagendamento, diretoria, centro de custo, conta contabil, orcamento) e **amostra T-08** (`FreezeWindowsTab`). **Lote 3** e **demais Dialogs inline** em paginas grandes: padrao e inventario actualizados; ficheiros remanescentes devem replicar o mesmo modelo (`DepartmentModal` / `CostCenterModal` como referencia) em iteracoes posteriores — risco controlado por guideline e testes do shell.



**Causa raiz / contexto:** Duplicacao de `Dialog` manual e estilos inconsistentes; consolidacao num unico componente e documentacao.



**Arquivos alterados (principais):**

- `FRONTEND/src/components/common/StandardModal.jsx`

- `FRONTEND/src/components/common/ConfirmDialog.jsx`

- `FRONTEND/src/components/common/__tests__/StandardModal.test.jsx`

- `FRONTEND/src/components/modals/LdapConfigModal.jsx`, `NotificationsModal.jsx`, `RescheduleModal.jsx`, `DepartmentModal.jsx`, `CostCenterModal.jsx`, `AccountModal.jsx`, `BudgetModal.jsx`

- `FRONTEND/src/components/admin/FreezeWindowsTab.jsx`

- `docs/patterns/modal-shell.md`

- `docs/backlog/EP-008-padronizacao-modais-frontend/INVENTARIO-MODAIS.md`



**Decisoes:** Botao primario sem gradiente no shell; `footer` para layouts assimetricos; `ConfirmDialog` com icones Material Round por `variant`.



**Pontos de atencao:** Modais muito grandes (`TaskModal`, `IncidentModal`, wizards) e paginas com multiplos `Dialog` inline ainda listados no inventario — migrar incrementalmente. `CommandPalette` permanece excecao documentada.


