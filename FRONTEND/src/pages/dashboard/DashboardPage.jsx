import { useState, useEffect, useContext, useCallback } from 'react';
import { Box, Typography, Button, Chip, Avatar } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ThemeContext } from '../../contexts/ThemeContext';
import { AuthContext } from '../../contexts/AuthContext';
// Removed usePermission

// Dashboard components
import DashboardWidget from '../../components/dashboard/DashboardWidget';
import ActivityFeed from '../../components/dashboard/ActivityFeed';
import DashboardCustomizer, { loadWidgetConfig, saveWidgetConfig } from '../../components/dashboard/DashboardCustomizer';

// Services
import api from '../../services/api';
import { getIncidentKPIs } from '../../services/incident.service';
import { formatRelative } from '../../utils/dateUtils';
import { rolesHasAnyPermissionInModule, roleIsAdminBypass } from '../../utils/rbacPermissions';

// ─── Widget master definition (id matches permission module key) ───────────────
const ALL_WIDGETS = [
    { id: 'my-tasks', label: 'Minhas Tarefas', icon: 'task_alt', color: '#3b82f6', module: null, col: 'half', defaultOn: true },
    { id: 'approvals', label: 'Aprovações Pendentes', icon: 'pending_actions', color: '#8b5cf6', module: null, col: 'half', defaultOn: true },
    { id: 'incidents', label: 'KPIs de Incidentes', icon: 'warning', color: '#f59e0b', module: 'INCIDENT', col: 'full', defaultOn: true },
    { id: 'risks', label: 'Riscos Críticos', icon: 'shield', color: '#ef4444', module: 'RISKS', col: 'half', defaultOn: true },
    { id: 'sla', label: 'Alertas de SLA', icon: 'timer_off', color: '#ef4444', module: 'INCIDENT', col: 'half', defaultOn: true },
    { id: 'assets', label: 'Ativos em Manutenção', icon: 'inventory_2', color: '#06b6d4', module: 'ASSETS', col: 'half', defaultOn: true },
    { id: 'contracts', label: 'Contratos Vencendo', icon: 'description', color: '#10b981', module: 'CONTRACTS', col: 'half', defaultOn: true },
    { id: 'changes', label: 'GMUDs Pendentes', icon: 'published_with_changes', color: '#6366f1', module: 'GMUD', col: 'half', defaultOn: false },
    { id: 'projects', label: 'Projetos Ativos', icon: 'folder_special', color: '#8b5cf6', module: 'PROJECTS', col: 'half', defaultOn: false },
    { id: 'activity', label: 'Timeline de Atividade', icon: 'history', color: '#667eea', module: null, col: 'full', defaultOn: true },
];

const STORAGE_KEY = 'g360_dashboard_widgets_v2';

// Helper: load config merged with latest master list, filtered by accessible modules
const buildWidgetConfig = (accessibleIds) => {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        return ALL_WIDGETS
            .filter(w => !w.module || accessibleIds.includes(w.id))
            .map(w => ({ ...w, enabled: saved[w.id] !== undefined ? saved[w.id] : w.defaultOn }));
    } catch {
        return ALL_WIDGETS
            .filter(w => !w.module || accessibleIds.includes(w.id))
            .map(w => ({ ...w, enabled: w.defaultOn }));
    }
};

const DashboardPage = () => {
    const { mode } = useContext(ThemeContext);
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const isDark = mode === 'dark';

    const canReadModule = (mod) => {
        if (!user) return false;
        const roles = user.roles || [];
        if (roles.some(roleIsAdminBypass)) return true;
        return rolesHasAnyPermissionInModule(roles, mod);
    };

    const incidentPerm = { canRead: canReadModule('INCIDENT') };
    const riskPerm = { canRead: canReadModule('RISKS') };
    const assetPerm = { canRead: canReadModule('ASSETS') };
    const contractPerm = { canRead: canReadModule('CONTRACTS') };
    const changePerm = { canRead: canReadModule('GMUD') };
    const projectPerm = { canRead: canReadModule('PROJECTS') };

    // Build list of widget IDs this user can access (module-gated ones)
    const accessibleIds = [
        'my-tasks', 'approvals', 'activity',
        ...(incidentPerm.canRead ? ['incidents', 'sla'] : []),
        ...(riskPerm.canRead ? ['risks'] : []),
        ...(assetPerm.canRead ? ['assets'] : []),
        ...(contractPerm.canRead ? ['contracts'] : []),
        ...(changePerm.canRead ? ['changes'] : []),
        ...(projectPerm.canRead ? ['projects'] : []),
    ];

    const [widgets, setWidgets] = useState(() => buildWidgetConfig(accessibleIds));

    // Re-filter if permissions change (e.g. after user switch)
    useEffect(() => {
        setWidgets(buildWidgetConfig(accessibleIds));
    }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleWidgetsChange = (updated) => {
        setWidgets(updated);
        const map = {};
        updated.forEach(w => { map[w.id] = w.enabled; });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    };

    // ── Data ──────────────────────────────────────────────────────────────────
    const [incidentKPIs, setIncidentKPIs] = useState(null);
    const [myTasks, setMyTasks] = useState([]);
    const [risks, setRisks] = useState([]);
    const [approvals, setApprovals] = useState([]);
    const [assets, setAssets] = useState({ maintenance: 0, inactive: 0 });
    const [contracts, setContracts] = useState([]);
    const [changes, setChanges] = useState([]);
    const [projects, setProjects] = useState([]);

    const [loadingMap, setLoadingMap] = useState({});
    const setLoading = (key, val) => setLoadingMap(p => ({ ...p, [key]: val }));

    const isEnabled = (id) => widgets.find(w => w.id === id)?.enabled ?? false;

    const load = useCallback(async (key, fn) => {
        setLoading(key, true);
        try { await fn(); } catch (e) { console.error(`[widget:${key}]`, e); }
        finally { setLoading(key, false); }
    }, []);

    useEffect(() => {
        if (isEnabled('incidents') && incidentPerm.canRead) load('incidents', async () => setIncidentKPIs(await getIncidentKPIs()));
        if (isEnabled('my-tasks')) load('my-tasks', async () => { const r = await api.get('/tasks?assignedToMe=true&limit=6'); setMyTasks(Array.isArray(r.data) ? r.data : r.data?.tasks || []); });
        if (isEnabled('risks') && riskPerm.canRead) load('risks', async () => { const r = await api.get('/corporate-risks?limit=5'); setRisks(Array.isArray(r.data) ? r.data.slice(0, 5) : []); });
        if (isEnabled('approvals')) load('approvals', async () => { const r = await api.get('/approvals/pending'); setApprovals(Array.isArray(r.data) ? r.data.slice(0, 5) : []); });
        if (isEnabled('assets') && assetPerm.canRead) load('assets', async () => { const r = await api.get('/assets?status=MANUTENCAO&limit=5'); setAssets({ list: Array.isArray(r.data) ? r.data.slice(0, 5) : [], count: Array.isArray(r.data) ? r.data.length : 0 }); });
        if (isEnabled('contracts') && contractPerm.canRead) load('contracts', async () => { const r = await api.get('/contracts?expiringSoon=true&limit=5'); setContracts(Array.isArray(r.data) ? r.data.slice(0, 5) : (r.data?.contracts || []).slice(0, 5)); });
        if (isEnabled('changes') && changePerm.canRead) load('changes', async () => { const r = await api.get('/change-requests?status=PENDING_APPROVAL&limit=5'); setChanges(Array.isArray(r.data) ? r.data.slice(0, 5) : []); });
        if (isEnabled('projects') && projectPerm.canRead) load('projects', async () => { const r = await api.get('/projects?status=IN_PROGRESS&limit=5'); setProjects(Array.isArray(r.data) ? r.data.slice(0, 5) : (r.data?.projects || []).slice(0, 5)); });
    }, [widgets]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Theme ─────────────────────────────────────────────────────────────────
    const textPrimary = isDark ? '#f1f5f9' : '#0f172a';
    const textSecondary = isDark ? '#64748b' : '#475569';
    const textMuted = isDark ? '#94a3b8' : '#64748b';

    const getPriorityColor = (p) => ({ CRITICAL: '#ef4444', HIGH: '#f97316', MEDIUM: '#3b82f6', LOW: '#94a3b8' })[p] || '#94a3b8';

    const getHour = () => {
        const h = new Date().getHours();
        if (h < 12) return 'Bom dia';
        if (h < 18) return 'Boa tarde';
        return 'Boa noite';
    };

    // small reusable empty state
    const Empty = ({ icon, text }) => (
        <Box sx={{ textAlign: 'center', py: 3, color: textMuted }}>
            <span className="material-icons-round" style={{ fontSize: '32px', display: 'block', opacity: 0.35, marginBottom: '8px' }}>{icon}</span>
            <Typography fontSize={13}>{text}</Typography>
        </Box>
    );

    // small list item
    const ListItem = ({ title, sub, dot, onClick }) => (
        <Box onClick={onClick} sx={{
            p: 1.5, borderRadius: '10px', cursor: 'pointer',
            bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
            border: '1px solid transparent',
            '&:hover': { bgcolor: isDark ? 'rgba(102,126,234,0.08)' : 'rgba(102,126,234,0.05)', borderColor: 'rgba(102,126,234,0.2)' },
            display: 'flex', alignItems: 'center', gap: 1.5, transition: 'all 0.15s',
        }}>
            {dot && <Box sx={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, bgcolor: dot }} />}
            <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontSize: '13px', fontWeight: 600, color: textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</Typography>
                {sub && <Typography sx={{ fontSize: '11px', color: textMuted, mt: 0.2 }}>{sub}</Typography>}
            </Box>
        </Box>
    );

    const NavBtn = ({ route, label }) => (
        <Button size="small" onClick={() => navigate(route)} sx={{ fontSize: '12px', textTransform: 'none', color: '#667eea', minWidth: 0 }}>{label}</Button>
    );

    // ── KPI cards for incidents (with trend + MTTR) ──────────────────────────
    const Trend = ({ val }) => {
        if (val === null || val === undefined) return null;
        const isUp = val > 0;
        const isNeutral = val === 0;
        const color = isNeutral ? textMuted : isUp ? '#ef4444' : '#10b981';
        const arrow = isNeutral ? '─' : isUp ? '↑' : '↓';
        return (
            <Box sx={{
                display: 'inline-flex', alignItems: 'center', gap: 0.25, mt: 0.5,
                bgcolor: isNeutral ? 'rgba(100,116,139,0.1)' : isUp ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                px: 0.75, py: 0.25, borderRadius: '6px'
            }}>
                <Typography sx={{ fontSize: '10px', fontWeight: 700, color }}>
                    {arrow} {Math.abs(val)}% vs 7 dias
                </Typography>
            </Box>
        );
    };

    const kpiItems = incidentKPIs ? [
        { label: 'Abertos', value: incidentKPIs.open, color: '#f59e0b', icon: 'warning', trend: incidentKPIs.trendOpen },
        { label: 'Em Andamento', value: incidentKPIs.inProgress, color: '#3b82f6', icon: 'loop', trend: null },
        { label: 'Resolvidos Hoje', value: incidentKPIs.resolvedToday, color: '#10b981', icon: 'check_circle', trend: incidentKPIs.trendResolved },
        { label: 'SLA Estourado', value: incidentKPIs.slaBreached, color: '#ef4444', icon: 'timer_off', trend: null },
        ...(incidentKPIs.mttrHours !== null && incidentKPIs.mttrHours !== undefined
            ? [{ label: 'MTTR Médio', value: `${incidentKPIs.mttrHours}h`, color: '#8b5cf6', icon: 'schedule', trend: null }]
            : []
        ),
    ] : [];

    // Overdue check helper
    const isOverdue = (task) => task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE';
    const sortedTasks = [...myTasks].sort((a, b) => {
        const aOvd = isOverdue(a) ? 0 : 1;
        const bOvd = isOverdue(b) ? 0 : 1;
        return aOvd - bOvd;
    });

    // Days until contract expiry semaphore
    const contractDaysBadge = (endDate) => {
        if (!endDate) return null;
        const days = Math.ceil((new Date(endDate) - new Date()) / 86400000);
        const color = days <= 7 ? '#ef4444' : days <= 30 ? '#f59e0b' : '#10b981';
        return <Box component="span" sx={{ fontSize: '10px', fontWeight: 700, color, bgcolor: `${color}15`, px: 0.75, py: 0.2, borderRadius: '5px', ml: 0.5 }}>{days}d</Box>;
    };

    // Count badge helper for widget headers
    const CountBadge = ({ count, color = '#667eea' }) => count > 0 ? (
        <Chip label={count} size="small" sx={{ height: 18, fontSize: '10px', bgcolor: `${color}18`, color, fontWeight: 700, mr: 0.5 }} />
    ) : null;

    // ── Half-width widgets ────────────────────────────────────────────────────
    const halfWidgets = ['my-tasks', 'risks', 'sla', 'approvals', 'assets', 'contracts', 'changes', 'projects'];
    const enabledHalf = halfWidgets.filter(id => isEnabled(id));

    return (
        <Box sx={{ minHeight: '100vh' }}>
            {/* ── Page Header ─────────────────────────────────────────────── */}
            <Box sx={{
                mb: 3, p: 3, borderRadius: '16px',
                background: isDark
                    ? 'linear-gradient(135deg, rgba(102,126,234,0.12) 0%, rgba(102,126,234,0.04) 100%)'
                    : 'linear-gradient(135deg, rgba(102,126,234,0.08) 0%, rgba(102,126,234,0.02) 100%)',
                border: isDark ? '1px solid rgba(102,126,234,0.2)' : '1px solid rgba(102,126,234,0.15)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap',
            }}>
                <Box>
                    <Typography sx={{ fontSize: '22px', fontWeight: 700, color: textPrimary }}>
                        {getHour()}{user?.name ? `, ${user.name.split(' ')[0]}` : ''}! 👋
                    </Typography>
                    <Typography sx={{ fontSize: '14px', color: textSecondary, mt: 0.5 }}>
                        {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </Typography>
                </Box>
                <DashboardCustomizer widgets={widgets} onWidgetsChange={handleWidgetsChange} isDark={isDark} />
            </Box>

            {/* ── WIDGET: Incident KPIs (full-width) ──────────────────────── */}
            {isEnabled('incidents') && incidentPerm.canRead && (
                <Box sx={{ mb: 3 }}>
                    <DashboardWidget title="KPIs de Incidentes" icon="warning" iconColor="#f59e0b" loading={loadingMap['incidents']} isDark={isDark}
                        action={<NavBtn route="/incidents" label="Ver todos" />}>
                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 2 }}>
                            {kpiItems.map(item => (
                                <Box key={item.label} onClick={() => navigate('/incidents')} sx={{
                                    p: 2, borderRadius: '12px', cursor: 'pointer',
                                    bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                                    border: `1px solid ${item.color}25`,
                                    transition: 'all 0.2s',
                                    '&:hover': { transform: 'translateY(-2px)', borderColor: `${item.color}60` }
                                }}>
                                    <Box sx={{ width: 28, height: 28, borderRadius: '7px', bgcolor: `${item.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.color, mb: 1 }}>
                                        <span className="material-icons-round" style={{ fontSize: '15px' }}>{item.icon}</span>
                                    </Box>
                                    <Typography sx={{ fontSize: '28px', fontWeight: 700, color: textPrimary, lineHeight: 1 }}>{item.value ?? '–'}</Typography>
                                    <Typography sx={{ fontSize: '11px', color: textSecondary, mt: 0.5 }}>{item.label}</Typography>
                                    <Trend val={item.trend} />
                                </Box>
                            ))}
                        </Box>
                    </DashboardWidget>
                </Box>
            )}

            {/* ── HALF-WIDTH widget grid ────────────────────────────────────── */}
            {enabledHalf.length > 0 && (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.5, mb: 3 }}>

                    {isEnabled('my-tasks') && (
                        <DashboardWidget title="Minhas Tarefas" icon="task_alt" iconColor="#3b82f6" loading={loadingMap['my-tasks']} isDark={isDark} minHeight={260}
                            action={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    {sortedTasks.filter(isOverdue).length > 0 && <CountBadge count={sortedTasks.filter(isOverdue).length} color="#ef4444" />}
                                    <NavBtn route="/tasks" label="Ver todas" />
                                </Box>
                            }>
                            {sortedTasks.length === 0
                                ? <Empty icon="task_alt" text="Nenhuma tarefa pendente" />
                                : <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                                    {sortedTasks.map(t => {
                                        const overdue = isOverdue(t);
                                        return (
                                            <Box key={t.id} onClick={() => navigate('/tasks')} sx={{
                                                p: 1.5, borderRadius: '10px', cursor: 'pointer',
                                                bgcolor: overdue
                                                    ? isDark ? 'rgba(239,68,68,0.08)' : 'rgba(239,68,68,0.05)'
                                                    : isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                                                border: `1px solid ${overdue ? 'rgba(239,68,68,0.25)' : 'transparent'}`,
                                                '&:hover': { bgcolor: isDark ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.05)', borderColor: 'rgba(59,130,246,0.2)' },
                                                display: 'flex', alignItems: 'center', gap: 1.5, transition: 'all 0.15s',
                                            }}>
                                                <Box sx={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, bgcolor: overdue ? '#ef4444' : getPriorityColor(t.priority) }} />
                                                <Box sx={{ minWidth: 0, flex: 1 }}>
                                                    <Typography sx={{ fontSize: '13px', fontWeight: 600, color: overdue ? '#ef4444' : textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</Typography>
                                                    <Typography sx={{ fontSize: '11px', color: overdue ? '#ef4444' : textMuted, mt: 0.2 }}>
                                                        {overdue ? '⚠ Atrasada' : t.dueDate ? formatRelative(t.dueDate) : 'Sem prazo'}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        );
                                    })}
                                </Box>}
                        </DashboardWidget>
                    )}

                    {isEnabled('approvals') && (
                        <DashboardWidget title="Aprovações Pendentes" icon="pending_actions" iconColor="#8b5cf6" loading={loadingMap['approvals']} isDark={isDark} minHeight={260}
                            action={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    {approvals.length > 0 && <Chip label={approvals.length} size="small" sx={{ height: 18, fontSize: '10px', bgcolor: 'rgba(139,92,246,0.15)', color: '#8b5cf6', fontWeight: 700 }} />}
                                    <NavBtn route="/approvals" label="Ver todas" />
                                </Box>
                            }>
                            {approvals.length === 0
                                ? <Empty icon="check_circle" text="Sem aprovações pendentes" />
                                : <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                                    {approvals.map(ap => <ListItem key={ap.id} title={ap.title || ap.expenseCategory || 'Solicitação'} sub={`${ap.requester?.name || 'Sistema'} · ${formatRelative(ap.createdAt)}`} onClick={() => navigate('/approvals')} />)}
                                </Box>}
                        </DashboardWidget>
                    )}

                    {isEnabled('risks') && riskPerm.canRead && (
                        <DashboardWidget title="Riscos Críticos" icon="shield" iconColor="#ef4444" loading={loadingMap['risks']} isDark={isDark} minHeight={260}
                            action={<NavBtn route="/risks" label="Ver todos" />}>
                            {risks.length === 0
                                ? <Empty icon="shield" text="Nenhum risco crítico identificado" />
                                : <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                                    {risks.map(r => {
                                        const sev = r.severity || 0;
                                        const dot = sev <= 4 ? '#10b981' : sev <= 9 ? '#f59e0b' : '#ef4444';
                                        return <ListItem key={r.id} title={r.title} sub={`Severidade: ${sev} · ${r.category || ''}`} dot={dot} onClick={() => navigate('/risks')} />;
                                    })}
                                </Box>}
                        </DashboardWidget>
                    )}

                    {isEnabled('assets') && assetPerm.canRead && (
                        <DashboardWidget title="Ativos em Manutenção" icon="inventory_2" iconColor="#06b6d4" loading={loadingMap['assets']} isDark={isDark} minHeight={260}
                            action={<NavBtn route="/assets" label="Ver todos" />}>
                            {!assets.list?.length
                                ? <Empty icon="check_circle" text="Nenhum ativo em manutenção" />
                                : <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                                    {assets.list.map(a => <ListItem key={a.id} title={a.name} sub={a.location || a.code || '–'} dot="#f59e0b" onClick={() => navigate('/assets')} />)}
                                </Box>}
                        </DashboardWidget>
                    )}

                    {isEnabled('contracts') && contractPerm.canRead && (
                        <DashboardWidget title="Contratos Vencendo" icon="description" iconColor="#10b981" loading={loadingMap['contracts']} isDark={isDark} minHeight={260}
                            action={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <CountBadge count={contracts.length} color="#f59e0b" />
                                    <NavBtn route="/contracts" label="Ver todos" />
                                </Box>
                            }>
                            {contracts.length === 0
                                ? <Empty icon="check_circle" text="Sem contratos vencendo" />
                                : <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                                    {contracts.map(c => {
                                        const days = c.endDate ? Math.ceil((new Date(c.endDate) - new Date()) / 86400000) : null;
                                        const urgentColor = days !== null && days <= 7 ? '#ef4444' : days !== null && days <= 30 ? '#f59e0b' : '#94a3b8';
                                        return (
                                            <Box key={c.id} onClick={() => navigate('/contracts')} sx={{
                                                p: 1.5, borderRadius: '10px', cursor: 'pointer',
                                                bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                                                border: `1px solid ${days !== null && days <= 7 ? 'rgba(239,68,68,0.25)' : 'transparent'}`,
                                                '&:hover': { bgcolor: isDark ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.05)', borderColor: 'rgba(16,185,129,0.2)' },
                                                display: 'flex', alignItems: 'center', gap: 1, transition: 'all 0.15s',
                                            }}>
                                                <Box sx={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, bgcolor: urgentColor }} />
                                                <Box sx={{ minWidth: 0, flex: 1 }}>
                                                    <Typography sx={{ fontSize: '13px', fontWeight: 600, color: textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {c.name || c.title || c.contractNumber}
                                                    </Typography>
                                                </Box>
                                                {days !== null && (
                                                    <Box sx={{ flexShrink: 0, fontSize: '11px', fontWeight: 700, color: urgentColor, bgcolor: `${urgentColor}15`, px: 1, py: 0.25, borderRadius: '6px' }}>
                                                        {days}d
                                                    </Box>
                                                )}
                                            </Box>
                                        );
                                    })}
                                </Box>}
                        </DashboardWidget>
                    )}

                    {isEnabled('changes') && changePerm.canRead && (
                        <DashboardWidget title="GMUDs Pendentes" icon="published_with_changes" iconColor="#6366f1" loading={loadingMap['changes']} isDark={isDark} minHeight={260}
                            action={<NavBtn route="/change-requests" label="Ver todos" />}>
                            {changes.length === 0
                                ? <Empty icon="check_circle" text="Nenhuma GMUD aguardando aprovação" />
                                : <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                                    {changes.map(c => <ListItem key={c.id} title={c.title} sub={formatRelative(c.createdAt)} dot="#6366f1" onClick={() => navigate('/change-requests')} />)}
                                </Box>}
                        </DashboardWidget>
                    )}

                    {isEnabled('projects') && projectPerm.canRead && (
                        <DashboardWidget title="Projetos Ativos" icon="folder_special" iconColor="#8b5cf6" loading={loadingMap['projects']} isDark={isDark} minHeight={260}
                            action={<NavBtn route="/projects" label="Ver todos" />}>
                            {projects.length === 0
                                ? <Empty icon="folder_open" text="Nenhum projeto em andamento" />
                                : <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                                    {projects.map(p => <ListItem key={p.id} title={p.name} sub={`${p.members?.length || 0} membros · ${p.progress || 0}%`} dot="#8b5cf6" onClick={() => navigate('/projects')} />)}
                                </Box>}
                        </DashboardWidget>
                    )}
                </Box>
            )}

            {/* ── WIDGET: Activity Timeline (full-width, Item 10) ─────────── */}
            {isEnabled('activity') && (
                <DashboardWidget title="Timeline de Atividade" icon="history" iconColor="#667eea" isDark={isDark} minHeight={200}>
                    <ActivityFeed isDark={isDark} maxHeight={480} showModuleFilter={true} />
                </DashboardWidget>
            )}
        </Box>
    );
};

export default DashboardPage;
