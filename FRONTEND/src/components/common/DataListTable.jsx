import { useMemo, useState, useEffect, useContext } from 'react';
import {
  Box,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
} from '@mui/material';
import { ThemeContext } from '../../contexts/ThemeContext';
import DataListShell from './DataListShell';

/**
 * Lista em cartão (DataListShell) + tabela MUI com ordenação e paginação no cliente.
 * Para linhas compostas ou regras de sort específicas, use `sortRows` ou `column.accessor`.
 *
 * @param {object} shell — Repasse ao DataListShell: title, titleIcon, accentColor, count, toolbar, sx, className
 * @param {Array<{ id: string, label: string, sortable?: boolean, width?: string, minWidth?: number|string, align?: 'left'|'right'|'center', headerSx?: object, cellSx?: object|function, render: function(row): ReactNode, accessor?: function(row): any }>} columns
 * @param {Array} rows
 * @param {function(row): string} [getRowKey] — chave estável da linha (default: row.id)
 * @param {string} [defaultOrderBy] — id da coluna
 * @param {'asc'|'desc'} [defaultOrder]
 * @param {function(string): 'asc'|'desc'} [getDefaultOrderForColumn] — ao mudar coluna, direção inicial (ex.: datas => desc)
 * @param {function(Array, string, 'asc'|'desc'): Array} [sortRows] — ordenação custom (sobrepõe sort interno)
 * @param {boolean} [loading]
 * @param {ReactNode} [loadingContent]
 * @param {string} [emptyMessage]
 * @param {ReactNode} [emptyContent] — se definido, substitui `emptyMessage` quando `rows` está vazio (ex.: `EmptyState` com CTA)
 * @param {number} [rowsPerPageDefault=10]
 * @param {number[]} [rowsPerPageOptions=[5,10,25,50]]
 * @param {boolean} [tableLayoutFixed=true]
 * @param {'small'|'medium'} [size='small']
 * @param {string|number} [resetPaginationKey] — quando muda, volta à página 0 (ex.: filtro da página pai)
 * @param {function({ paginatedRows: Array, page: number, rowsPerPage: number }): ReactNode} [renderBeforeTable] — ex.: BulkActionsBar alinhado à página atual
 * @param {function(row): void} [onRowClick] — clique na linha (ex.: abrir detalhe)
 * @param {function(row): boolean} [isRowSelected]
 * @param {function(row): object} [getRowSx]
 */
const DataListTable = ({
  shell,
  columns,
  rows = [],
  getRowKey = (r) => r.id,
  defaultOrderBy,
  defaultOrder = 'asc',
  getDefaultOrderForColumn,
  sortRows: sortRowsProp,
  loading = false,
  loadingContent,
  emptyMessage = 'Nenhum registro.',
  emptyContent,
  rowsPerPageDefault = 10,
  rowsPerPageOptions = [5, 10, 25, 50],
  tableLayoutFixed = true,
  size = 'small',
  resetPaginationKey,
  renderBeforeTable,
  onRowClick,
  isRowSelected,
  getRowSx,
}) => {
  const { mode } = useContext(ThemeContext);
  const isDark = mode === 'dark';

  const firstSortable = columns.find((c) => c.sortable !== false && c.id);
  const initialOrderBy = defaultOrderBy ?? firstSortable?.id ?? '';

  const [orderBy, setOrderBy] = useState(initialOrderBy);
  const [order, setOrder] = useState(defaultOrder);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(rowsPerPageDefault);

  const headerBg = isDark ? '#1e293b' : '#f8fafc';
  const thBase = {
    color: '#64748b',
    fontWeight: 600,
    fontSize: '0.75rem',
    textTransform: 'uppercase',
  };

  const sortedRows = useMemo(() => {
    if (!rows.length) return rows;
    if (sortRowsProp) return sortRowsProp([...rows], orderBy, order);
    if (!orderBy) return [...rows];
    const col = columns.find((c) => c.id === orderBy);
    if (!col || col.sortable === false) return [...rows];
    const mult = order === 'asc' ? 1 : -1;
    const acc =
      col.accessor ??
      ((r) => {
        return r[col.id];
      });
    return [...rows].sort((a, b) => {
      const va = acc(a);
      const vb = acc(b);
      let cmp = 0;
      if (va == null && vb == null) cmp = 0;
      else if (va == null) cmp = -1;
      else if (vb == null) cmp = 1;
      else if (typeof va === 'number' && typeof vb === 'number') cmp = va - vb;
      else if (va instanceof Date && vb instanceof Date) cmp = va.getTime() - vb.getTime();
      else cmp = String(va).localeCompare(String(vb), 'pt-BR', { numeric: true, sensitivity: 'base' });
      return mult * cmp;
    });
  }, [rows, orderBy, order, sortRowsProp, columns]);

  const paginatedRows = useMemo(
    () => sortedRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [sortedRows, page, rowsPerPage]
  );

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(sortedRows.length / rowsPerPage) - 1);
    if (page > maxPage) setPage(maxPage);
  }, [sortedRows.length, rowsPerPage, page]);

  useEffect(() => {
    setPage(0);
  }, [resetPaginationKey]);

  const handleRequestSort = (property) => {
    if (orderBy === property) {
      setOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setOrderBy(property);
      if (getDefaultOrderForColumn) {
        setOrder(getDefaultOrderForColumn(property));
      } else {
        setOrder('asc');
      }
    }
  };

  const colCount = columns.length;

  return (
    <DataListShell
      title={shell.title}
      titleIcon={shell.titleIcon ?? 'list'}
      accentColor={shell.accentColor ?? '#2563eb'}
      count={shell.count}
      toolbar={shell.toolbar}
      sx={shell.sx}
      className={shell.className}
    >
      {!loading &&
        rows.length > 0 &&
        typeof renderBeforeTable === 'function' &&
        renderBeforeTable({ paginatedRows, page, rowsPerPage })}
      <TableContainer
        component={Paper}
        elevation={0}
        sx={{ borderRadius: '8px', boxShadow: 'none', width: '100%', overflowX: 'auto', ...shell.tableContainerSx }}
      >
        {loading ? (
          loadingContent ?? (
            <Box p={4} display="flex" justifyContent="center">
              <CircularProgress />
            </Box>
          )
        ) : (
          <>
            <Table
              size={size}
              sx={{
                tableLayout: tableLayoutFixed ? 'fixed' : 'auto',
                width: '100%',
              }}
            >
              <TableHead sx={{ bgcolor: headerBg }}>
                <TableRow>
                  {columns.map((col) => {
                    const sortable = col.sortable !== false && col.id;
                    const cellSx = {
                      ...thBase,
                      ...(col.width ? { width: col.width } : {}),
                      ...(col.minWidth != null ? { minWidth: col.minWidth } : {}),
                      ...(col.align ? { textAlign: col.align } : {}),
                      ...col.headerSx,
                    };
                    return (
                      <TableCell
                        key={col.id}
                        sortDirection={orderBy === col.id ? order : false}
                        sx={cellSx}
                      >
                        {typeof col.renderHeader === 'function' ? (
                          col.renderHeader({ paginatedRows })
                        ) : sortable ? (
                          <TableSortLabel
                            active={orderBy === col.id}
                            direction={orderBy === col.id ? order : 'asc'}
                            onClick={() => handleRequestSort(col.id)}
                          >
                            {col.label}
                          </TableSortLabel>
                        ) : (
                          col.label
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={colCount}
                      align="center"
                      sx={{
                        py: emptyContent ? 2 : 6,
                        color: 'text.secondary',
                        border: 0,
                        verticalAlign: 'top',
                      }}
                    >
                      {emptyContent ?? emptyMessage}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedRows.map((row) => (
                    <TableRow
                      key={getRowKey(row)}
                      hover
                      selected={typeof isRowSelected === 'function' ? isRowSelected(row) : false}
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                      sx={{
                        cursor: onRowClick ? 'pointer' : undefined,
                        '&:last-child td, &:last-child th': { border: 0 },
                        ...(typeof getRowSx === 'function' ? getRowSx(row) : {}),
                      }}
                    >
                      {columns.map((col) => {
                        const cs =
                          typeof col.cellSx === 'function' ? col.cellSx(row) : col.cellSx ?? {};
                        return (
                          <TableCell
                            key={col.id}
                            align={col.align}
                            sx={{
                              verticalAlign: col.verticalAlign ?? 'top',
                              minWidth: 0,
                              overflow: 'hidden',
                              ...cs,
                            }}
                          >
                            {col.render(row)}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {rows.length > 0 ? (
              <TablePagination
                component="div"
                count={sortedRows.length}
                page={page}
                onPageChange={(_, newPage) => setPage(newPage)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10));
                  setPage(0);
                }}
                rowsPerPageOptions={rowsPerPageOptions}
                labelRowsPerPage="Linhas por página"
                labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
              />
            ) : null}
          </>
        )}
      </TableContainer>
    </DataListShell>
  );
};

export default DataListTable;
