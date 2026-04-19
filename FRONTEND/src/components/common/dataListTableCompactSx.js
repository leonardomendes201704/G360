/**
 * Preset visual «~75%» para {@link DataListTable} — cabeçalho do cartão, células e paginação mais densos,
 * alinhado ao Service Desk, Portal e Incidentes.
 *
 * Use `density="compact"` no `DataListTable` ou importe estas constantes para fusões manuais (`shell.sx`, `shell.tableContainerSx`).
 */

/** Aplicar em `shell.sx` (primeira faixa do `DataListShell`). */
export const DATA_LIST_TABLE_COMPACT_SHELL_SX = {
  '& > div:first-of-type': {
    py: 2.25,
    px: 2.25,
    gap: 1.5,
  },
  '& > div:first-of-type .material-icons-round': {
    fontSize: '15px !important',
  },
  '& > div:first-of-type > .MuiTypography-root': {
    fontSize: '13.5px !important',
    lineHeight: 1.3,
  },
  '& > div:first-of-type > .MuiTypography-root .MuiTypography-root': {
    fontSize: '10.5px !important',
  },
};

/**
 * Alternativa ao shell acima quando a página usa `shell.headerSx` em vez de regras no `shell.sx` exterior.
 * Mesma intenção visual que {@link DATA_LIST_TABLE_COMPACT_SHELL_SX} no cabeçalho.
 */
export const DATA_LIST_TABLE_COMPACT_HEADER_SX = {
  py: 2.25,
  px: 2.25,
  gap: 1.5,
  '& .material-icons-round': {
    fontSize: '15px !important',
  },
  '& > .MuiTypography-root': {
    fontSize: '13.5px !important',
    lineHeight: 1.3,
  },
  '& > .MuiTypography-root .MuiTypography-root': {
    fontSize: '10.5px !important',
  },
};

/** Aplicar em `shell.tableContainerSx` — tabela + paginação + chips / ícones na grelha. */
export const DATA_LIST_TABLE_COMPACT_CONTAINER_SX = {
  fontSize: '0.75rem',
  overflow: 'auto',
  '& .MuiTable-root': {
    width: '100%',
    minWidth: 0,
  },
  '& thead .MuiTableCell-root': {
    fontSize: '0.5625rem !important',
    py: 0.5,
    px: 1,
    lineHeight: 1.25,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  '& tbody .MuiTableCell-root': {
    py: 0.75,
    px: 1,
    fontSize: '0.65rem !important',
    overflow: 'hidden',
    verticalAlign: 'middle',
  },
  '& .MuiTableSortLabel-root': { fontSize: 'inherit' },
  '& .MuiTableSortLabel-icon': { fontSize: '0.875rem !important' },
  '& .MuiChip-root': {
    height: 21,
    maxWidth: '100%',
    '& .MuiChip-label': { px: 0.75, fontSize: '0.525rem', lineHeight: 1.2 },
  },
  '& .MuiIconButton-root': { padding: '4px' },
  '& .MuiSvgIcon-root': { fontSize: '1.125rem' },
  '& .MuiCheckbox-root': { padding: '4px' },
  '& .MuiTablePagination-root': {
    fontSize: '0.75rem',
    '& .MuiTablePagination-toolbar': { minHeight: 42, pl: 1, pr: 0.5 },
    '& .MuiInputBase-root': { fontSize: '0.75rem' },
  },
};
