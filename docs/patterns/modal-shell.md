# Padrão: casca de modal (`StandardModal`)

## Objetivo

Formulários e visualizações em overlay devem usar **`StandardModal`** (`FRONTEND/src/components/common/StandardModal.jsx`): **cabeçalho** (título, ícone opcional, fechar), **corpo com scroll** e **rodapé fixo** (botões via `actions` ou `footer` customizado), alinhados ao tema claro/escuro e ao token `--g360-radius-modal`.

## Estrutura

| Zona | Comportamento |
|------|----------------|
| Header | Fixo; `title`, opcional `subtitle` e `icon` (Material Icons Round); botão fechar. |
| Body | `DialogContent` com `flex: 1`, `minHeight: 0`, `overflow-y: auto` — o scroll é **só no corpo**. O MUI zera o `padding-top` quando o conteúdo vem logo após `DialogTitle`; o `StandardModal` força `padding-top` (spacing 3) para não cortar labels de campos. O `padding-bottom` é `spacing(2) + 5px` para afastar o último campo do separador do footer. |
| Footer | Fixo; use `actions` (array) ou `footer` (ReactNode) para botões. |

O `Paper` do dialog usa `maxHeight: min(90dvh, 920px)` para evitar modais maiores que a viewport.

## Presets de largura (`size`)

| `size` | `maxWidth` MUI |
|--------|----------------|
| `form` | `sm` |
| `detail` | `md` |
| `wide` | `lg` |
| `xl` | `xl` |

Pode-se passar `maxWidth` diretamente; se ambos existirem, **`maxWidth` tem prioridade** na implementação atual (recomenda-se usar um dos dois por modal).

## Botão primário no rodapé

Alinhar com **`variant="contained"`** + **`color="primary"`** + **`sx={{ textTransform: 'none', fontWeight: 600 }}`** (igual ao **Fechar** do `NotificationsModal`). Evitar `background: linear-gradient(...)` nos primários dos modais com `StandardModal`.

## API resumida

- `open`, `onClose`, `title`, `children`
- `subtitle`, `icon`
- `actions`: `[{ label, onClick, variant?, color?, disabled?, type? }]` — último botão usa `variant="contained"` e `color="primary"` (cores do tema MUI), **sem gradiente**
- `footer`: substitui `actions` quando presente (ex.: botão à esquerda + grupo à direita)
- `loading`: impede fechar pelo backdrop/ESC e deve ser combinado com `disabled` nos botões do `footer` customizado
- `contentSx`: estilos extra no corpo scrollável

## Exemplo com `actions`

```jsx
<StandardModal
  open={open}
  onClose={onClose}
  title="Novo item"
  icon="add"
  size="form"
  loading={saving}
  actions={[
    { label: 'Cancelar', onClick: onClose },
    { label: 'Salvar', onClick: handleSave },
  ]}
>
  { /* campos */ }
</StandardModal>
```

## Exemplo com `footer` (rodapé assimétrico)

Botão “secundário” à esquerda e grupo à direita; `type="submit"` com `form="meu-form-id"` quando o submit está fora do `<form>` no DOM.

Ver referência: `FRONTEND/src/components/modals/LdapConfigModal.jsx`.

## Confirmações

**`ConfirmDialog`** (`FRONTEND/src/components/common/ConfirmDialog.jsx`) usa a **mesma casca** que o `StandardModal` (título, ícone por `variant`: `danger` → `delete`, `warning`, `info`, corpo centrado, botões Cancelar / Confirmar). Props: `open`, `title`, `content`, `onConfirm`, `onClose`, `confirmText`, `cancelText`, `confirmColor`, `variant`.

## Anti-padrões

- Novos modais com `Dialog` + `DialogTitle` + `DialogContent` + `DialogActions` copiados manualmente — usar `StandardModal` ou estender este componente.
- Corpo sem scroll com muito conteúdo — manter conteúdo longo **dentro** do `StandardModal` para o scroll automático funcionar.
- Vários níveis de `Dialog` aninhados — preferir passos internos ou outro padrão (drawer, painel).

## Exceções

- **Command palette** (`CommandPalette.jsx`): UX de pesquisa rápida; não precisa seguir esta casca.

## Origem no backlog

- **US-009** (EP-002): criação do modal base.
- **EP-008 / US-022**: adoção em escala e alinhamento de `ConfirmDialog`.

## Como validar (manual)

1. `cd FRONTEND && npm run dev`
2. Autenticar como **Global Super Admin** (a aba Integrações só aparece para esse perfil).
3. Navegar para **`/config/organization?tab=integracoes`** (menu de Configuração / Organização → separador **Integracoes**).
4. No cartão **AD Local (LDAP)**, clicar em **Configurar** / **Configurar Agora**.
5. O modal deve mostrar ícone `vpn_key`, título, subtítulo, formulário no corpo e rodapé com **Testar Conexão** à esquerda e **Cancelar** / **Salvar** à direita.
6. Reduzir a altura da janela do browser: cabeçalho e rodapé fixos; apenas o meio faz scroll se o conteúdo for alto.

### Notificações e reagendar follow-up (US-022)

7. **Notificações:** com sessão iniciada, ícone do **sino** na barra superior → **Todas as Notificações** (ícone, subtítulo, lista ou estado vazio, **Marcar tudo como lido** + **Fechar**).
8. **Reagendar:** abrir um **projeto** que tenha follow-ups → separador de follow-up → ação de **reagendar** num item → modal com data e **Cancelar** / **Confirmar**.

Referências: `NotificationsModal.jsx`, `RescheduleModal.jsx`; API em **8500** se precisares de dados reais.

## Testes automáticos

```bash
cd FRONTEND && npx vitest run src/components/common/__tests__/StandardModal.test.jsx
```
