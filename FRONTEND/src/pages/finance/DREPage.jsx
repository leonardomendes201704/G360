import { useState, useEffect, useContext, useMemo } from 'react';
import {
    Box, Typography, useTheme, Select, MenuItem, Skeleton,
    IconButton, Collapse, Paper, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Chip
} from '@mui/material';
import { KeyboardArrowDown, KeyboardArrowUp, TrendingUp, TrendingDown, AccountBalance } from '@mui/icons-material';
import { BarChart } from '@mui/x-charts/BarChart';
import { ThemeContext } from '../../contexts/ThemeContext';
import { getMonthlyEvolution, getDREDetails } from '../../services/finance-dashboard.service';
import fiscalYearService from '../../services/fiscal-year.service';
import { getReferenceAccounts, getReferenceSuppliers } from '../../services/reference.service';

// --- HELPER ---
const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
const formatPercent = (val) => (!isFinite(val) || isNaN(val)) ? '-' : `${val.toFixed(1)}%`;
const shortMonths = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const fullMonths = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

// --- EXPANDABLE ROW ---
const DRERow = ({ row, index, year, filters, mode }) => {
    const [open, setOpen] = useState(false);
    const [details, setDetails] = useState(null);
    const [loadingDetails, setLoadingDetails] = useState(false);

    const handleExpand = async () => {
        setOpen(!open);
        if (!open && !details) {
            setLoadingDetails(true);
            try {
                const data = await getDREDetails(year, index, filters);
                setDetails(data);
            } catch (error) {
                console.error("Error fetching details", error);
            } finally {
                setLoadingDetails(false);
            }
        }
    };

    const varColor = row.variation >= 0 ? '#10b981' : '#f43f5e';
    const borderColor = mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)';
    const cellSx = { borderBottom: `1px solid ${borderColor}`, py: 1.8, fontSize: '13px' };

    return (
        <>
            <TableRow
                hover
                sx={{
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    '&:hover': { bgcolor: mode === 'dark' ? 'rgba(37, 99, 235, 0.06)' : 'rgba(37, 99, 235, 0.04)' }
                }}
                onClick={handleExpand}
            >
                <TableCell sx={{ ...cellSx, width: 40, px: 1.5 }}>
                    <IconButton size="small" sx={{ color: mode === 'dark' ? '#64748b' : '#94a3b8' }}>
                        {open ? <KeyboardArrowUp fontSize="small" /> : <KeyboardArrowDown fontSize="small" />}
                    </IconButton>
                </TableCell>
                <TableCell sx={{ ...cellSx, fontWeight: 600, color: mode === 'dark' ? '#e2e8f0' : '#1e293b' }}>{row.month}</TableCell>
                <TableCell align="right" sx={{ ...cellSx, color: '#2563eb', fontWeight: 500 }}>{formatCurrency(row.planned)}</TableCell>
                <TableCell align="right" sx={{ ...cellSx, color: mode === 'dark' ? '#f1f5f9' : '#0f172a', fontWeight: 500 }}>{formatCurrency(row.actual)}</TableCell>
                <TableCell align="right" sx={{ ...cellSx, fontWeight: 600, color: varColor }}>
                    {row.variation >= 0 ? '+' : ''}{formatCurrency(row.variation)}
                </TableCell>
                <TableCell align="right" sx={{ ...cellSx }}>
                    <Chip
                        label={row.variationPercent === '-' ? '-' : `${row.variationPercent >= 0 ? '+' : ''}${row.variationPercent.toFixed(1)}%`}
                        size="small"
                        sx={{
                            height: 24, fontSize: '11px', fontWeight: 700,
                            bgcolor: `${varColor}15`, color: varColor,
                            border: `1px solid ${varColor}30`
                        }}
                    />
                </TableCell>
            </TableRow>
            <TableRow>
                <TableCell style={{ paddingBottom: 0, paddingTop: 0, borderBottom: open ? `1px solid ${borderColor}` : 'none' }} colSpan={6}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box sx={{
                            my: 2, p: 2.5,
                            bgcolor: mode === 'dark' ? 'rgba(15, 23, 42, 0.5)' : 'rgba(248, 250, 252, 1)',
                            borderRadius: '12px',
                            border: `1px solid ${borderColor}`
                        }}>
                            {loadingDetails ? (
                                <Skeleton variant="rectangular" height={100} sx={{ borderRadius: '8px' }} />
                            ) : details ? (
                                <Box sx={{ display: 'grid', gridTemplateColumns: { md: '1fr 1fr' }, gap: 3 }}>
                                    <Box>
                                        <Typography variant="subtitle2" gutterBottom sx={{ color: '#f43f5e', fontWeight: 700, letterSpacing: '0.05em', fontSize: '11px', textTransform: 'uppercase' }}>
                                            Lançamentos Realizados (Despesas)
                                        </Typography>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell sx={{ fontWeight: 600, fontSize: '11px', color: mode === 'dark' ? '#64748b' : '#94a3b8' }}>Descrição</TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 600, fontSize: '11px', color: mode === 'dark' ? '#64748b' : '#94a3b8' }}>Valor</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {details.expenses.length === 0 ? (
                                                    <TableRow><TableCell colSpan={2} align="center" sx={{ color: '#64748b', fontStyle: 'italic', py: 2 }}>Nenhum lançamento</TableCell></TableRow>
                                                ) : details.expenses.map((exp) => (
                                                    <TableRow key={exp.id}>
                                                        <TableCell sx={{ fontSize: '13px' }}>
                                                            <Box>{exp.description || 'Sem descrição'}</Box>
                                                            <Box sx={{ fontSize: '10px', color: '#64748b' }}>{exp.supplier?.name} • {exp.costCenter?.name}</Box>
                                                        </TableCell>
                                                        <TableCell align="right" sx={{ fontSize: '13px', fontWeight: 500 }}>{formatCurrency(exp.amount)}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </Box>
                                    <Box>
                                        <Typography variant="subtitle2" gutterBottom sx={{ color: '#2563eb', fontWeight: 700, letterSpacing: '0.05em', fontSize: '11px', textTransform: 'uppercase' }}>
                                            Itens Orçados (Previsto)
                                        </Typography>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell sx={{ fontWeight: 600, fontSize: '11px', color: mode === 'dark' ? '#64748b' : '#94a3b8' }}>Conta/Centro</TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 600, fontSize: '11px', color: mode === 'dark' ? '#64748b' : '#94a3b8' }}>Valor</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {details.budgetItems.length === 0 ? (
                                                    <TableRow><TableCell colSpan={2} align="center" sx={{ color: '#64748b', fontStyle: 'italic', py: 2 }}>Nenhum orçamento</TableCell></TableRow>
                                                ) : details.budgetItems.map((item) => (
                                                    <TableRow key={item.id}>
                                                        <TableCell sx={{ fontSize: '13px' }}>
                                                            <Box>{item.account?.name}</Box>
                                                            <Box sx={{ fontSize: '10px', color: '#64748b' }}>{item.costCenter?.name}</Box>
                                                        </TableCell>
                                                        <TableCell align="right" sx={{ fontSize: '13px', fontWeight: 500 }}>{formatCurrency(item.planned)}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </Box>
                                </Box>
                            ) : (
                                <Typography sx={{ color: '#64748b' }}>Sem detalhes.</Typography>
                            )}
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        </>
    );
};

// --- MAIN PAGE ---
const DREPage = () => {
    const { mode } = useContext(ThemeContext);
    const theme = useTheme();

    const [year, setYear] = useState(new Date().getFullYear());
    const [fiscalYears, setFiscalYears] = useState([]);
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [filters, setFilters] = useState({ accountId: '', supplierId: '' });
    const [lists, setLists] = useState({ accounts: [], suppliers: [] });

    useEffect(() => {
        const loadInit = async () => {
            try {
                const [years, accs, sups] = await Promise.all([
                    fiscalYearService.getAll(),
                    getReferenceAccounts(),
                    getReferenceSuppliers()
                ]);
                setFiscalYears(years.sort((a, b) => b.year - a.year));
                setLists({ accounts: accs, suppliers: sups });
            } catch (e) {
                console.error("Erro ao carregar dados iniciais", e);
            }
        };
        loadInit();
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const evolution = await getMonthlyEvolution(year, filters);
                setData(evolution);
            } catch (error) {
                console.error("Erro ao carregar DRE", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [year, filters]);

    // Computed
    const rows = useMemo(() => fullMonths.map((m, i) => {
        const planned = data?.planned[i] || 0;
        const actual = data?.actual[i] || 0;
        const variation = planned - actual;
        const variationPercent = planned > 0 ? (variation / planned) * 100 : 0;
        return { month: m, planned, actual, variation, variationPercent };
    }), [data]);

    const totals = useMemo(() => {
        const tp = rows.reduce((a, r) => a + r.planned, 0);
        const ta = rows.reduce((a, r) => a + r.actual, 0);
        const tv = tp - ta;
        const tvp = tp > 0 ? (tv / tp) * 100 : 0;
        return { planned: tp, actual: ta, variation: tv, variationPercent: tvp };
    }, [rows]);

    // Chart data
    const chartData = useMemo(() => shortMonths.map((label, i) => ({
        month: label,
        planned: data?.planned[i] || 0,
        actual: data?.actual[i] || 0,
    })), [data]);

    // Theming
    const cardBg = mode === 'dark' ? 'rgba(22, 29, 38, 0.5)' : '#FFFFFF';
    const borderColor = mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.08)';
    const cardShadow = mode === 'dark' ? 'none' : '0 4px 6px -1px rgba(0, 0, 0, 0.07)';
    const textPrimary = mode === 'dark' ? '#f1f5f9' : theme.palette.text.primary;
    const textSecondary = mode === 'dark' ? '#64748b' : theme.palette.text.secondary;
    const surfaceBg = mode === 'dark' ? '#1c2632' : '#f8fafc';
    const selectSx = {
        minWidth: 180,
        bgcolor: surfaceBg,
        borderRadius: '10px',
        color: textPrimary,
        '& .MuiOutlinedInput-notchedOutline': { borderColor },
        '& .MuiSelect-icon': { color: textSecondary },
        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(37, 99, 235, 0.3)' },
    };

    if (loading && !data) return <Skeleton variant="rectangular" height={400} sx={{ borderRadius: '16px' }} />;

    const kpiCards = [
        { label: 'Total Orçado', value: formatCurrency(totals.planned), icon: '💰', color: '#2563eb', bg: 'rgba(37, 99, 235, 0.12)', border: 'rgba(37, 99, 235, 0.2)' },
        { label: 'Total Realizado', value: formatCurrency(totals.actual), icon: '📊', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)', border: 'rgba(59, 130, 246, 0.2)' },
        { label: 'Economia', value: formatCurrency(totals.variation), icon: totals.variation >= 0 ? '📈' : '📉', color: totals.variation >= 0 ? '#10b981' : '#f43f5e', bg: totals.variation >= 0 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.12)', border: totals.variation >= 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)' },
        { label: 'Margem', value: formatPercent(totals.variationPercent), icon: '🎯', color: totals.variationPercent >= 0 ? '#10b981' : '#f43f5e', bg: totals.variationPercent >= 0 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.12)', border: totals.variationPercent >= 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)' },
    ];

    return (
        <Box>
            {/* Header */}
            <Box sx={{
                mb: 3, p: 3, borderRadius: '16px', background: cardBg,
                backdropFilter: mode === 'dark' ? 'blur(10px)' : 'none',
                border: `1px solid ${borderColor}`, boxShadow: cardShadow,
                display: 'flex', justifyContent: 'space-between',
                alignItems: { xs: 'flex-start', md: 'center' },
                flexDirection: { xs: 'column', md: 'row' }, gap: 2
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{
                        width: 48, height: 48, borderRadius: '12px',
                        background: 'rgba(37, 99, 235, 0.15)',
                        border: '1px solid rgba(37, 99, 235, 0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb'
                    }}>
                        <AccountBalance />
                    </Box>
                    <Box>
                        <Typography sx={{ fontSize: '20px', fontWeight: 600, color: textPrimary }}>
                            DRE — Demonstrativo de Resultados
                        </Typography>
                        <Typography sx={{ color: textSecondary, fontSize: '14px' }}>
                            Visão consolidada mensal de Orçado vs Realizado
                        </Typography>
                    </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                    <Select value={filters.accountId} onChange={(e) => setFilters(p => ({ ...p, accountId: e.target.value }))}
                        displayEmpty size="small" sx={selectSx}>
                        <MenuItem value="">Todas as Contas</MenuItem>
                        {lists.accounts.map(a => <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>)}
                    </Select>
                    <Select value={filters.supplierId} onChange={(e) => setFilters(p => ({ ...p, supplierId: e.target.value }))}
                        displayEmpty size="small" sx={selectSx}>
                        <MenuItem value="">Todos Fornecedores</MenuItem>
                        {lists.suppliers.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                    </Select>
                    <Select value={year} onChange={(e) => setYear(Number(e.target.value))} size="small"
                        sx={{ ...selectSx, minWidth: 100 }}>
                        {fiscalYears.map(fy => <MenuItem key={fy.id} value={fy.year}>{fy.year}</MenuItem>)}
                    </Select>
                </Box>
            </Box>

            {/* KPI Cards */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2.5, mb: 3 }}>
                {kpiCards.map((kpi) => (
                    <Box key={kpi.label} sx={{
                        p: 2.5, borderRadius: '16px', background: cardBg,
                        backdropFilter: mode === 'dark' ? 'blur(10px)' : 'none',
                        border: `1px solid ${borderColor}`, boxShadow: cardShadow,
                        transition: 'all 0.2s ease',
                        '&:hover': { transform: 'translateY(-4px)', borderColor: kpi.border }
                    }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                            <Box sx={{
                                width: 40, height: 40, borderRadius: '10px',
                                background: kpi.bg, border: `1px solid ${kpi.border}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '18px'
                            }}>
                                {kpi.icon}
                            </Box>
                            <Typography sx={{ fontSize: '12px', color: textSecondary, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                {kpi.label}
                            </Typography>
                        </Box>
                        <Typography sx={{ fontSize: '1.4rem', fontWeight: 700, color: kpi.color, lineHeight: 1.2 }}>
                            {kpi.value}
                        </Typography>
                    </Box>
                ))}
            </Box>

            {/* Bar Chart */}
            <Box sx={{
                mb: 3, p: 3, borderRadius: '16px', background: cardBg,
                backdropFilter: mode === 'dark' ? 'blur(10px)' : 'none',
                border: `1px solid ${borderColor}`, boxShadow: cardShadow,
                overflow: 'hidden'
            }}>
                <Typography sx={{ fontSize: '16px', fontWeight: 600, color: textPrimary, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <span className="material-icons-round" style={{ fontSize: '20px', color: '#2563eb' }}>bar_chart</span>
                    Evolução Mensal
                </Typography>
                <Box sx={{ width: '100%', height: 280 }}>
                    <BarChart
                        dataset={chartData}
                        xAxis={[{ scaleType: 'band', dataKey: 'month', tickLabelStyle: { fill: textSecondary, fontSize: 11 } }]}
                        yAxis={[{ tickLabelStyle: { fill: textSecondary, fontSize: 11 }, valueFormatter: (v) => `${(v / 1000).toFixed(0)}k` }]}
                        series={[
                            { dataKey: 'planned', label: 'Orçado', color: '#2563eb', valueFormatter: (v) => formatCurrency(v) },
                            { dataKey: 'actual', label: 'Realizado', color: '#3b82f6', valueFormatter: (v) => formatCurrency(v) },
                        ]}
                        height={280}
                        margin={{ left: 60, right: 30, top: 30, bottom: 30 }}
                        borderRadius={6}
                        slotProps={{
                            legend: {
                                labelStyle: { fill: textSecondary, fontSize: 12 },
                                padding: { top: 0 }
                            }
                        }}
                        sx={{
                            '& .MuiChartsAxis-line': { stroke: borderColor },
                            '& .MuiChartsAxis-tick': { stroke: borderColor },
                            '& .MuiChartsGrid-line': { stroke: borderColor },
                        }}
                    />
                </Box>
            </Box>

            {/* Table */}
            <Box sx={{
                borderRadius: '16px', background: cardBg,
                backdropFilter: mode === 'dark' ? 'blur(10px)' : 'none',
                border: `1px solid ${borderColor}`, boxShadow: cardShadow,
                overflow: 'hidden'
            }}>
                <Box sx={{ p: 3, borderBottom: `1px solid ${borderColor}` }}>
                    <Typography sx={{ fontSize: '16px', fontWeight: 600, color: textPrimary, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <span className="material-icons-round" style={{ fontSize: '20px', color: '#2563eb' }}>table_chart</span>
                        Detalhamento Mensal
                    </Typography>
                </Box>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ bgcolor: surfaceBg }}>
                                <TableCell sx={{ width: 40 }} />
                                {['Mês', 'Orçado', 'Realizado', 'Variação (R$)', 'Variação (%)'].map((h, i) => (
                                    <TableCell key={h} align={i > 0 ? 'right' : 'left'} sx={{
                                        fontWeight: 700, fontSize: '11px', textTransform: 'uppercase',
                                        letterSpacing: '0.08em', color: textSecondary, py: 1.5,
                                        borderBottom: `1px solid ${borderColor}`
                                    }}>
                                        {h}
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rows.map((row, index) => (
                                <DRERow key={row.month} row={row} index={index} year={year} filters={filters} mode={mode} />
                            ))}
                            {/* Totals */}
                            <TableRow sx={{
                                bgcolor: mode === 'dark' ? 'rgba(37, 99, 235, 0.08)' : 'rgba(37, 99, 235, 0.04)',
                                '& td': { borderBottom: 'none' }
                            }}>
                                <TableCell />
                                <TableCell sx={{ fontWeight: 800, fontSize: '14px', color: textPrimary, py: 2 }}>TOTAL ANUAL</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 800, fontSize: '14px', color: '#2563eb' }}>{formatCurrency(totals.planned)}</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 800, fontSize: '14px', color: textPrimary }}>{formatCurrency(totals.actual)}</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 800, fontSize: '14px', color: totals.variation >= 0 ? '#10b981' : '#f43f5e' }}>
                                    {totals.variation >= 0 ? '+' : ''}{formatCurrency(totals.variation)}
                                </TableCell>
                                <TableCell align="right" sx={{ py: 2 }}>
                                    <Chip
                                        icon={totals.variationPercent >= 0 ? <TrendingUp sx={{ fontSize: 16 }} /> : <TrendingDown sx={{ fontSize: 16 }} />}
                                        label={formatPercent(totals.variationPercent)}
                                        size="small"
                                        sx={{
                                            fontWeight: 700, fontSize: '12px',
                                            bgcolor: totals.variationPercent >= 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                                            color: totals.variationPercent >= 0 ? '#10b981' : '#f43f5e',
                                            border: `1px solid ${totals.variationPercent >= 0 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
                                            '& .MuiChip-icon': { color: 'inherit' }
                                        }}
                                    />
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>
        </Box>
    );
};

export default DREPage;
