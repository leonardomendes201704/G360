# Padrao: filtros em painel lateral (off-canvas)

## Objetivo

Listagens com varios criterios de filtro devem usar o componente **`FilterDrawer`** (`FRONTEND/src/components/common/FilterDrawer.jsx`): painel deslizante pela **direita** (MUI `Drawer` com `anchor="right"`), liberando espaco vertical na pagina e alinhando a UX entre modulos.

## Quando usar

- Telas com **multiplos** filtros (status, prioridade, responsavel, datas, etc.).
- Busca por texto pode permanecer na **barra da listagem** (campo de busca rapida); criterios estruturados ficam no drawer.

## Comportamento

| Acao | Efeito |
|------|--------|
| Abrir | Botao "Filtros" (icone `filter_list` / `FilterAlt`) abre o painel. |
| Aplicar | Persiste os valores no estado da listagem e **fecha** o painel. |
| Limpar | Reseta os campos do drawer (e o estado aplicado) conforme implementacao; pode manter busca textual se desejado. |
| Fechar (X / overlay) | Fecha sem perder valores ja aplicados (estado tipicamente ja esta sincronizado em tempo real **ou** via rascunho + Aplicar). |

## Implementacao recomendada

1. Estado dos filtros persistido com `usePersistedFilters` (ou equivalente).
2. **Rascunho (`draft`)** opcional: ao abrir o drawer, copiar filtros aplicados para `draft`; em "Aplicar", gravar `draft` no estado principal. Alternativa: atualizar estado principal a cada mudanca e usar "Aplicar" apenas para fechar (menos comum).
3. Contagem de filtros ativos (badge ao lado do botao) **sem** incluir a busca rapida, se ela ficar fora do drawer.

## Referencia de codigo

- Componente: `FRONTEND/src/components/common/FilterDrawer.jsx`
- Exemplo de uso: `FRONTEND/src/pages/incidents/IncidentsPage.jsx`

## Historia de origem

- **US-007** (EP-002): criacao do `FilterDrawer`.
- Aplicacao em Incidentes: ver backlog **US-021** (EP-007).
