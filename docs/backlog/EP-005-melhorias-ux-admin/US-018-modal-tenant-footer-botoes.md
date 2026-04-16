# US-018: Footer fixo no modal Novo Tenant (botoes nao cortados)

| Campo              | Valor                          |
|--------------------|--------------------------------|
| **ID**             | US-018                         |
| **Epico**          | EP-005                         |
| **Prioridade**     | Media                          |
| **Story Points**   | 3                              |
| **Sprint**         | A definir                      |
| **Status**         | Resolved                       |
| **Responsavel**    |                                |
| **Criado em**      | 2026-04-15                     |

## User Story
**Como** administrador da plataforma,  
**Quero** que os botoes de acao do modal "Novo Tenant" permanecam sempre visiveis na parte inferior do modal,  
**Para** concluir o cadastro sem precisar redimensionar a janela ou perder as acoes (Salvar/Cancelar) cortadas pelo container.

## Contexto / Problema
No modal **Novo Tenant**, o rodape com os botoes de acao fica **parcialmente cortado** (apenas ~30-40% visiveis), indicando excesso de altura do conteudo ou `overflow`/`maxHeight` que clipa o footer. O conteudo do formulario (slug, plano, admin opcional, etc.) deve rolar se necessario; o **footer com botoes deve ficar fixo** e inteiro visivel.

## Criterios de Aceite
- [x] Dado o modal "Novo Tenant" aberto, quando o formulario exceder a altura disponivel, entao a **area central** (campos) deve ser **rolavel** e os botoes **Cancelar** / **Salvar** (ou equivalentes) permanecem **sempre visiveis** no rodape do modal.
- [x] Dado viewport de desktop comum, quando o modal esta aberto, entao os botoes do footer **nao** ficam cortados pela borda inferior do modal.
- [x] Comportamento alinhado ao padrao de modal do projeto (MUI 7 / componente de modal base, se aplicavel).

## Tasks
| ID   | Descricao | Status | Estimativa |
|------|-----------|--------|------------|
| T-01 | Ajustar layout do `TenantModal` (ou container): flex column, `maxHeight` + scroll no body, footer fixo | New | 2h |
| T-02 | Validar em Chrome/Edge com formulario preenchido e lista de campos visivel | New | 0.5h |
| T-03 | Teste manual regressao: salvar tenant e fechar modal | New | 0.5h |

## Notas Tecnicas
- Arquivos provaveis: `FRONTEND/src/components/modals/TenantModal.jsx`, possivelmente `TenantAdminPage.jsx`.
- Padrao sugerido: `Dialog` MUI com `DialogContent` em `overflow: auto` e `DialogActions` fora da area rolavel, ou estrutura equivalente com `display: flex; flexDirection: column; maxHeight: 90vh`.

## Definicao de Pronto (DoD)
- [x] Codigo implementado e revisado
- [x] Teste manual do fluxo Novo Tenant concluido
- [x] Sem regressoes visiveis em outros modais da mesma tela (se compartilharem layout)

## Resolucao
**Concluido em:** 2026-04-15  
**Solucao:** `TenantAdminPage` (`TenantFormModal`): `Dialog` com `Paper` em coluna flex, `maxHeight: min(90vh, 880px)`, formulario com area central `flex:1; minHeight:0; overflowY:auto` e footer com `flexShrink:0` + `data-testid="tenant-modal-footer"`. `TenantModal.jsx` (aba Empresas em Config) recebeu o mesmo padrao flex + scroll no corpo.  
**Arquivos alterados:**  
- `FRONTEND/src/pages/admin/TenantAdminPage.jsx`  
- `FRONTEND/src/components/modals/TenantModal.jsx`  
**Testes:** Playwright `e2e/tenant-modal-and-kpi.spec.ts` (footer dentro do dialog).
