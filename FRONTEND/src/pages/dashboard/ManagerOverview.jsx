import { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { Box, Typography, Button, Avatar, LinearProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { LineChart } from '@mui/x-charts/LineChart';
import { BarChart } from '@mui/x-charts/BarChart';
import { PieChart } from '@mui/x-charts/PieChart';
import { ThemeContext } from '../../contexts/ThemeContext';
import { AuthContext } from '../../contexts/AuthContext';
import ActivityFeed from '../../components/dashboard/ActivityFeed';
import DashboardCustomizer from '../../components/dashboard/DashboardCustomizer';
import ProjectModal from '../../components/modals/ProjectModal';
import TaskModal from '../../components/modals/TaskModal';
import ChangeModal from '../../components/modals/ChangeModal';
import ExpenseModal from '../../components/modals/ExpenseModal';
import IncidentCreateModal from '../../components/modals/IncidentCreateModal';
import api from '../../services/api';
import { getIncidentKPIs } from '../../services/incident.service';
import { createProject } from '../../services/project.service';
import { createGeneralTask } from '../../services/task.service';
import { createChange } from '../../services/change-request.service';
import { createExpense } from '../../services/expense.service';
import { formatRelative } from '../../utils/dateUtils';
import { useSnackbar } from 'notistack';

// ─── Widget config ────────────────────────────────────────────────────────────
const MANAGER_WIDGETS_KEY = 'g360_manager_widgets';
const DEFAULT_WIDGETS = [
    { id: 'kpis', label: 'KPIs Principais', enabled: true, icon: 'dashboard' },
    { id: 'incidents', label: 'Tendência de Incidentes', enabled: true, icon: 'warning' },
    { id: 'distributions', label: 'Tarefas & Riscos', enabled: true, icon: 'pie_chart' },
    { id: 'expenses', label: 'Despesas & Aprovações', enabled: true, icon: 'account_balance_wallet' },
    { id: 'team', label: 'Saúde da Equipe', enabled: true, icon: 'groups' },
    { id: 'activity', label: 'Atividades Recentes', enabled: true, icon: 'history' },
    { id: 'contracts', label: 'Contratos Vencendo', enabled: true, icon: 'description' },
];
const loadWidgets = () => {
    try {
        const saved = localStorage.getItem(MANAGER_WIDGETS_KEY);
        if (!saved) return DEFAULT_WIDGETS;
        const parsed = JSON.parse(saved);
        return DEFAULT_WIDGETS.map(d => ({ ...d, ...parsed.find(p => p.id === d.id) }));
    } catch { return DEFAULT_WIDGETS; }
};

// ─── Sub-components ───────────────────────────────────────────────────────────
const QA = ({ icon, label, route, color, navigate, onClick }) => (
    <Box onClick={onClick || (() => navigate(route))} sx={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        cursor: 'pointer', flexShrink: 0, width: 96,
        borderRadius: '6px', overflow: 'hidden',
        border: '1px solid rgba(0,0,0,0.06)',
        bgcolor: '#ffffff',
        transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        '&:hover': {
            transform: 'translateY(-15px)',
            boxShadow: `0 16px 32px ${color}35`,
        }
    }}>
        {/* Topo colorido com icone branco */}
        <Box sx={{
            width: '100%', height: 72, bgcolor: color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
            <span className="material-icons-round" style={{ color: '#ffffff', fontSize: '32px' }}>{icon}</span>
        </Box>
        {/* Base branca com label */}
        <Box sx={{ width: '100%', py: 0.75, bgcolor: '#ffffff' }}>
            <Typography sx={{ fontSize: '11px', fontWeight: 700, color, textAlign: 'center', lineHeight: 1.2, whiteSpace: 'nowrap' }}>{label}</Typography>
        </Box>
    </Box>
);

const MetricCard = ({ title, value, sub, icon, color, trend, onClick, isDark }) => {
    const isUp = trend > 0, isNeutral = trend === 0;
    const trendColor = isNeutral ? '#64748b' : isUp ? '#ef4444' : '#10b981';
    return (
        <Box onClick={onClick} sx={{
            p: 2, borderRadius: '14px', cursor: onClick ? 'pointer' : 'default', position: 'relative', overflow: 'hidden',
            bgcolor: isDark ? 'rgba(255,255,255,0.04)' : '#fff',
            border: `1px solid ${color}25`,
            transition: 'all 0.2s',
            '&::before': { content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: '3px', bgcolor: color },
            '&:hover': onClick ? { transform: 'translateY(-2px)', boxShadow: `0 8px 24px ${color}20` } : {},
            boxShadow: isDark ? 'none' : '0 1px 4px rgba(0,0,0,0.06)',
        }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                <Box sx={{ width: 36, height: 36, borderRadius: '9px', bgcolor: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="material-icons-round" style={{ color, fontSize: '18px' }}>{icon}</span>
                </Box>
                {trend !== null && trend !== undefined && (
                    <Box sx={{ px: 0.75, py: 0.25, borderRadius: '6px', bgcolor: isNeutral ? 'rgba(100,116,139,0.1)' : isUp ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)' }}>
                        <Typography sx={{ fontSize: '10px', fontWeight: 700, color: trendColor }}>
                            {isNeutral ? '─' : isUp ? '↑' : '↓'} {Math.abs(trend)}%
                        </Typography>
                    </Box>
                )}
            </Box>
            <Typography sx={{ fontSize: '28px', fontWeight: 800, lineHeight: 1, color: isDark ? '#f1f5f9' : '#0f172a' }}>{value}</Typography>
            <Typography sx={{ fontSize: '11px', fontWeight: 600, color: isDark ? '#64748b' : '#475569', mt: 0.4 }}>{title}</Typography>
            {sub && <Typography sx={{ fontSize: '10px', color: isDark ? '#475569' : '#94a3b8', mt: 0.2 }}>{sub}</Typography>}
        </Box>
    );
};

const SectionHeader = ({ icon, title, action, iconColor, isDark }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 28, height: 28, borderRadius: '8px', bgcolor: `${iconColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-icons-round" style={{ color: iconColor, fontSize: '15px' }}>{icon}</span>
            </Box>
            <Typography sx={{ fontSize: '14px', fontWeight: 700, color: isDark ? '#f1f5f9' : '#0f172a' }}>{title}</Typography>
        </Box>
        {action}
    </Box>
);

const ChartCard = ({ children, isDark, sx = {} }) => (
    <Box sx={{
        p: 2.5, borderRadius: '16px',
        bgcolor: isDark ? 'rgba(255,255,255,0.04)' : '#fff',
        border: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.07)',
        boxShadow: isDark ? 'none' : '0 1px 4px rgba(0,0,0,0.06)',
        ...sx
    }}>
        {children}
    </Box>
);

// ─── Main component ───────────────────────────────────────────────────────────
const ManagerOverview = () => {
    const { mode } = useContext(ThemeContext);
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const isDark = mode === 'dark';

    const [stats, setStats] = useState(null);
    const [analytics, setAnalytics] = useState(null);
    const [kpis, setKpis] = useState(null);
    const [loading, setLoading] = useState(true);
    const [widgets, setWidgets] = useState(loadWidgets);
    const { enqueueSnackbar } = useSnackbar();

    // Modal states
    const [isTaskOpen, setIsTaskOpen] = useState(false);
    const [isProjectOpen, setIsProjectOpen] = useState(false);
    const [isGmudOpen, setIsGmudOpen] = useState(false);
    const [isExpenseOpen, setIsExpenseOpen] = useState(false);
    const [isIncidentOpen, setIsIncidentOpen] = useState(false);
    const [modalLoading, setModalLoading] = useState(false);

    // Modal save handlers
    const handleSaveTask = async (d) => { setModalLoading(true); try { await createGeneralTask(d); enqueueSnackbar('Tarefa criada!', { variant: 'success' }); setIsTaskOpen(false); load(); } catch { enqueueSnackbar('Erro ao criar.', { variant: 'error' }); } finally { setModalLoading(false); } };
    const handleSaveProject = async (d) => { setModalLoading(true); try { await createProject(d); enqueueSnackbar('Projeto criado!', { variant: 'success' }); setIsProjectOpen(false); load(); } catch { enqueueSnackbar('Erro ao criar.', { variant: 'error' }); } finally { setModalLoading(false); } };
    const handleSaveGmud = async (d) => { setModalLoading(true); try { await createChange(d); enqueueSnackbar('GMUD criada!', { variant: 'success' }); setIsGmudOpen(false); load(); } catch { enqueueSnackbar('Erro ao criar.', { variant: 'error' }); } finally { setModalLoading(false); } };
    const handleSaveExpense = async (d) => { setModalLoading(true); try { await createExpense(d); enqueueSnackbar('Despesa lançada!', { variant: 'success' }); setIsExpenseOpen(false); load(); } catch { enqueueSnackbar('Erro ao criar.', { variant: 'error' }); } finally { setModalLoading(false); } };

    const handleWidgetsChange = useCallback((updated) => {
        setWidgets(updated);
        localStorage.setItem(MANAGER_WIDGETS_KEY, JSON.stringify(updated));
    }, []);

    const isOn = useCallback((id) => widgets.find(w => w.id === id)?.enabled ?? true, [widgets]);

    const load = useCallback(async () => {
        try {
            const [statsRes, analyticsRes, kpisData] = await Promise.all([
                api.get('/dashboard/manager'),
                api.get('/dashboard/analytics'),
                getIncidentKPIs(),
            ]);
            setStats(statsRes.data);
            setAnalytics(analyticsRes.data);
            setKpis(kpisData);
        } catch (e) { console.error('[ManagerOverview]', e); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    // ── Theme ─────────────────────────────────────────────────────────────────
    const textPrimary = isDark ? '#f1f5f9' : '#0f172a';
    const textMuted = isDark ? '#64748b' : '#94a3b8';
    const labelColor = isDark ? '#475569' : '#94a3b8';
    const axisStyle = { fill: labelColor, fontSize: 10 };

    // ── Derived ───────────────────────────────────────────────────────────────
    const s = stats?.kpis || {};
    const budget = s.finance?.budget || 0;
    const spent = s.finance?.spent || 0;
    const budgetPct = budget > 0 ? Math.round((spent / budget) * 100) : 0;
    const budgetColor = budgetPct > 90 ? '#ef4444' : budgetPct > 70 ? '#f59e0b' : '#10b981';

    const taskDist = analytics?.taskDistribution || {};
    const totalTasks = Object.values(taskDist).reduce((a, v) => a + v, 0);
    const donePct = totalTasks > 0 ? Math.round(((taskDist.DONE || 0) / totalTasks) * 100) : 0;

    const risk = analytics?.riskDistribution || {};
    const projDist = analytics?.projectDistribution || {};
    const projTotal = Object.values(projDist).reduce((a, v) => a + v, 0);
    const projDonePct = projTotal > 0 ? Math.round(((projDist.COMPLETED || 0) / projTotal) * 100) : 0;

    const trend = analytics?.incidentTrend || [];
    const trendLabels = trend.map(d => d.date.slice(5));
    const trendCreated = trend.map(d => d.created);
    const trendResolved = trend.map(d => d.resolved);

    const expTrend = analytics?.expenseTrend || [];
    const expLabels = expTrend.map(d => d.month.slice(5));
    const expValues = expTrend.map(d => d.amount);

    const taskPie = [
        { id: 0, value: taskDist.TODO || 0, label: 'A Fazer', color: '#94a3b8' },
        { id: 1, value: taskDist.IN_PROGRESS || 0, label: 'Em Andamento', color: '#3b82f6' },
        { id: 2, value: taskDist.DONE || 0, label: 'Concluídas', color: '#10b981' },
        { id: 3, value: taskDist.CANCELLED || 0, label: 'Canceladas', color: '#475569' },
    ].filter(d => d.value > 0);

    const riskPie = [
        { id: 0, value: risk.low || 0, label: 'Baixo', color: '#10b981' },
        { id: 1, value: risk.medium || 0, label: 'Médio', color: '#f59e0b' },
        { id: 2, value: risk.high || 0, label: 'Alto', color: '#f97316' },
        { id: 3, value: risk.critical || 0, label: 'Crítico', color: '#ef4444' },
    ].filter(d => d.value > 0);

    const teamHealth = stats?.teamHealth || [];

    const formatCurrency = (v) => new Intl.NumberFormat('pt-BR', {
        style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1
    }).format(v);

    const greet = () => {
        const h = new Date().getHours();
        return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
    };

    const NavBtn = ({ route, label }) => (
        <Button size="small" onClick={() => navigate(route)}
            sx={{ fontSize: '11px', textTransform: 'none', color: '#667eea', px: 1, minWidth: 0 }}>
            {label} →
        </Button>
    );

    const isDashboardEmpty = totalTasks === 0 && budget === 0 && (kpis?.open || 0) === 0;

    const healthScore = useMemo(() => {
        if (loading) return null;
        if (isDashboardEmpty) return null;
        
        return Math.round(
            (donePct * 0.3) +
            ((100 - budgetPct) * 0.3) +
            ((kpis?.slaBreached === 0 ? 100 : Math.max(0, 100 - (kpis?.slaBreached || 0) * 10)) * 0.4)
        );
    }, [loading, isDashboardEmpty, donePct, budgetPct, kpis]);

    const healthColor = healthScore === null ? '#667eea'
        : healthScore >= 75 ? '#10b981'
            : healthScore >= 50 ? '#f59e0b'
                : '#ef4444';
    const healthLabel = healthScore === null ? 'Sem dados'
        : healthScore === 0 ? 'Sem atividade'
            : healthScore >= 75 ? 'Saudável'
                : healthScore >= 50 ? 'Atenção'
                    : 'Crítico';

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <Box sx={{ minHeight: '100vh' }}>

            {/* ── HERO BANNER ────────────────────────────────────────────────── */}
            <Box sx={{
                mb: 3, p: { xs: 1.5, md: 2 }, borderRadius: '20px',
                background: isDark
                    ? 'linear-gradient(135deg, rgba(102,126,234,0.18) 0%, rgba(16,185,129,0.08) 100%)'
                    : 'linear-gradient(135deg, rgba(102,126,234,0.10) 0%, rgba(16,185,129,0.04) 100%)',
                border: isDark ? '1px solid rgba(102,126,234,0.25)' : '1px solid rgba(102,126,234,0.15)',
            }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
                    {/* Left: greeting + quick actions */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontSize: '22px', fontWeight: 800, color: textPrimary, lineHeight: 1.1 }}>
                            {greet()}, {user?.name?.split(' ')[0] || 'Gestor'} 👋
                        </Typography>
                        <Typography sx={{ fontSize: '12px', color: textMuted, mt: 0.5 }}>
                            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, mt: 1.5, flexWrap: 'nowrap', overflowX: 'auto' }}>
                            <QA icon="add_task" label="Nova Tarefa" onClick={() => setIsTaskOpen(true)} color="#3b82f6" navigate={navigate} />
                            <QA icon="folder_open" label="Novo Projeto" onClick={() => setIsProjectOpen(true)} color="#8b5cf6" navigate={navigate} />
                            <QA icon="published_with_changes" label="Nova GMUD" onClick={() => setIsGmudOpen(true)} color="#6366f1" navigate={navigate} />
                            <QA icon="warning" label="Incidente" onClick={() => setIsIncidentOpen(true)} color="#f59e0b" navigate={navigate} />
                            <QA icon="description" label="Contratos" route="/contracts" color="#10b981" navigate={navigate} />
                            <QA icon="request_quote" label="Despesa" onClick={() => setIsExpenseOpen(true)} color="#f43f5e" navigate={navigate} />
                        </Box>
                    </Box>

                    {/* Right: Health Score + Customizer (gear to the right of score) */}
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, flexShrink: 0 }}>
                        <Box sx={{ textAlign: 'center', minWidth: 90 }}>
                            <Box sx={{ position: 'relative', width: 90, height: 90, mx: 'auto', mb: 0.5 }}>
                                <svg width="90" height="90" style={{ transform: 'rotate(-90deg)' }}>
                                    <circle cx="45" cy="45" r="36" fill="none"
                                        stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}
                                        strokeWidth="7" />
                                    <circle cx="45" cy="45" r="36" fill="none"
                                        stroke={healthColor} strokeWidth="7"
                                        strokeDasharray={`${2 * Math.PI * 36}`}
                                        strokeDashoffset={`${2 * Math.PI * 36 * (1 - (healthScore || 0) / 100)}`}
                                        strokeLinecap="round"
                                        style={{ transition: 'stroke-dashoffset 1s ease' }} />
                                </svg>
                                <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                    <Typography sx={{ fontSize: '20px', fontWeight: 800, color: healthColor, lineHeight: 1 }}>
                                        {healthScore ?? 0}
                                    </Typography>
                                    <Typography sx={{ fontSize: '8px', color: textMuted, fontWeight: 600 }}>SCORE</Typography>
                                </Box>
                            </Box>
                            <Typography sx={{ fontSize: '11px', fontWeight: 700, color: healthColor }}>{healthLabel}</Typography>
                            <Typography sx={{ fontSize: '9px', color: textMuted }}>Saúde Geral</Typography>
                        </Box>
                        <DashboardCustomizer widgets={widgets} onWidgetsChange={handleWidgetsChange} isDark={isDark} />
                    </Box>
                </Box>
            </Box>

            {/* ── KPI STRIP ──────────────────────────────────────────────────── */}
            {isOn('kpis') && (
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 1.5, mb: 3 }}>
                    <MetricCard title="Incidentes Abertos" value={kpis?.open ?? (loading ? '…' : 0)}
                        sub={kpis?.slaBreached > 0 ? `${kpis.slaBreached} SLA estourado` : 'SLA OK'}
                        icon="warning" color="#f59e0b" trend={kpis?.trendOpen}
                        onClick={() => navigate('/incidents')} isDark={isDark} />
                    <MetricCard title="Tarefas da Equipe" value={s.tasks ?? '…'}
                        sub={`${s.overdueTeamTasks ?? 0} atrasadas`}
                        icon="task_alt" color="#3b82f6" trend={null}
                        onClick={() => navigate('/tasks')} isDark={isDark} />
                    <MetricCard title="Projetos Ativos" value={s.projects ?? '…'}
                        sub={`${projDonePct}% concluídos`}
                        icon="folder_special" color="#8b5cf6" trend={null}
                        onClick={() => navigate('/projects')} isDark={isDark} />
                    <MetricCard title="Budget Consumido" value={`${budgetPct}%`}
                        sub={`${formatCurrency(spent)} / ${formatCurrency(budget)}`}
                        icon="account_balance_wallet" color={budgetColor} trend={null}
                        onClick={() => navigate('/finance')} isDark={isDark} />
                    <MetricCard title="GMUDs Pendentes" value={s.gmuds ?? '…'}
                        sub="aguard. aprovação"
                        icon="published_with_changes" color="#6366f1" trend={null}
                        onClick={() => navigate('/change-requests')} isDark={isDark} />
                    <MetricCard title="Contratos Ativos" value={s.contracts ?? '…'}
                        sub="em vigência"
                        icon="description" color="#10b981" trend={null}
                        onClick={() => navigate('/contracts')} isDark={isDark} />
                </Box>
            )}

            {/* ── MAIN CHARTS ────────────────────────────────────────────────── */}
            {(isOn('incidents') || isOn('distributions')) && (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 2.5, mb: 3 }}>

                    {isOn('incidents') && (
                        <ChartCard isDark={isDark}>
                            <SectionHeader icon="trending_up" title="Incidentes — últimos 30 dias" iconColor="#f59e0b"
                                action={<NavBtn route="/incidents" label="Ver todos" />} isDark={isDark} />
                            {trendLabels.length > 0 ? (
                                <LineChart
                                    xAxis={[{ scaleType: 'point', data: trendLabels, tickLabelStyle: axisStyle, tickInterval: (_v, i) => i % 5 === 0 }]}
                                    yAxis={[{ tickLabelStyle: axisStyle }]}
                                    series={[
                                        { data: trendCreated, label: 'Criados', color: '#f59e0b', showMark: false, curve: 'catmullRom', area: true },
                                        { data: trendResolved, label: 'Resolvidos', color: '#10b981', showMark: false, curve: 'catmullRom' },
                                    ]}
                                    height={280}
                                    margin={{ top: 10, bottom: 30, left: 35, right: 10 }}
                                    slotProps={{ legend: { hidden: false, position: { vertical: 'top', horizontal: 'right' }, itemMarkWidth: 10, itemMarkHeight: 10, labelStyle: { fontSize: 11, fill: labelColor } } }}
                                    sx={{ '& .MuiChartsAxis-line': { stroke: 'transparent' }, '& .MuiChartsAxis-tick': { stroke: 'transparent' }, '& .MuiAreaElement-root': { fillOpacity: 0.15 } }}
                                />
                            ) : (
                                <Box sx={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 1 }}>
                                    <span className="material-icons-round" style={{ fontSize: '40px', color: labelColor, opacity: 0.3 }}>show_chart</span>
                                    <Typography sx={{ fontSize: '13px', color: textMuted }}>Sem dados de incidentes</Typography>
                                </Box>
                            )}
                        </ChartCard>
                    )}

                    {isOn('distributions') && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                            <ChartCard isDark={isDark}>
                                <SectionHeader icon="task_alt" title="Distribuição de Tarefas" iconColor="#3b82f6" isDark={isDark} />
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    {taskPie.length > 0 ? (
                                        <>
                                            <PieChart
                                                series={[{ data: taskPie, innerRadius: 32, outerRadius: 52, paddingAngle: 2, cornerRadius: 4, cx: 55, cy: 55 }]}
                                                width={115} height={115}
                                                margin={{ top: 0, bottom: 0, left: 0, right: 0 }}
                                                slotProps={{ legend: { hidden: true } }}
                                            />
                                            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                {taskPie.map(d => (
                                                    <Box key={d.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                                        <Box sx={{ width: 8, height: 8, borderRadius: '2px', bgcolor: d.color, flexShrink: 0 }} />
                                                        <Typography sx={{ fontSize: '11px', color: textPrimary, flex: 1 }}>{d.label}</Typography>
                                                        <Typography sx={{ fontSize: '11px', fontWeight: 700, color: textPrimary }}>{d.value}</Typography>
                                                    </Box>
                                                ))}
                                                <Box sx={{ mt: 0.5, pt: 0.5, borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
                                                    <Typography sx={{ fontSize: '10px', color: textMuted }}>{donePct}% concluídas</Typography>
                                                </Box>
                                            </Box>
                                        </>
                                    ) : (
                                        <Typography sx={{ fontSize: '12px', color: textMuted }}>Sem tarefas</Typography>
                                    )}
                                </Box>
                            </ChartCard>

                            <ChartCard isDark={isDark}>
                                <SectionHeader icon="shield" title="Distribuição de Riscos" iconColor="#ef4444" isDark={isDark} />
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    {riskPie.length > 0 ? (
                                        <>
                                            <PieChart
                                                series={[{ data: riskPie, innerRadius: 32, outerRadius: 52, paddingAngle: 2, cornerRadius: 4, cx: 55, cy: 55 }]}
                                                width={115} height={115}
                                                margin={{ top: 0, bottom: 0, left: 0, right: 0 }}
                                                slotProps={{ legend: { hidden: true } }}
                                            />
                                            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                {riskPie.map(d => (
                                                    <Box key={d.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                                        <Box sx={{ width: 8, height: 8, borderRadius: '2px', bgcolor: d.color, flexShrink: 0 }} />
                                                        <Typography sx={{ fontSize: '11px', color: textPrimary, flex: 1 }}>{d.label}</Typography>
                                                        <Typography sx={{ fontSize: '11px', fontWeight: 700, color: textPrimary }}>{d.value}</Typography>
                                                    </Box>
                                                ))}
                                            </Box>
                                        </>
                                    ) : (
                                        <Typography sx={{ fontSize: '12px', color: textMuted }}>Sem riscos cadastrados</Typography>
                                    )}
                                </Box>
                            </ChartCard>
                        </Box>
                    )}
                </Box>
            )}

            {/* ── EXPENSES + APPROVALS ───────────────────────────────────────── */}
            {isOn('expenses') && (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2.5, mb: 3 }}>
                    <ChartCard isDark={isDark}>
                        <SectionHeader icon="account_balance_wallet" title="Despesas Realizadas — 6 meses" iconColor="#10b981"
                            action={<NavBtn route="/finance" label="Ver Finance" />} isDark={isDark} />
                        {expValues.some(v => v > 0) ? (
                            <BarChart
                                xAxis={[{ scaleType: 'band', data: expLabels, tickLabelStyle: axisStyle }]}
                                yAxis={[{ tickLabelStyle: axisStyle }]}
                                series={[{ data: expValues, label: 'Despesas', color: '#10b981' }]}
                                height={200}
                                margin={{ top: 10, bottom: 30, left: 60, right: 10 }}
                                slotProps={{ legend: { hidden: true } }}
                                sx={{ '& .MuiBarElement-root': { rx: 4 } }}
                            />
                        ) : (
                            <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 1 }}>
                                <span className="material-icons-round" style={{ fontSize: '36px', color: labelColor, opacity: 0.3 }}>bar_chart</span>
                                <Typography sx={{ fontSize: '12px', color: textMuted }}>Sem despesas no período</Typography>
                            </Box>
                        )}
                        <Box sx={{ mt: 1.5, pt: 1.5, borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                <Typography sx={{ fontSize: '11px', color: textMuted }}>Consumo do orçamento anual</Typography>
                                <Typography sx={{ fontSize: '11px', fontWeight: 700, color: budgetColor }}>{budgetPct}%</Typography>
                            </Box>
                            <LinearProgress variant="determinate" value={Math.min(budgetPct, 100)}
                                sx={{ height: 6, borderRadius: 3, bgcolor: `${budgetColor}18`, '& .MuiLinearProgress-bar': { bgcolor: budgetColor, borderRadius: 3 } }} />
                            <Typography sx={{ fontSize: '10px', color: textMuted, mt: 0.5 }}>{formatCurrency(spent)} de {formatCurrency(budget)}</Typography>
                        </Box>
                    </ChartCard>

                    <ChartCard isDark={isDark}>
                        <SectionHeader icon="pending_actions" title="Aprovações Pendentes" iconColor="#8b5cf6"
                            action={<NavBtn route="/approvals" label="Ver todas" />} isDark={isDark} />
                        {(stats?.pendingApprovals || []).length === 0 ? (
                            <Box sx={{ py: 4, textAlign: 'center' }}>
                                <span className="material-icons-round" style={{ fontSize: '36px', color: labelColor, opacity: 0.3, display: 'block' }}>check_circle</span>
                                <Typography sx={{ fontSize: '13px', color: textMuted, mt: 1 }}>Nenhuma aprovação pendente</Typography>
                            </Box>
                        ) : (
                            <Box sx={{
                                display: 'flex', flexDirection: 'column', gap: 0.75, maxHeight: 230, overflowY: 'auto',
                                '&::-webkit-scrollbar': { width: '3px' },
                                '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(102,126,234,0.3)', borderRadius: '3px' }
                            }}>
                                {(stats?.pendingApprovals || []).map((ap, i) => {
                                    const typeColor = { GMUD: '#6366f1', EXPENSE: '#f43f5e', MINUTE: '#f59e0b' }[ap.type] || '#667eea';
                                    return (
                                        <Box key={ap.id || i} sx={{
                                            p: 1.25, borderRadius: '10px', display: 'flex', gap: 1.5, alignItems: 'center',
                                            bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                                            border: '1px solid transparent', cursor: 'pointer',
                                            '&:hover': { borderColor: `${typeColor}30`, bgcolor: `${typeColor}08` },
                                            transition: 'all 0.13s',
                                        }}>
                                            <Box sx={{ width: 28, height: 28, borderRadius: '7px', bgcolor: `${typeColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <Typography sx={{ fontSize: '8px', fontWeight: 800, color: typeColor }}>{ap.type}</Typography>
                                            </Box>
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Typography sx={{ fontSize: '12px', fontWeight: 600, color: textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ap.title}</Typography>
                                                <Typography sx={{ fontSize: '10px', color: textMuted }}>{ap.requester} · {formatRelative(ap.date)}</Typography>
                                            </Box>
                                        </Box>
                                    );
                                })}
                            </Box>
                        )}
                    </ChartCard>
                </Box>
            )}

            {/* ── TEAM HEALTH ───────────────────────────────────────────────── */}
            {isOn('team') && (
                <Box sx={{ mb: 3 }}>
                    <ChartCard isDark={isDark}>
                        <SectionHeader icon="groups" title="Saúde da Equipe" iconColor="#3b82f6" isDark={isDark} />
                        {teamHealth.length === 0 ? (
                            <Box sx={{ py: 3, textAlign: 'center' }}>
                                <Typography sx={{ fontSize: '13px', color: textMuted }}>Nenhum membro no scope</Typography>
                            </Box>
                        ) : (
                            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 1.5 }}>
                                {teamHealth.slice(0, 8).map((m, i) => {
                                    const overduePct = m.openTasks > 0 ? Math.round((m.overdueTasks / m.openTasks) * 100) : 0;
                                    const barColor = overduePct > 50 ? '#ef4444' : overduePct > 20 ? '#f59e0b' : '#10b981';
                                    return (
                                        <Box key={m.id || i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                            <Avatar src={m.avatar} sx={{ width: 28, height: 28, fontSize: '11px', flexShrink: 0, bgcolor: '#667eea20', color: '#667eea' }}>
                                                {m.name?.charAt(0)}
                                            </Avatar>
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
                                                    <Typography sx={{ fontSize: '12px', fontWeight: 600, color: textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '55%' }}>{m.name}</Typography>
                                                    <Typography sx={{ fontSize: '10px', color: textMuted }}>
                                                        {m.openTasks} aber. ·&nbsp;
                                                        <Box component="span" sx={{ color: m.overdueTasks > 0 ? '#ef4444' : textMuted, fontWeight: m.overdueTasks > 0 ? 700 : 400 }}>
                                                            {m.overdueTasks} atr.
                                                        </Box>
                                                    </Typography>
                                                </Box>
                                                <LinearProgress variant="determinate" value={Math.min(overduePct, 100)}
                                                    sx={{ height: 4, borderRadius: 2, bgcolor: `${barColor}18`, '& .MuiLinearProgress-bar': { bgcolor: barColor, borderRadius: 2 } }} />
                                            </Box>
                                        </Box>
                                    );
                                })}
                            </Box>
                        )}
                    </ChartCard>
                </Box>
            )}

            {/* ── ACTIVITY FEED (100% width) ──────────────────────────────────── */}
            {isOn('activity') && (
                <Box sx={{ mb: 3 }}>
                    <ChartCard isDark={isDark}>
                        <SectionHeader icon="history" title="Atividades Recentes" iconColor="#667eea" isDark={isDark} />
                        <ActivityFeed isDark={isDark} maxHeight={300} showModuleFilter={false} compact />
                    </ChartCard>
                </Box>
            )}

            {/* ── EXPIRING CONTRACTS ─────────────────────────────────────────── */}
            {isOn('contracts') && (stats?.expiringContracts || []).length > 0 && (
                <ChartCard isDark={isDark}>
                    <SectionHeader icon="warning" title="Contratos Vencendo (30 dias)" iconColor="#f59e0b"
                        action={<NavBtn route="/contracts" label="Ver todos" />} isDark={isDark} />
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 1 }}>
                        {(stats?.expiringContracts || []).map((c, i) => {
                            const days = c.endDate ? Math.ceil((new Date(c.endDate) - new Date()) / 86400000) : null;
                            const dc = days !== null && days <= 7 ? '#ef4444' : '#f59e0b';
                            return (
                                <Box key={c.id || i} onClick={() => navigate('/contracts')} sx={{
                                    p: 1.5, borderRadius: '10px',
                                    bgcolor: isDark ? 'rgba(245,158,11,0.05)' : 'rgba(245,158,11,0.04)',
                                    border: '1px solid rgba(245,158,11,0.2)', cursor: 'pointer',
                                    '&:hover': { borderColor: 'rgba(245,158,11,0.4)' }
                                }}>
                                    <Typography sx={{ fontSize: '12px', fontWeight: 600, color: textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {c.name || c.contractNumber || 'Contrato'}
                                    </Typography>
                                    {days !== null && (
                                        <Box sx={{ display: 'inline-flex', mt: 0.5, px: 0.75, py: 0.2, borderRadius: '5px', bgcolor: `${dc}15`, fontSize: '10px', fontWeight: 700, color: dc }}>
                                            Vence em {days}d
                                        </Box>
                                    )}
                                </Box>
                            );
                        })}
                    </Box>
                </ChartCard>
            )}

            {/* ── MODALS ─────────────────────────────────────────────────────── */}
            <TaskModal open={isTaskOpen} onClose={() => setIsTaskOpen(false)} onSave={handleSaveTask} initialData={{}} />
            <ProjectModal open={isProjectOpen} onClose={() => setIsProjectOpen(false)} onSave={handleSaveProject} />
            <ChangeModal open={isGmudOpen} onClose={() => setIsGmudOpen(false)} onSave={handleSaveGmud} />
            <ExpenseModal open={isExpenseOpen} onClose={() => setIsExpenseOpen(false)} onSave={handleSaveExpense} />
            <IncidentCreateModal open={isIncidentOpen} onClose={() => setIsIncidentOpen(false)} onSave={() => load()} />
        </Box>
    );
};

export default ManagerOverview;
