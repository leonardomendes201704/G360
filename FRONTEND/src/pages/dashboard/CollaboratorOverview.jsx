import { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { Box, Typography, Button, Avatar, LinearProgress, Chip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { PieChart } from '@mui/x-charts/PieChart';
import { BarChart } from '@mui/x-charts/BarChart';
import { ThemeContext } from '../../contexts/ThemeContext';
import { AuthContext } from '../../contexts/AuthContext';
import ActivityFeed from '../../components/dashboard/ActivityFeed';
import DashboardCustomizer from '../../components/dashboard/DashboardCustomizer';
import TaskModal from '../../components/modals/TaskModal';
import ProjectModal from '../../components/modals/ProjectModal';
import ChangeModal from '../../components/modals/ChangeModal';
import ExpenseModal from '../../components/modals/ExpenseModal';
import IncidentCreateModal from '../../components/modals/IncidentCreateModal';
import api from '../../services/api';
import { createGeneralTask } from '../../services/task.service';
import { getReferenceUsers } from '../../services/reference.service';
import { createProject } from '../../services/project.service';
import { createChange } from '../../services/change-request.service';
import { createExpense } from '../../services/expense.service';
import { formatRelative, formatDueDate } from '../../utils/dateUtils';
import { useSnackbar } from 'notistack';
import { permissionModuleMatches } from '../../utils/rbacPermissions';

// ─── Widget config ────────────────────────────────────────────────────────────
const COLLAB_WIDGETS_KEY = 'g360_collab_widgets';
const DEFAULT_WIDGETS = [
    { id: 'kpis', label: 'Meus KPIs', enabled: true, icon: 'dashboard' },
    { id: 'tasks', label: 'Distribuição de Tarefas', enabled: true, icon: 'task_alt' },
    { id: 'projects', label: 'Meus Projetos', enabled: true, icon: 'folder_special' },
    { id: 'overdue', label: 'Tarefas Atrasadas', enabled: true, icon: 'warning' },
    { id: 'gmuds', label: 'GMUDs Próximas', enabled: true, icon: 'published_with_changes' },
    { id: 'activity', label: 'Atividades Recentes', enabled: true, icon: 'history' },
];
const loadWidgets = () => {
    try {
        const saved = localStorage.getItem(COLLAB_WIDGETS_KEY);
        if (!saved) return DEFAULT_WIDGETS;
        const parsed = JSON.parse(saved);
        return DEFAULT_WIDGETS.map(d => ({ ...d, ...parsed.find(p => p.id === d.id) }));
    } catch { return DEFAULT_WIDGETS; }
};

// ─── Quick actions filtradas por permissão RBAC ───────────────────────────────
const getQuickActions = (user, setters) => {
    const perms = (user?.roles || []).flatMap(r => r.permissions || []);
    const has = (canonicalModule, actions) =>
        perms.some(
            (p) =>
                permissionModuleMatches(p.module, canonicalModule) &&
                (p.action === 'ALL' || actions.includes(p.action))
        );
    const actions = [];
    if (has('TASKS', ['WRITE'])) actions.push({ icon: 'add_task', label: 'Nova Tarefa', onClick: setters.task, color: '#3b82f6' });
    if (has('FINANCE', ['WRITE'])) actions.push({ icon: 'request_quote', label: 'Nova Despesa', onClick: setters.expense, color: '#f43f5e' });
    if (has('INCIDENT', ['WRITE'])) actions.push({ icon: 'warning', label: 'Novo Incidente', onClick: setters.incident, color: '#f59e0b' });
    if (has('GMUD', ['CREATE', 'WRITE'])) actions.push({ icon: 'published_with_changes', label: 'Nova GMUD', onClick: setters.gmud, color: '#6366f1' });
    if (has('PROJECTS', ['CREATE'])) actions.push({ icon: 'folder_open', label: 'Novo Projeto', onClick: setters.project, color: '#8b5cf6' });
    return actions.slice(0, 6);
};

// ─── Sub-components ───────────────────────────────────────────────────────────
const QA = ({ icon, label, route, color, navigate, onClick }) => (
    <Box onClick={onClick || (() => navigate(route))} sx={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.75,
        p: 1.5, borderRadius: '12px', cursor: 'pointer', minWidth: 72,
        bgcolor: `${color}12`, border: `1px solid ${color}25`, transition: 'all 0.17s',
        '&:hover': { bgcolor: `${color}22`, transform: 'translateY(-2px)', boxShadow: `0 4px 12px ${color}25` }
    }}>
        <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-icons-round" style={{ color, fontSize: '18px' }}>{icon}</span>
        </Box>
        <Typography sx={{ fontSize: '10px', fontWeight: 600, color, textAlign: 'center', lineHeight: 1.2 }}>{label}</Typography>
    </Box>
);

const MetricCard = ({ title, value, sub, icon, color, onClick, isDark, highlight }) => (
    <Box onClick={onClick} sx={{
        p: 2, borderRadius: '14px', cursor: onClick ? 'pointer' : 'default',
        position: 'relative', overflow: 'hidden',
        bgcolor: highlight
            ? isDark ? `${color}18` : `${color}08`
            : isDark ? 'rgba(255,255,255,0.04)' : '#fff',
        border: `1px solid ${color}${highlight ? '40' : '25'}`,
        transition: 'all 0.2s',
        '&::before': { content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: '3px', bgcolor: color },
        '&:hover': onClick ? { transform: 'translateY(-2px)', boxShadow: `0 8px 24px ${color}20` } : {},
        boxShadow: isDark ? 'none' : '0 1px 4px rgba(0,0,0,0.06)',
    }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
            <Box sx={{ width: 36, height: 36, borderRadius: '9px', bgcolor: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-icons-round" style={{ color, fontSize: '18px' }}>{icon}</span>
            </Box>
        </Box>
        <Typography sx={{ fontSize: '28px', fontWeight: 800, lineHeight: 1, color: isDark ? '#f1f5f9' : '#0f172a' }}>{value ?? '…'}</Typography>
        <Typography sx={{ fontSize: '11px', fontWeight: 600, color: isDark ? '#64748b' : '#475569', mt: 0.4 }}>{title}</Typography>
        {sub && <Typography sx={{ fontSize: '10px', color: isDark ? '#475569' : '#94a3b8', mt: 0.2 }}>{sub}</Typography>}
    </Box>
);

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

const NavBtn = ({ route, label, navigate }) => (
    <Button size="small" onClick={() => navigate(route)}
        sx={{ fontSize: '11px', textTransform: 'none', color: '#667eea', px: 1, minWidth: 0 }}>
        {label} →
    </Button>
);

// ─── Main component ───────────────────────────────────────────────────────────
const CollaboratorOverview = () => {
    const { mode } = useContext(ThemeContext);
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const isDark = mode === 'dark';

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [widgets, setWidgets] = useState(loadWidgets);
    const { enqueueSnackbar } = useSnackbar();

    // Modal states
    const [isTaskOpen, setIsTaskOpen] = useState(false);
    const [isProjectOpen, setIsProjectOpen] = useState(false);
    const [isGmudOpen, setIsGmudOpen] = useState(false);
    const [isExpenseOpen, setIsExpenseOpen] = useState(false);
    const [isIncidentOpen, setIsIncidentOpen] = useState(false);
    const [taskAssignees, setTaskAssignees] = useState([]);

    useEffect(() => {
        getReferenceUsers().then(setTaskAssignees).catch(() => setTaskAssignees([]));
    }, []);

    const reload = useCallback(() => {
        setLoading(true);
        api.get('/dashboard/collaborator')
            .then(res => setData(res.data))
            .catch(e => console.error('[CollaboratorOverview]', e))
            .finally(() => setLoading(false));
    }, []);

    // Modal save handlers
    const handleSaveTask = async (d) => { try { await createGeneralTask(d); enqueueSnackbar('Tarefa criada!', { variant: 'success' }); setIsTaskOpen(false); reload(); } catch { enqueueSnackbar('Erro ao criar.', { variant: 'error' }); } };
    const handleSaveProject = async (d) => { try { await createProject(d); enqueueSnackbar('Projeto criado!', { variant: 'success' }); setIsProjectOpen(false); reload(); } catch { enqueueSnackbar('Erro ao criar.', { variant: 'error' }); } };
    const handleSaveGmud = async (d) => { try { await createChange(d); enqueueSnackbar('GMUD criada!', { variant: 'success' }); setIsGmudOpen(false); reload(); } catch { enqueueSnackbar('Erro ao criar.', { variant: 'error' }); } };
    const handleSaveExpense = async (d) => { try { await createExpense(d); enqueueSnackbar('Despesa lançada!', { variant: 'success' }); setIsExpenseOpen(false); reload(); } catch { enqueueSnackbar('Erro ao criar.', { variant: 'error' }); } };

    const handleWidgetsChange = useCallback((updated) => {
        setWidgets(updated);
        localStorage.setItem(COLLAB_WIDGETS_KEY, JSON.stringify(updated));
    }, []);
    const isOn = useCallback((id) => widgets.find(w => w.id === id)?.enabled ?? true, [widgets]);

    useEffect(() => { reload(); }, [reload]);

    // ── Theme ─────────────────────────────────────────────────────────────────
    const textPrimary = isDark ? '#f1f5f9' : '#0f172a';
    const textMuted = isDark ? '#64748b' : '#94a3b8';
    const labelColor = isDark ? '#475569' : '#94a3b8';

    // ── Derived ───────────────────────────────────────────────────────────────
    const kpis = data?.kpis || {};
    const myTasks = data?.myTasks || [];
    const myProjects = data?.myProjects || [];
    const gmuds = data?.upcomingGmuds || [];

    const overdueTasks = myTasks.filter(t =>
        t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'DONE' && t.status !== 'CANCELLED'
    );
    const pendingTasks = myTasks.filter(t => t.status !== 'DONE' && t.status !== 'CANCELLED');

    // Task distribution from myTasks
    const taskByStatus = myTasks.reduce((acc, t) => { acc[t.status] = (acc[t.status] || 0) + 1; return acc; }, {});
    const taskPie = [
        { id: 0, value: taskByStatus.TODO || 0, label: 'A Fazer', color: '#94a3b8' },
        { id: 1, value: taskByStatus.IN_PROGRESS || 0, label: 'Em Andamento', color: '#3b82f6' },
        { id: 2, value: taskByStatus.DONE || 0, label: 'Concluídas', color: '#10b981' },
        { id: 3, value: taskByStatus.CANCELLED || 0, label: 'Canceladas', color: '#475569' },
    ].filter(t => t.value > 0);

    // Project progress data for BarChart
    const projLabels = myProjects.slice(0, 6).map(p => p.name?.slice(0, 15) || 'Projeto');
    const projValues = myProjects.slice(0, 6).map(p => p.progress || 0);

    // Health score
    const totalTasks = myTasks.length;
    const donePct = totalTasks > 0 ? Math.round(((taskByStatus.DONE || 0) / totalTasks) * 100) : 0;
    const overduePct = totalTasks > 0 ? Math.round((overdueTasks.length / totalTasks) * 100) : 0;
    const healthScore = useMemo(() => Math.max(0, Math.min(100, donePct - overduePct + 50)), [donePct, overduePct]);
    const healthColor = healthScore >= 70 ? '#10b981' : healthScore >= 40 ? '#f59e0b' : '#ef4444';
    const healthLabel = healthScore >= 70 ? 'Ótimo' : healthScore >= 40 ? 'Regular' : 'Atenção';

    const greet = () => {
        const h = new Date().getHours();
        return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
    };

    const quickActions = useMemo(() => getQuickActions(user, {
        task: () => setIsTaskOpen(true),
        project: () => setIsProjectOpen(true),
        gmud: () => setIsGmudOpen(true),
        expense: () => setIsExpenseOpen(true),
        incident: () => setIsIncidentOpen(true),
    }), [user]);

    const priorityColor = (p) =>
        p === 'CRITICAL' ? '#ef4444' : p === 'HIGH' ? '#f97316' : p === 'MEDIUM' ? '#f59e0b' : '#94a3b8';

    const statusLabel = (s) =>
        ({ TODO: 'A Fazer', IN_PROGRESS: 'Em Andamento', DONE: 'Concluída', CANCELLED: 'Cancelada' }[s] || s);
    const statusColor = (s) =>
        ({ TODO: '#94a3b8', IN_PROGRESS: '#3b82f6', DONE: '#10b981', CANCELLED: '#475569' }[s] || '#94a3b8');

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <Box sx={{ minHeight: '100vh' }}>

            {/* ── HERO BANNER ────────────────────────────────────────────────── */}
            <Box sx={{
                mb: 3, p: { xs: 2, md: 3 }, borderRadius: '20px',
                background: isDark
                    ? 'linear-gradient(135deg, rgba(59,130,246,0.18) 0%, rgba(16,185,129,0.08) 100%)'
                    : 'linear-gradient(135deg, rgba(59,130,246,0.10) 0%, rgba(16,185,129,0.04) 100%)',
                border: isDark ? '1px solid rgba(59,130,246,0.25)' : '1px solid rgba(59,130,246,0.15)',
            }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
                    {/* Left */}
                    <Box>
                        <Typography sx={{ fontSize: '24px', fontWeight: 800, color: textPrimary, lineHeight: 1.1 }}>
                            {greet()}, {user?.name?.split(' ')[0] || 'Colaborador'} 👋
                        </Typography>
                        <Typography sx={{ fontSize: '13px', color: textMuted, mt: 0.5 }}>
                            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </Typography>

                        {/* Summary pills */}
                        <Box sx={{ display: 'flex', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
                            {overdueTasks.length > 0 && (
                                <Chip label={`${overdueTasks.length} atrasadas`} size="small"
                                    sx={{ bgcolor: 'rgba(239,68,68,0.12)', color: '#ef4444', fontWeight: 700, fontSize: '11px' }} />
                            )}
                            {kpis.completedThisMonth > 0 && (
                                <Chip label={`${kpis.completedThisMonth} concluídas este mês`} size="small"
                                    sx={{ bgcolor: 'rgba(16,185,129,0.12)', color: '#10b981', fontWeight: 700, fontSize: '11px' }} />
                            )}
                            {kpis.pendingApprovalCount > 0 && (
                                <Chip label={`${kpis.pendingApprovalCount} aguardando aprovação`} size="small"
                                    sx={{ bgcolor: 'rgba(245,158,11,0.12)', color: '#f59e0b', fontWeight: 700, fontSize: '11px' }} />
                            )}
                        </Box>

                        {/* Quick actions */}
                        <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
                            {quickActions.map((qa, i) => (
                                <QA key={i} {...qa} navigate={navigate} />
                            ))}
                        </Box>
                    </Box>

                    {/* Right: Customizer + Health Score */}
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                        <DashboardCustomizer widgets={widgets} onWidgetsChange={handleWidgetsChange} isDark={isDark} />

                        <Box sx={{ textAlign: 'center', minWidth: 100 }}>
                            <Box sx={{ position: 'relative', width: 100, height: 100, mx: 'auto', mb: 0.5 }}>
                                <svg width="100" height="100" style={{ transform: 'rotate(-90deg)' }}>
                                    <circle cx="50" cy="50" r="40" fill="none"
                                        stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}
                                        strokeWidth="8" />
                                    <circle cx="50" cy="50" r="40" fill="none"
                                        stroke={healthColor} strokeWidth="8"
                                        strokeDasharray={`${2 * Math.PI * 40}`}
                                        strokeDashoffset={`${2 * Math.PI * 40 * (1 - healthScore / 100)}`}
                                        strokeLinecap="round"
                                        style={{ transition: 'stroke-dashoffset 1s ease' }} />
                                </svg>
                                <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                    <Typography sx={{ fontSize: '22px', fontWeight: 800, color: healthColor, lineHeight: 1 }}>
                                        {healthScore}
                                    </Typography>
                                    <Typography sx={{ fontSize: '9px', color: textMuted, fontWeight: 600 }}>SCORE</Typography>
                                </Box>
                            </Box>
                            <Typography sx={{ fontSize: '12px', fontWeight: 700, color: healthColor }}>{healthLabel}</Typography>
                            <Typography sx={{ fontSize: '10px', color: textMuted }}>Produtividade</Typography>
                        </Box>
                    </Box>
                </Box>
            </Box>

            {/* ── KPI STRIP ──────────────────────────────────────────────────── */}
            {isOn('kpis') && (
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 1.5, mb: 3 }}>
                    <MetricCard title="Minhas Tarefas" value={kpis.tasks} icon="task_alt" color="#3b82f6" onClick={() => navigate('/tasks')} isDark={isDark} sub={`${pendingTasks.length} pendentes`} />
                    <MetricCard title="Concluídas este Mês" value={kpis.completedThisMonth} icon="check_circle" color="#10b981" onClick={() => navigate('/tasks')} isDark={isDark} sub="realizações pessoais" />
                    <MetricCard title="Tarefas Atrasadas" value={kpis.overdueCount} icon="warning" color="#ef4444" onClick={() => navigate('/tasks')} isDark={isDark} sub="requer atenção" highlight={kpis.overdueCount > 0} />
                    <MetricCard title="Aprovações Pendentes" value={kpis.pendingApprovalCount} icon="pending_actions" color="#f59e0b" isDark={isDark} sub="aguardando revisão" highlight={kpis.pendingApprovalCount > 0} />
                    <MetricCard title="Meus Projetos" value={kpis.projects} icon="folder_special" color="#8b5cf6" onClick={() => navigate('/projects')} isDark={isDark} sub={`${myProjects.length} com progresso`} />
                    <MetricCard title="GMUDs" value={kpis.gmuds} icon="published_with_changes" color="#6366f1" onClick={() => navigate('/change-requests')} isDark={isDark} sub="participações" />
                </Box>
            )}

            {/* ── CHARTS ROW ─────────────────────────────────────────────────── */}
            {(isOn('tasks') || isOn('projects')) && (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 2fr' }, gap: 2.5, mb: 3 }}>

                    {/* Task distribution donut */}
                    {isOn('tasks') && (
                        <ChartCard isDark={isDark}>
                            <SectionHeader icon="task_alt" title="Minhas Tarefas" iconColor="#3b82f6"
                                action={<NavBtn route="/tasks" label="Ver todas" navigate={navigate} />} isDark={isDark} />
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                {taskPie.length > 0 ? (
                                    <>
                                        <PieChart
                                            series={[{ data: taskPie, innerRadius: 36, outerRadius: 58, paddingAngle: 2, cornerRadius: 4, cx: 62, cy: 62 }]}
                                            width={125} height={125}
                                            margin={{ top: 0, bottom: 0, left: 0, right: 0 }}
                                            slotProps={{ legend: { hidden: true } }}
                                        />
                                        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                                            {taskPie.map(d => (
                                                <Box key={d.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                                    <Box sx={{ width: 8, height: 8, borderRadius: '2px', bgcolor: d.color, flexShrink: 0 }} />
                                                    <Typography sx={{ fontSize: '12px', color: textPrimary, flex: 1 }}>{d.label}</Typography>
                                                    <Typography sx={{ fontSize: '12px', fontWeight: 700, color: textPrimary }}>{d.value}</Typography>
                                                </Box>
                                            ))}
                                            <Box sx={{ mt: 0.5, pt: 0.5, borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}` }}>
                                                <Typography sx={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>
                                                    {donePct}% concluídas
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </>
                                ) : (
                                    <Box sx={{ py: 2, width: '100%', textAlign: 'center' }}>
                                        <span className="material-icons-round" style={{ fontSize: '36px', color: labelColor, opacity: 0.3, display: 'block' }}>task_alt</span>
                                        <Typography sx={{ fontSize: '12px', color: textMuted, mt: 0.5 }}>Sem tarefas atribuídas</Typography>
                                    </Box>
                                )}
                            </Box>
                        </ChartCard>
                    )}

                    {/* Projects progress bar chart */}
                    {isOn('projects') && (
                        <ChartCard isDark={isDark}>
                            <SectionHeader icon="folder_special" title="Progresso dos Projetos" iconColor="#8b5cf6"
                                action={<NavBtn route="/projects" label="Ver todos" navigate={navigate} />} isDark={isDark} />
                            {projLabels.length > 0 ? (
                                <BarChart
                                    layout="horizontal"
                                    xAxis={[{
                                        scaleType: 'linear', min: 0, max: 100, tickLabelStyle: { fill: labelColor, fontSize: 10 },
                                        valueFormatter: (v) => `${v}%`
                                    }]}
                                    yAxis={[{ scaleType: 'band', data: projLabels, tickLabelStyle: { fill: labelColor, fontSize: 10 } }]}
                                    series={[{ data: projValues, label: 'Progresso', color: '#8b5cf6' }]}
                                    height={Math.max(180, projLabels.length * 36)}
                                    margin={{ top: 5, bottom: 30, left: 100, right: 30 }}
                                    slotProps={{ legend: { hidden: true } }}
                                    sx={{ '& .MuiBarElement-root': { rx: 4 } }}
                                />
                            ) : (
                                <Box sx={{ py: 4, textAlign: 'center' }}>
                                    <span className="material-icons-round" style={{ fontSize: '36px', color: labelColor, opacity: 0.3, display: 'block' }}>folder_open</span>
                                    <Typography sx={{ fontSize: '12px', color: textMuted, mt: 0.5 }}>Nenhum projeto encontrado</Typography>
                                </Box>
                            )}
                        </ChartCard>
                    )}
                </Box>
            )}

            {/* ── OVERDUE TASKS + GMUDS ──────────────────────────────────────── */}
            {(isOn('overdue') || isOn('gmuds')) && (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.5, mb: 3 }}>

                    {/* Overdue tasks  */}
                    {isOn('overdue') && (
                        <ChartCard isDark={isDark}>
                            <SectionHeader icon="warning" title="Tarefas que Precisam de Atenção" iconColor="#ef4444"
                                action={<NavBtn route="/tasks" label="Ver todas" navigate={navigate} />} isDark={isDark} />
                            {overdueTasks.length === 0 && pendingTasks.length === 0 ? (
                                <Box sx={{ py: 3, textAlign: 'center' }}>
                                    <span className="material-icons-round" style={{ fontSize: '36px', color: '#10b981', opacity: 0.5, display: 'block' }}>check_circle</span>
                                    <Typography sx={{ fontSize: '13px', color: '#10b981', mt: 0.5, fontWeight: 600 }}>Tudo em dia! 🎉</Typography>
                                </Box>
                            ) : (
                                <Box sx={{
                                    display: 'flex', flexDirection: 'column', gap: 0.75, maxHeight: 260, overflowY: 'auto',
                                    '&::-webkit-scrollbar': { width: '3px' },
                                    '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(239,68,68,0.3)', borderRadius: '3px' }
                                }}>
                                    {[...overdueTasks, ...pendingTasks.filter(t => !overdueTasks.includes(t))].slice(0, 10).map((t, i) => {
                                        const isOverdue = overdueTasks.includes(t);
                                        const dueDateInfo = t.dueDate ? formatDueDate(t.dueDate) : null;
                                        return (
                                            <Box key={t.id || i} onClick={() => navigate('/tasks')} sx={{
                                                p: 1.25, borderRadius: '10px', display: 'flex', gap: 1.5, alignItems: 'center',
                                                bgcolor: isOverdue
                                                    ? isDark ? 'rgba(239,68,68,0.08)' : 'rgba(239,68,68,0.04)'
                                                    : isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                                                border: `1px solid ${isOverdue ? 'rgba(239,68,68,0.25)' : 'transparent'}`,
                                                cursor: 'pointer', transition: 'all 0.13s',
                                                '&:hover': { borderColor: 'rgba(59,130,246,0.3)', bgcolor: isDark ? 'rgba(59,130,246,0.06)' : 'rgba(59,130,246,0.04)' }
                                            }}>
                                                <Box sx={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, bgcolor: priorityColor(t.priority) }} />
                                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                                    <Typography sx={{ fontSize: '12px', fontWeight: 600, color: isOverdue ? '#ef4444' : textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {isOverdue && '⚠ '}{t.title}
                                                    </Typography>
                                                    <Typography sx={{ fontSize: '10px', color: isOverdue ? '#ef4444' : textMuted }}>
                                                        {t.dueDate ? (dueDateInfo?.label || '') : 'Sem prazo'}
                                                    </Typography>
                                                </Box>
                                                <Chip label={statusLabel(t.status)} size="small"
                                                    sx={{ height: 18, fontSize: '9px', bgcolor: `${statusColor(t.status)}18`, color: statusColor(t.status), fontWeight: 700 }} />
                                            </Box>
                                        );
                                    })}
                                </Box>
                            )}
                        </ChartCard>
                    )}

                    {/* Upcoming GMUDs */}
                    {isOn('gmuds') && (
                        <ChartCard isDark={isDark}>
                            <SectionHeader icon="published_with_changes" title="GMUDs Próximas" iconColor="#6366f1"
                                action={<NavBtn route="/change-requests" label="Ver todas" navigate={navigate} />} isDark={isDark} />
                            {gmuds.length === 0 ? (
                                <Box sx={{ py: 3, textAlign: 'center' }}>
                                    <span className="material-icons-round" style={{ fontSize: '36px', color: labelColor, opacity: 0.3, display: 'block' }}>event_available</span>
                                    <Typography sx={{ fontSize: '13px', color: textMuted, mt: 0.5 }}>Nenhuma GMUD programada</Typography>
                                </Box>
                            ) : (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                                    {gmuds.slice(0, 6).map((g, i) => {
                                        const daysUntil = g.scheduledDate
                                            ? Math.ceil((new Date(g.scheduledDate) - new Date()) / 86400000)
                                            : null;
                                        const dc = daysUntil !== null && daysUntil <= 1 ? '#ef4444'
                                            : daysUntil <= 3 ? '#f59e0b' : '#6366f1';
                                        return (
                                            <Box key={g.id || i} onClick={() => navigate('/change-requests')} sx={{
                                                p: 1.25, borderRadius: '10px', display: 'flex', gap: 1.25, alignItems: 'center',
                                                bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                                                border: '1px solid transparent', cursor: 'pointer', transition: 'all 0.13s',
                                                '&:hover': { borderColor: 'rgba(99,102,241,0.3)', bgcolor: 'rgba(99,102,241,0.06)' }
                                            }}>
                                                <Box sx={{ width: 34, height: 34, borderRadius: '8px', bgcolor: `${dc}15`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                    <Typography sx={{ fontSize: '12px', fontWeight: 800, color: dc, lineHeight: 1 }}>
                                                        {daysUntil !== null ? daysUntil : '?'}
                                                    </Typography>
                                                    <Typography sx={{ fontSize: '8px', color: dc, fontWeight: 600 }}>dias</Typography>
                                                </Box>
                                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                                    <Typography sx={{ fontSize: '12px', fontWeight: 600, color: textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {g.title}
                                                    </Typography>
                                                    <Typography sx={{ fontSize: '10px', color: textMuted }}>
                                                        {g.scheduledDate ? new Date(g.scheduledDate).toLocaleDateString('pt-BR') : 'Sem data'}
                                                    </Typography>
                                                </Box>
                                                <Chip label={g.status || 'AGENDADA'} size="small"
                                                    sx={{ height: 18, fontSize: '9px', bgcolor: 'rgba(99,102,241,0.12)', color: '#6366f1', fontWeight: 700 }} />
                                            </Box>
                                        );
                                    })}
                                </Box>
                            )}
                        </ChartCard>
                    )}
                </Box>
            )}

            {/* ── ACTIVITY FEED ──────────────────────────────────────────────── */}
            {isOn('activity') && (
                <ChartCard isDark={isDark}>
                    <SectionHeader icon="history" title="Minhas Atividades Recentes" iconColor="#667eea" isDark={isDark} />
                    <ActivityFeed isDark={isDark} maxHeight={280} showModuleFilter={false} compact userId={user?.id} />
                </ChartCard>
            )}

            {/* ── MODALS ─────────────────────────────────────────────────────── */}
            <TaskModal
                open={isTaskOpen}
                onClose={() => setIsTaskOpen(false)}
                onSave={handleSaveTask}
                isGeneralTask={true}
                members={taskAssignees.map((u) => ({ user: u }))}
            />
            <ProjectModal open={isProjectOpen} onClose={() => setIsProjectOpen(false)} onSave={handleSaveProject} />
            <ChangeModal open={isGmudOpen} onClose={() => setIsGmudOpen(false)} onSave={handleSaveGmud} />
            <ExpenseModal open={isExpenseOpen} onClose={() => setIsExpenseOpen(false)} onSave={handleSaveExpense} />
        </Box>
    );
};

export default CollaboratorOverview;
