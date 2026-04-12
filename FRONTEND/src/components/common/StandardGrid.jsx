import { useState, useCallback, useContext } from 'react';
import {
    Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    TableSortLabel, TablePagination, TextField, InputAdornment, IconButton, Tooltip,
} from '@mui/material';
import { ThemeContext } from '../../contexts/ThemeContext';
import LoadingOverlay from './LoadingOverlay';
import EmptyState from './EmptyState';
import TableSkeleton from './TableSkeleton';

/**
 * StandardGrid — Tabela padronizada com busca, ordenacao, paginacao e acoes.
 *
 * @param {Array}    columns - [{ key, label, render?, align?, width?, sortable? }]
 * @param {Array}    rows - Dados da tabela
 * @param {Array}    [actions] - [{ icon, tooltip, onClick(row), color?, show?(row) }]
 * @param {boolean}  [searchable=false] - Exibe campo de busca
 * @param {string}   [searchPlaceholder='Buscar...'] - Placeholder do campo de busca
 * @param {boolean}  [loading=false] - Estado de carregamento inicial
 * @param {boolean}  [switching=false] - Estado de carregamento em transicao (overlay)
 * @param {string}   [emptyTitle='Nenhum registro encontrado'] - Titulo do empty state
 * @param {string}   [emptyDescription] - Descricao do empty state
 * @param {boolean}  [stickyHeader=true] - Header fixo ao rolar
 * @param {Array}    [pageSizeOptions=[10, 25, 50]] - Opcoes de registros por pagina
 * @param {number}   [defaultPageSize=10] - Registros por pagina padrao
 * @param {object}   [sx] - Estilos adicionais para o container Paper
 */
const StandardGrid = ({
    columns = [],
    rows = [],
    actions,
    searchable = false,
    searchPlaceholder = 'Buscar...',
    loading = false,
    switching = false,
    emptyTitle = 'Nenhum registro encontrado',
    emptyDescription,
    stickyHeader = true,
    pageSizeOptions = [10, 25, 50],
    defaultPageSize = 10,
    sx = {},
}) => {
    const { mode } = useContext(ThemeContext);

    // Search state
    const [search, setSearch] = useState('');

    // Sort state
    const [orderBy, setOrderBy] = useState(null);
    const [orderDir, setOrderDir] = useState('asc');

    // Pagination state
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(defaultPageSize);

    // Theme
    const headerBg = mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#f8fafc';
    const borderColor = mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9';

    // Filter rows by search
    const filteredRows = useCallback(() => {
        if (!search.trim()) return rows;
        const term = search.toLowerCase();
        return rows.filter(row =>
            columns.some(col => {
                const val = row[col.key];
                return val != null && String(val).toLowerCase().includes(term);
            })
        );
    }, [rows, search, columns])();

    // Sort rows
    const sortedRows = useCallback(() => {
        if (!orderBy) return filteredRows;
        return [...filteredRows].sort((a, b) => {
            const aVal = a[orderBy] ?? '';
            const bVal = b[orderBy] ?? '';
            const cmp = String(aVal).localeCompare(String(bVal), 'pt-BR', { numeric: true });
            return orderDir === 'asc' ? cmp : -cmp;
        });
    }, [filteredRows, orderBy, orderDir])();

    // Paginate
    const paginatedRows = sortedRows.slice(page * pageSize, page * pageSize + pageSize);

    const handleSort = (key) => {
        if (orderBy === key) {
            setOrderDir(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setOrderBy(key);
            setOrderDir('asc');
        }
    };

    // Initial loading — full skeleton
    if (loading && rows.length === 0) {
        return (
            <Paper variant="outlined" sx={{ borderRadius: 4, overflow: 'hidden', ...sx }}>
                <TableSkeleton rows={defaultPageSize} columns={columns.map(() => '1fr')} />
            </Paper>
        );
    }

    return (
        <Paper
            variant="outlined"
            sx={{
                borderRadius: 4,
                overflow: 'hidden',
                position: 'relative',
                minHeight: 200,
                border: `1px solid ${borderColor}`,
                ...sx,
            }}
        >
            <LoadingOverlay loading={switching} />

            {/* Search bar */}
            {searchable && (
                <Box sx={{ p: 2, borderBottom: `1px solid ${borderColor}` }}>
                    <TextField
                        size="small"
                        fullWidth
                        placeholder={searchPlaceholder}
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <span className="material-icons-round" style={{ fontSize: 20, color: '#94a3b8' }}>search</span>
                                </InputAdornment>
                            ),
                            endAdornment: search && (
                                <InputAdornment position="end">
                                    <IconButton size="small" onClick={() => setSearch('')}>
                                        <span className="material-icons-round" style={{ fontSize: 18 }}>close</span>
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                </Box>
            )}

            {/* Table */}
            <TableContainer>
                <Table stickyHeader={stickyHeader} size="medium">
                    <TableHead>
                        <TableRow>
                            {columns.map((col) => (
                                <TableCell
                                    key={col.key}
                                    align={col.align || 'left'}
                                    sx={{
                                        bgcolor: headerBg,
                                        fontWeight: 700,
                                        fontSize: 12,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                        width: col.width,
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {col.sortable !== false ? (
                                        <TableSortLabel
                                            active={orderBy === col.key}
                                            direction={orderBy === col.key ? orderDir : 'asc'}
                                            onClick={() => handleSort(col.key)}
                                        >
                                            {col.label}
                                        </TableSortLabel>
                                    ) : (
                                        col.label
                                    )}
                                </TableCell>
                            ))}
                            {actions && actions.length > 0 && (
                                <TableCell align="right" sx={{ bgcolor: headerBg, fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', width: actions.length * 48 }}>
                                    Ações
                                </TableCell>
                            )}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {paginatedRows.length > 0 ? (
                            paginatedRows.map((row, rowIdx) => (
                                <TableRow key={row.id || rowIdx} hover>
                                    {columns.map((col) => (
                                        <TableCell key={col.key} align={col.align || 'left'}>
                                            {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '-')}
                                        </TableCell>
                                    ))}
                                    {actions && actions.length > 0 && (
                                        <TableCell align="right">
                                            <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                                                {actions.filter(a => !a.show || a.show(row)).map((action, aIdx) => (
                                                    <Tooltip key={aIdx} title={action.tooltip || ''}>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => action.onClick(row)}
                                                            sx={{
                                                                color: action.color || '#64748b',
                                                                '&:hover': { bgcolor: `${action.color || '#64748b'}15` }
                                                            }}
                                                        >
                                                            <span className="material-icons-round" style={{ fontSize: 20 }}>{action.icon}</span>
                                                        </IconButton>
                                                    </Tooltip>
                                                ))}
                                            </Box>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length + (actions ? 1 : 0)} sx={{ border: 0 }}>
                                    <EmptyState
                                        title={search ? 'Nenhum resultado para a busca' : emptyTitle}
                                        description={search ? `Nenhum registro encontrado para "${search}".` : emptyDescription}
                                        compact
                                    />
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Pagination */}
            {sortedRows.length > pageSizeOptions[0] && (
                <TablePagination
                    component="div"
                    count={sortedRows.length}
                    page={page}
                    onPageChange={(_, p) => setPage(p)}
                    rowsPerPage={pageSize}
                    onRowsPerPageChange={(e) => { setPageSize(parseInt(e.target.value, 10)); setPage(0); }}
                    rowsPerPageOptions={pageSizeOptions}
                    labelRowsPerPage="Por página:"
                    labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
                    sx={{ borderTop: `1px solid ${borderColor}` }}
                />
            )}
        </Paper>
    );
};

export default StandardGrid;
