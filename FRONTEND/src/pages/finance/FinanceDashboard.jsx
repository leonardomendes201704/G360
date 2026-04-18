import { useEffect, useState, useContext, useMemo } from 'react';
import { Box, Skeleton, Button, Typography, Paper, useTheme } from '@mui/material';
import { LineChart } from '@mui/x-charts/LineChart';
import { PieChart } from '@mui/x-charts/PieChart';
import { ThemeContext } from '../../contexts/ThemeContext';
import { AuthContext } from '../../contexts/AuthContext';
import DashboardCustomizer from '../../components/dashboard/DashboardCustomizer';
import StatsCard from '../../components/common/StatsCard';
import KpiGrid from '../../components/common/KpiGrid';

import {
    getBudgetOverview, getMonthlyEvolution, getInsights, getCostCenterPerformance
} from '../../services/finance-dashboard.service';
import { getReferenceSuppliers, getReferenceAccounts, getReferenceCostCenters } from '../../services/reference.service';
import fiscalYearService from '../../services/fiscal-year.service';

// ── Finance widget personalization ────────────────────────────────────────────
const FINANCE_WIDGETS_KEY = 'g360_finance_widgets';
const FINANCE_WIDGET_DEFS = [
    { id: 'kpis', label: 'KPIs Financeiros', icon: 'account_balance_wallet', color: '#10b981', enabled: true },
    { id: 'evolution', label: 'Evolução Orçado/Realizado', icon: 'show_chart', color: '#2563eb', enabled: true },
    { id: 'alerts', label: 'Alertas & Forecast', icon: 'warning', color: '#f59e0b', enabled: true },
    { id: 'performance', label: 'Performance por CC', icon: 'leaderboard', color: '#8b5cf6', enabled: true },
];

const loadFinanceWidgets = () => {
    try {
        const saved = JSON.parse(localStorage.getItem(FINANCE_WIDGETS_KEY) || '{}');
        return FINANCE_WIDGET_DEFS.map(w => ({ ...w, enabled: saved[w.id] !== undefined ? saved[w.id] : w.enabled }));
    } catch { return [...FINANCE_WIDGET_DEFS]; }
};

// ─────────────────────────────────────────────────────────────────────────────

const FinanceDashboard = () => {
    const [year, setYear] = useState(new Date().getFullYear());
    const [loading, setLoading] = useState(true);
    const { mode } = useContext(ThemeContext);
    const { user, hasPermission } = useContext(AuthContext);
    const theme = useTheme();
    const isDark = mode === 'dark';

    // Personalizable sections
    const [finWidgets, setFinWidgets] = useState(() => loadFinanceWidgets());
    const isOn = (id) => finWidgets.find(w => w.id === id)?.enabled ?? true;
    const handleFinWidgetsChange = (updated) => {
        setFinWidgets(updated);
        const map = {};
        updated.forEach(w => { map[w.id] = w.enabled; });
        localStorage.setItem(FINANCE_WIDGETS_KEY, JSON.stringify(map));
    };

    // Filters
    const [filters, setFilters] = useState({ accountId: '', costCenterId: '', supplierId: '' });
    const [lists, setLists] = useState({ accounts: [], costCenters: [], suppliers: [], fiscalYears: [] });

    // Filtered Cost Centers (Manager Logic)
    const availableCostCenters = useMemo(() => {
        if (!user || !lists.costCenters.length) return [];
        if (hasPermission('FINANCE', 'READ')) return lists.costCenters;
        return lists.costCenters.filter(cc => cc.managerId === user.id);
    }, [user, lists.costCenters, hasPermission]);

    // Data States
    const [overview, setOverview] = useState({ totalBudget: 0, totalSpent: 0, available: 0, consumption: 0 });
    const [evolution, setEvolution] = useState({ labels: [], planned: [], actual: [] });
    const [insights, setInsights] = useState({ alerts: [], savings: [] });
    const [ccData, setCcData] = useState([]);

    // Theme-aware styles
    const cardStyle = {
        bgcolor: isDark ? 'background.paper' : '#FFFFFF',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '8px',
        padding: '24px',
        boxShadow: isDark ? 'none' : '0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
    };

    const filterSelectStyle = {
        background: isDark ? '#1c2632' : '#FFFFFF',
        border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.06)' : theme.palette.divider}`,
        borderRadius: '8px',
        padding: '12px 16px',
        color: isDark ? '#f1f5f9' : theme.palette.text.primary,
        fontSize: '14px',
        minWidth: '180px',
        outline: 'none',
        cursor: 'pointer'
    };

    const labelColor = isDark ? '#64748b' : theme.palette.text.secondary;
    const textPrimaryColor = isDark ? '#f1f5f9' : theme.palette.text.primary;
    const textSecondaryColor = isDark ? '#94a3b8' : theme.palette.text.secondary;
    const surfaceColor = isDark ? '#1c2632' : theme.palette.action.hover;

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const [ov, ev, ins, cc] = await Promise.all([
                    getBudgetOverview(year, filters),
                    getMonthlyEvolution(year, filters),
                    getInsights(year, filters),
                    getCostCenterPerformance(year, filters)
                ]);
                setOverview(ov || { totalBudget: 0, totalSpent: 0, available: 0, consumption: 0 });
                setEvolution(ev || { labels: [], planned: [], actual: [] });
                setInsights(ins || { alerts: [], savings: [] });
                setCcData(cc || []);
            } catch (error) { console.error("Erro dashboard:", error); }
            finally { setLoading(false); }
        };
        loadData();
    }, [year, filters]);

    useEffect(() => {
        const loadLists = async () => {
            try {
                const yearsData = await fiscalYearService.getAll();
                const [acc, cc, sup] = await Promise.all([getReferenceAccounts(), getReferenceCostCenters(), getReferenceSuppliers()]);
                const sortedYears = (Array.isArray(yearsData) ? yearsData : []).sort((a, b) => b.year - a.year);
                setLists({ accounts: acc, costCenters: cc, suppliers: sup, fiscalYears: sortedYears });
            } catch (e) { console.error("Erro ao carregar listas", e); }
        };
        loadLists();
    }, []);

    const handleFilterChange = (field, value) => setFilters(prev => ({ ...prev, [field]: value }));
    const clearFilters = () => setFilters({ accountId: '', costCenterId: '', supplierId: '' });

    const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
    const formatShort = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: "compact", maximumFractionDigits: 1 }).format(val);

    // ── Computed extra KPIs ──────────────────────────────────────────────
    const burnRateDaily = insights.forecast?.dailyBurnRate || 0;
    const daysUntilEmpty = burnRateDaily > 0 && overview.available > 0
        ? Math.floor(overview.available / burnRateDaily)
        : null;
    const daysColor = daysUntilEmpty === null ? '#94a3b8'
        : daysUntilEmpty > 90 ? '#10b981'
            : daysUntilEmpty > 30 ? '#f59e0b'
                : '#ef4444';
    const ccOverrun = ccData.filter(c => c.actual > c.planned).length;

    // KPI Data (original 5 cards)
    const kpis = [
        { title: 'Orçamento Aprovado', value: formatCurrency(overview.totalBudget), icon: 'account_balance_wallet', color: 'emerald', badge: `${overview.consumption.toFixed(0)}% Consumido` },
        { title: 'Realizado (YTD)', value: formatCurrency(overview.totalSpent), icon: 'trending_up', color: 'cyan', badge: overview.totalSpent > 0 ? 'Atualizado' : 'Nenhum lançamento' },
        { title: 'Saldo Disponível', value: formatCurrency(Math.abs(overview.available)), icon: 'savings', color: 'indigo', badge: overview.available >= 0 ? `${((overview.available / overview.totalBudget) * 100 || 0).toFixed(0)}% disponível` : 'Estouro' },
        { title: 'Variação (Saldo)', value: overview.totalBudget > 0 ? `${((Math.abs(overview.available) / overview.totalBudget) * 100).toFixed(1)}%` : '0%', icon: 'analytics', color: 'amber', badge: overview.available >= 0 ? 'Economia' : 'Desvio' },
        { title: 'Não Previsto', value: formatCurrency(overview.unplannedSpent || 0), icon: 'warning', color: 'danger', badge: overview.totalSpent > 0 ? `${((overview.unplannedSpent / overview.totalSpent) * 100).toFixed(1)}% do Realizado` : '0%' }
    ];

    const colorMap = {
        emerald: { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981', accent: '#10b981' },
        cyan: { bg: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4', accent: '#06b6d4' },
        indigo: { bg: 'rgba(37, 99, 235, 0.15)', color: '#2563eb', accent: '#2563eb' },
        amber: { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', accent: '#f59e0b' },
        danger: { bg: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e', accent: '#f43f5e' }
    };

    const pieColors = ['#10b981', '#06b6d4', '#2563eb', '#f59e0b', '#f43f5e'];
    const pieData = ccData.slice(0, 5).map((c, i) => ({ id: i, value: c.actual, label: c.name, color: pieColors[i] }));

    if (loading) return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Skeleton variant="rectangular" height={80} sx={{ borderRadius: '8px', bgcolor: surfaceColor }} />
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 3 }}>
                {[1, 2, 3, 4].map(i => <Skeleton key={i} variant="rectangular" height={140} sx={{ borderRadius: '8px', bgcolor: surfaceColor }} />)}
            </Box>
        </Box>
    );

    return (
        <Box>
            {/* Filter Bar */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 4, alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-end' }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span style={{ fontSize: '11px', color: labelColor, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ano Fiscal</span>
                        <select style={filterSelectStyle} value={year} onChange={(e) => setYear(Number(e.target.value))}>
                            {lists.fiscalYears.map(y => <option key={y.id} value={y.year}>{y.year}</option>)}
                        </select>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span style={{ fontSize: '11px', color: labelColor, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Conta Contábil</span>
                        <select style={filterSelectStyle} value={filters.accountId} onChange={(e) => handleFilterChange('accountId', e.target.value)}>
                            <option value="">Todas as Contas</option>
                            {lists.accounts.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                        </select>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span style={{ fontSize: '11px', color: labelColor, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Centro de Custo</span>
                        <select style={filterSelectStyle} value={filters.costCenterId} onChange={(e) => handleFilterChange('costCenterId', e.target.value)}>
                            <option value="">{hasPermission('FINANCE', 'READ') ? 'Todos os Centros' : 'Meus Centros de Custo'}</option>
                            {availableCostCenters.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                        </select>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span style={{ fontSize: '11px', color: labelColor, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Fornecedor</span>
                        <select style={filterSelectStyle} value={filters.supplierId} onChange={(e) => handleFilterChange('supplierId', e.target.value)}>
                            <option value="">Todos</option>
                            {lists.suppliers.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                        </select>
                    </Box>
                    <Button onClick={clearFilters} sx={{
                        padding: '12px 16px', bgcolor: 'transparent',
                        border: '1px solid', borderColor: 'divider', borderRadius: '8px',
                        color: textSecondaryColor, fontSize: '14px', textTransform: 'none',
                        '&:hover': { bgcolor: 'action.hover' }
                    }}>
                        <span className="material-icons-round" style={{ fontSize: '18px', marginRight: '6px' }}>close</span>
                        Limpar
                    </Button>
                </Box>
                {/* ⚙️ Customizer button */}
                <DashboardCustomizer widgets={finWidgets} onWidgetsChange={handleFinWidgetsChange} isDark={isDark} />
            </Box>

            {/* KPI Grid */}
            {isOn('kpis') && (
                <Box sx={{ mb: 3 }}>
                    {/* ── Forecast Banner + Days Until Empty + CC Overrun ────────── */}
                    {(burnRateDaily > 0 || ccOverrun > 0) && (
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr 1fr' }, gap: 2, mb: 2 }}>
                            {/* Forecast Banner */}
                            <Box sx={{
                                p: 2.5, borderRadius: '8px', position: 'relative', overflow: 'hidden',
                                background: insights.forecast?.status === 'RISK'
                                    ? 'linear-gradient(135deg, rgba(244,63,94,0.12) 0%, rgba(244,63,94,0.06) 100%)'
                                    : 'linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(16,185,129,0.06) 100%)',
                                border: `1px solid ${insights.forecast?.status === 'RISK' ? 'rgba(244,63,94,0.3)' : 'rgba(16,185,129,0.3)'}`,
                                display: 'flex', alignItems: 'center', gap: 2,
                            }}>
                                <Box sx={{
                                    width: 44, height: 44, borderRadius: '8px',
                                    bgcolor: insights.forecast?.status === 'RISK' ? 'rgba(244,63,94,0.15)' : 'rgba(16,185,129,0.15)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                }}>
                                    <span className="material-icons-round" style={{ color: insights.forecast?.status === 'RISK' ? '#f43f5e' : '#10b981', fontSize: '22px' }}>timelapse</span>
                                </Box>
                                <Box sx={{ flex: 1 }}>
                                    <Typography sx={{ fontSize: '11px', color: labelColor, textTransform: 'uppercase', letterSpacing: '0.5px', mb: 0.5 }}>Forecast Anual</Typography>
                                    <Typography sx={{ fontSize: '20px', fontWeight: 700, color: textPrimaryColor, lineHeight: 1 }}>
                                        {insights.forecast ? formatCurrency(insights.forecast.projectedTotal) : '–'}
                                    </Typography>
                                    <Typography sx={{ fontSize: '12px', color: labelColor, mt: 0.3 }}>
                                        Burn rate: {burnRateDaily > 0 ? formatShort(burnRateDaily) : '–'}/dia
                                    </Typography>
                                </Box>
                                <Box sx={{
                                    px: 1.5, py: 0.5, borderRadius: '8px', fontSize: '11px', fontWeight: 700,
                                    bgcolor: insights.forecast?.status === 'RISK' ? 'rgba(244,63,94,0.15)' : 'rgba(16,185,129,0.15)',
                                    color: insights.forecast?.status === 'RISK' ? '#f43f5e' : '#10b981', flexShrink: 0,
                                }}>
                                    {insights.forecast?.status === 'RISK' ? 'RISCO' : '✔ OK'}
                                </Box>
                            </Box>

                            {/* Days Until Empty */}
                            <Box sx={{
                                p: 2.5, borderRadius: '8px',
                                bgcolor: isDark ? 'background.paper' : '#fff',
                                border: `1px solid ${daysColor}30`,
                                position: 'relative', overflow: 'hidden',
                                '&::before': { content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: '3px', bgcolor: daysColor }
                            }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                    <Box sx={{ width: 28, height: 28, borderRadius: '8px', bgcolor: `${daysColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <span className="material-icons-round" style={{ color: daysColor, fontSize: '15px' }}>hourglass_bottom</span>
                                    </Box>
                                    <Typography sx={{ fontSize: '11px', color: labelColor, fontWeight: 600, textTransform: 'uppercase' }}>Dias até Esgotar</Typography>
                                </Box>
                                <Typography sx={{ fontSize: '32px', fontWeight: 700, color: daysColor, lineHeight: 1 }}>
                                    {daysUntilEmpty !== null ? daysUntilEmpty : '∞'}
                                </Typography>
                                <Typography sx={{ fontSize: '11px', color: labelColor, mt: 0.5 }}>dias de saldo</Typography>
                            </Box>

                            {/* CCs with overrun */}
                            <Box sx={{
                                p: 2.5, borderRadius: '8px',
                                bgcolor: isDark ? 'background.paper' : '#fff',
                                border: `1px solid ${ccOverrun > 0 ? 'rgba(244,63,94,0.3)' : 'rgba(16,185,129,0.3)'}`,
                                position: 'relative', overflow: 'hidden',
                                '&::before': { content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: '3px', bgcolor: ccOverrun > 0 ? '#f43f5e' : '#10b981' }
                            }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                    <Box sx={{ width: 28, height: 28, borderRadius: '8px', bgcolor: ccOverrun > 0 ? 'rgba(244,63,94,0.12)' : 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <span className="material-icons-round" style={{ color: ccOverrun > 0 ? '#f43f5e' : '#10b981', fontSize: '15px' }}>domain_disabled</span>
                                    </Box>
                                    <Typography sx={{ fontSize: '11px', color: labelColor, fontWeight: 600, textTransform: 'uppercase' }}>CCs com Estouro</Typography>
                                </Box>
                                <Typography sx={{ fontSize: '32px', fontWeight: 700, color: ccOverrun > 0 ? '#f43f5e' : '#10b981', lineHeight: 1 }}>{ccOverrun}</Typography>
                                <Typography sx={{ fontSize: '11px', color: labelColor, mt: 0.5 }}>de {ccData.length} centros</Typography>
                            </Box>
                        </Box>
                    )}

                    <KpiGrid maxColumns={5}>
                        {kpis.map((kpi) => {
                            const colors = colorMap[kpi.color];
                            return (
                                <StatsCard
                                    key={kpi.title}
                                    title={kpi.title}
                                    value={kpi.value}
                                    iconName={kpi.icon}
                                    hexColor={colors.accent}
                                    subtitle={kpi.badge}
                                />
                            );
                        })}
                    </KpiGrid>
                </Box>
            )}

            {/* Charts Grid */}
            {isOn('evolution') && (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 3, mb: 4 }}>
                    {/* Evolution Chart */}
                    <Paper elevation={0} sx={cardStyle}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <span className="material-icons-round" style={{ color: '#2563eb', fontSize: '22px' }}>show_chart</span>
                                <Typography sx={{ fontSize: '16px', fontWeight: 600, color: textPrimaryColor }}>Evolução Orçado vs Realizado</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', gap: 3 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Box sx={{ width: 10, height: 10, borderRadius: '8px', background: '#10b981' }} />
                                    <span style={{ fontSize: '13px', color: textSecondaryColor }}>Orçado</span>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Box sx={{ width: 10, height: 10, borderRadius: '8px', background: '#06b6d4' }} />
                                    <span style={{ fontSize: '13px', color: textSecondaryColor }}>Realizado</span>
                                </Box>
                            </Box>
                        </Box>
                        <Box sx={{ height: 280 }}>
                            {evolution.labels.length > 0 ? (
                                <LineChart
                                    xAxis={[{ scaleType: 'point', data: evolution.labels, tickLabelStyle: { fill: labelColor, fontSize: 11 } }]}
                                    yAxis={[{ tickLabelStyle: { fill: labelColor, fontSize: 11 } }]}
                                    series={[
                                        { data: evolution.planned, label: 'Orçado', color: '#10b981', showMark: false, curve: "catmullRom" },
                                        { data: evolution.actual, label: 'Realizado', color: '#06b6d4', showMark: false, curve: "catmullRom", area: true }
                                    ]}
                                    height={280}
                                    margin={{ top: 10, bottom: 30, left: 50, right: 20 }}
                                    slotProps={{ legend: { hidden: true } }}
                                    sx={{ '& .MuiChartsAxis-line': { stroke: theme.palette.divider }, '& .MuiChartsAxis-tick': { stroke: theme.palette.divider } }}
                                />
                            ) : (
                                <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 2 }}>
                                    <span className="material-icons-round" style={{ fontSize: '48px', color: labelColor, opacity: 0.5 }}>show_chart</span>
                                    <Typography sx={{ color: labelColor, fontSize: '14px' }}>Sem dados para exibir</Typography>
                                </Box>
                            )}
                        </Box>
                    </Paper>

                    {/* Distribution Pie */}
                    <Paper elevation={0} sx={cardStyle}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                            <span className="material-icons-round" style={{ color: '#2563eb', fontSize: '22px' }}>pie_chart</span>
                            <Typography sx={{ fontSize: '16px', fontWeight: 600, color: textPrimaryColor }}>Distribuição</Typography>
                        </Box>
                        <Box sx={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center', mb: 2 }}>
                            {pieData.length > 0 ? (
                                <>
                                    <PieChart
                                        series={[{
                                            data: pieData.map(d => ({ id: d.id, value: d.value, color: d.color })),
                                            innerRadius: 70, outerRadius: 95, paddingAngle: 2, cornerRadius: 6,
                                            cx: 95, cy: 95
                                        }]}
                                        width={200} height={200}
                                        margin={{ top: 0, bottom: 0, left: 0, right: 0 }}
                                        slotProps={{ legend: { hidden: true } }}
                                    />
                                    <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                                        <Typography sx={{ fontSize: '24px', fontWeight: 700, color: textPrimaryColor }}>{formatShort(overview.totalSpent)}</Typography>
                                        <Typography sx={{ fontSize: '12px', color: labelColor }}>Gasto</Typography>
                                    </Box>
                                </>
                            ) : (
                                <Box sx={{ width: 200, height: 200, borderRadius: '8px', background: surfaceColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Typography sx={{ color: labelColor, fontSize: '14px' }}>Sem dados</Typography>
                                </Box>
                            )}
                        </Box>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                            {pieData.map((d) => (
                                <Box key={d.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, background: surfaceColor, borderRadius: '8px' }}>
                                    <Box sx={{ width: 12, height: 12, borderRadius: '8px', background: d.color, flexShrink: 0 }} />
                                    <Typography sx={{ flex: 1, fontSize: '14px', fontWeight: 500, color: textPrimaryColor }}>{d.label}</Typography>
                                    <Typography sx={{ fontSize: '14px', fontWeight: 700, color: textPrimaryColor }}>{formatCurrency(d.value)}</Typography>
                                </Box>
                            ))}
                        </Box>
                    </Paper>
                </Box>
            )}

            {/* Insights & Performance Row */}
            {(isOn('alerts') || isOn('performance')) && (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 3 }}>
                    {/* Alerts */}
                    {isOn('alerts') && (
                        <Paper elevation={0} sx={cardStyle}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                {/* Forecast */}
                                {insights.forecast && (
                                    <Box sx={{ pb: 3, borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}` }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                <Box sx={{ width: 40, height: 40, borderRadius: '8px', background: 'rgba(37, 99, 235, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <span className="material-icons-round" style={{ color: '#2563eb', fontSize: '22px' }}>timelapse</span>
                                                </Box>
                                                <Box>
                                                    <Typography sx={{ fontSize: '16px', fontWeight: 600, color: textPrimaryColor }}>Forecast & Burn Rate</Typography>
                                                    <Typography sx={{ fontSize: '13px', color: labelColor }}>Previsão baseada no consumo diário</Typography>
                                                </Box>
                                            </Box>
                                            <span style={{
                                                padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 600,
                                                background: insights.forecast.status === 'RISK' ? 'rgba(244, 63, 94, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                                color: insights.forecast.status === 'RISK' ? '#f43f5e' : '#10b981'
                                            }}>
                                                {insights.forecast.status === 'RISK' ? 'RISCO DE ESTOURO' : 'DENTRO DA META'}
                                            </span>
                                        </Box>
                                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                                            <Box>
                                                <Typography sx={{ fontSize: '12px', color: labelColor }}>Burn Rate Diário</Typography>
                                                <Typography sx={{ fontSize: '18px', fontWeight: 700, color: textPrimaryColor }}>{formatCurrency(insights.forecast.dailyBurnRate)}</Typography>
                                            </Box>
                                            <Box>
                                                <Typography sx={{ fontSize: '12px', color: labelColor }}>Projeção Anual</Typography>
                                                <Typography sx={{ fontSize: '18px', fontWeight: 700, color: insights.forecast.status === 'RISK' ? '#f43f5e' : textPrimaryColor }}>
                                                    {formatCurrency(insights.forecast.projectedTotal)}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </Box>
                                )}
                                <Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                        <span className="material-icons-round" style={{ color: '#f59e0b', fontSize: '20px' }}>warning</span>
                                        <Typography sx={{ fontSize: '14px', fontWeight: 600, color: textPrimaryColor }}>Alertas de Orçamento</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        {insights.alerts.length === 0 ? (
                                            <Box sx={{ p: 2, background: surfaceColor, borderRadius: '8px', textAlign: 'center' }}>
                                                <Typography sx={{ color: textSecondaryColor, fontSize: '13px' }}>Nenhum alerta. Tudo em ordem!</Typography>
                                            </Box>
                                        ) : insights.alerts.map((alert, i) => (
                                            <Box key={i} sx={{ display: 'flex', gap: 2, p: 2, background: 'rgba(244, 63, 94, 0.08)', borderRadius: '8px', borderLeft: '4px solid #f43f5e' }}>
                                                <Box sx={{ flex: 1 }}>
                                                    <Typography sx={{ fontWeight: 600, color: textPrimaryColor, fontSize: '13px' }}>{alert.name}</Typography>
                                                </Box>
                                                <Typography sx={{ fontWeight: 700, color: '#f43f5e', fontSize: '13px' }}>+{formatCurrency(Math.abs(alert.value))}</Typography>
                                            </Box>
                                        ))}
                                    </Box>
                                </Box>
                            </Box>
                        </Paper>
                    )}

                    {/* Performance */}
                    {isOn('performance') && (
                        <Paper elevation={0} sx={cardStyle}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                                <Box sx={{ width: 40, height: 40, borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <span className="material-icons-round" style={{ color: '#10b981', fontSize: '22px' }}>leaderboard</span>
                                </Box>
                                <Box>
                                    <Typography sx={{ fontSize: '16px', fontWeight: 600, color: textPrimaryColor }}>Performance por Centro de Custo</Typography>
                                    <Typography sx={{ fontSize: '13px', color: labelColor }}>Top 5 maiores gastos</Typography>
                                </Box>
                            </Box>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {ccData.slice(0, 5).map((cc, i) => (
                                    <Box key={cc.code || i} sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                        <Box sx={{
                                            width: 28, height: 28, borderRadius: '8px',
                                            background: i < 3 ? 'rgba(245, 158, 11, 0.15)' : surfaceColor,
                                            color: i < 3 ? '#f59e0b' : labelColor,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '12px', fontWeight: 700
                                        }}>
                                            {i + 1}
                                        </Box>
                                        <Box sx={{ flex: 1, overflow: 'hidden' }}>
                                            <Typography sx={{ fontWeight: 600, color: textPrimaryColor, fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cc.name}</Typography>
                                            <Typography sx={{ fontSize: '11px', color: labelColor, fontFamily: 'monospace' }}>{cc.code}</Typography>
                                        </Box>
                                        <Box sx={{ textAlign: 'right' }}>
                                            <Typography sx={{ fontWeight: 700, color: textPrimaryColor, fontSize: '14px' }}>{formatCurrency(cc.actual)}</Typography>
                                            <Typography sx={{ fontSize: '11px', color: labelColor }}>/ {formatCurrency(cc.planned)}</Typography>
                                        </Box>
                                    </Box>
                                ))}
                                {ccData.length === 0 && (
                                    <Box sx={{ p: 3, background: surfaceColor, borderRadius: '8px', textAlign: 'center' }}>
                                        <Typography sx={{ color: textSecondaryColor, fontSize: '14px' }}>Nenhum dado de performance</Typography>
                                    </Box>
                                )}
                            </Box>
                        </Paper>
                    )}
                </Box>
            )}
        </Box>
    );
};

export default FinanceDashboard;