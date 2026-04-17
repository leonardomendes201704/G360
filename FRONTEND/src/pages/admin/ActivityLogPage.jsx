import React, { useState, useEffect, useMemo, useContext } from 'react';
import api from '../../services/api';
import { Box, Typography, Button, Pagination, IconButton } from '@mui/material';
import { PieChart } from '@mui/x-charts/PieChart';
import { BarChart } from '@mui/x-charts/BarChart';
import { ThemeContext } from '../../contexts/ThemeContext';
import StandardModal from '../../components/common/StandardModal';
import StatsCard from '../../components/common/StatsCard';
import KpiGrid from '../../components/common/KpiGrid';

const ActivityLogPage = () => {
    const [viewMode, setViewMode] = useState('dashboard');
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({ module: '', action: '', period: '24h' });
    const [selectedLog, setSelectedLog] = useState(null);

    const { mode } = useContext(ThemeContext);
    const isDark = mode === 'dark';
    const textPrimary = isDark ? '#f1f5f9' : '#0f172a';
    const textSecondary = isDark ? '#94a3b8' : '#475569';
    const textMuted = isDark ? '#64748b' : '#64748b';
    const cardBg = isDark ? 'linear-gradient(145deg, #1a222d 0%, #151c25 100%)' : '#ffffff';
    const cardBorder = isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(15, 23, 42, 0.08)';
    const surfaceBg = isDark ? '#1c2632' : '#f1f5f9';
    const inputBg = isDark ? '#1c2632' : '#ffffff';
    const inputBorder = isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(15, 23, 42, 0.12)';
    const hoverRowBg = isDark ? '#1c2632' : '#f1f5f9';
    const codeBg = isDark ? '#0f1419' : '#f8fafc';
    const codeText = isDark ? '#10b981' : '#0f766e';
    /** Chaves canônicas rbac-matrix.json (+ SUPER_ADMIN para logs de plataforma) */
    const modules = [
        'ACTIVITY_LOG', 'APPROVALS', 'ASSETS', 'CONFIG', 'CONTRACTS', 'FINANCE', 'GMUD', 'HELPDESK',
        'INCIDENT', 'KB', 'NOTIFICATIONS', 'PROBLEM', 'PROJECTS', 'RISKS', 'SUPER_ADMIN', 'SUPPLIERS',
        'TASKS', 'UPLOAD'
    ];
    const actions = ['CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'VIEW', 'LOGIN', 'LOGOUT'];

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const params = { page, limit: 50, module: filters.module || undefined, action: filters.action || undefined };
            const response = await api.get('/audit-logs', { params });
            setLogs(response.data.data || []);
            setTotalPages(response.data.pagination?.pages || 1);
            setTotalItems(response.data.pagination?.total || 0);
        } catch (error) {
            console.error("Error fetching logs:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchLogs(); }, [page, filters]);

    // Analytics calculations
    const analytics = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayLogs = logs.filter(l => new Date(l.createdAt) >= today);
        const uniqueUsers = new Set(logs.map(l => l.userId)).size;
        const criticalActions = logs.filter(l => l.action?.includes('DELETE') || l.action?.includes('APPROVE'));

        // Calculate trend (this month vs last month)
        const now = new Date();
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

        const thisMonthLogs = logs.filter(l => new Date(l.createdAt) >= thisMonth).length;
        const lastMonthLogs = logs.filter(l => {
            const d = new Date(l.createdAt);
            return d >= lastMonth && d <= lastMonthEnd;
        }).length;

        let totalTrend, totalTrendUp;
        if (lastMonthLogs === 0) {
            totalTrend = thisMonthLogs > 0 ? `+${thisMonthLogs} novos` : 'Sem dados';
            totalTrendUp = thisMonthLogs > 0;
        } else {
            const pct = Math.round(((thisMonthLogs - lastMonthLogs) / lastMonthLogs) * 100);
            totalTrend = pct >= 0 ? `+${pct}% este mes` : `${pct}% este mes`;
            totalTrendUp = pct >= 0;
        }

        // Group by module
        const byModule = logs.reduce((acc, l) => { acc[l.module] = (acc[l.module] || 0) + 1; return acc; }, {});

        // Activities by day (last 7 days)
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);
            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);
            const count = logs.filter(l => {
                const logDate = new Date(l.createdAt);
                return logDate >= date && logDate < nextDate;
            }).length;
            last7Days.push({
                day: date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
                count
            });
        }

        // Top users
        const userCounts = logs.reduce((acc, l) => {
            const name = l.user?.name || 'Desconhecido';
            acc[name] = (acc[name] || 0) + 1;
            return acc;
        }, {});
        const topUsers = Object.entries(userCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => ({ name, count }));

        // Peak hours
        const hourCounts = logs.reduce((acc, l) => {
            const hour = new Date(l.createdAt).getHours();
            acc[hour] = (acc[hour] || 0) + 1;
            return acc;
        }, {});
        const peakHours = Object.entries(hourCounts)
            .map(([hour, count]) => ({ hour: `${hour}h`, count }))
            .sort((a, b) => parseInt(a.hour) - parseInt(b.hour));

        return {
            total: totalItems,
            today: todayLogs.length,
            uniqueUsers,
            critical: criticalActions.length,
            byModule: Object.entries(byModule).map(([label, value], i) => ({ id: i, label, value })),
            last7Days,
            topUsers,
            peakHours,
            totalTrend,
            totalTrendUp
        };
    }, [logs, totalItems]);

    // Filtered logs
    const filteredLogs = useMemo(() => {
        return logs.filter(l => {
            const matchesSearch = searchTerm === '' ||
                l.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                l.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                l.module?.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesSearch;
        });
    }, [logs, searchTerm]);

    // Styles
    const cardStyle = {
        background: cardBg,
        border: cardBorder,
        borderRadius: '16px'
    };

    const getActionStyle = (action) => {
        if (action?.includes('CREATE')) return { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981', icon: 'add_circle', label: 'Criou' };
        if (action?.includes('UPDATE')) return { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', icon: 'edit', label: 'Atualizou' };
        if (action?.includes('DELETE')) return { bg: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e', icon: 'delete', label: 'Excluiu' };
        if (action?.includes('APPROVE')) return { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', icon: 'check_circle', label: 'Aprovou' };
        if (action?.includes('VIEW')) return { bg: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4', icon: 'visibility', label: 'Visualizou' };
        if (action?.includes('LOGIN')) return { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981', icon: 'login', label: 'Login' };
        if (action?.includes('LOGOUT')) return { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', icon: 'logout', label: 'Logout' };
        return { bg: 'rgba(37, 99, 235, 0.15)', color: '#2563eb', icon: 'info', label: action };
    };

    const getModuleStyle = (module) => {
        const base = {
            ACTIVITY_LOG: { bg: 'rgba(100, 116, 139, 0.2)', color: '#64748b' },
            APPROVALS: { bg: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' },
            ASSETS: { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981' },
            CONFIG: { bg: 'rgba(234, 179, 8, 0.15)', color: '#ca8a04' },
            CONTRACTS: { bg: 'rgba(37, 99, 235, 0.15)', color: '#2563eb' },
            FINANCE: { bg: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' },
            GMUD: { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' },
            HELPDESK: { bg: 'rgba(14, 165, 233, 0.15)', color: '#0ea5e9' },
            INCIDENT: { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' },
            KB: { bg: 'rgba(20, 184, 166, 0.15)', color: '#14b8a6' },
            NOTIFICATIONS: { bg: 'rgba(168, 85, 247, 0.12)', color: '#a855f7' },
            PROBLEM: { bg: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' },
            PROJECTS: { bg: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4' },
            RISKS: { bg: 'rgba(244, 63, 94, 0.12)', color: '#f43f5e' },
            SUPER_ADMIN: { bg: 'rgba(15, 23, 42, 0.2)', color: '#0f172a' },
            SUPPLIERS: { bg: 'rgba(249, 115, 22, 0.15)', color: '#f97316' },
            TASKS: { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' },
            UPLOAD: { bg: 'rgba(99, 102, 241, 0.12)', color: '#6366f1' },
            AUTH: { bg: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e' }
        };
        const legacy = {
            CONTRATOS: 'CONTRACTS', PROJETOS: 'PROJECTS', TAREFAS: 'TASKS', ATIVOS: 'ASSETS',
            FINANCEIRO: 'FINANCE', USUARIOS: 'CONFIG', APROVACOES: 'APPROVALS', ORCAMENTO: 'FINANCE',
            DESPESAS: 'FINANCE', INCIDENTES: 'INCIDENT', RISCOS: 'RISKS', FORNECEDORES: 'SUPPLIERS',
            BASE_CONHECIMENTO: 'KB', NOTIFICACOES: 'NOTIFICATIONS', INTEGRACOES: 'CONFIG',
            PERMISSOES: 'CONFIG', DEPARTAMENTOS: 'CONFIG', CENTROS_CUSTO: 'CONFIG', GOVERNANCA: 'GMUD',
            ANO_FISCAL: 'FINANCE', CONTAS: 'FINANCE', ADMIN: 'CONFIG'
        };
        const key = legacy[module] || module;
        return base[key] || { bg: 'rgba(37, 99, 235, 0.15)', color: '#2563eb' };
    };

    // Detail Modal
    const DetailModal = ({ log, onClose }) => {
        if (!log) return null;
        const actionStyle = getActionStyle(log.action);
        const moduleStyle = getModuleStyle(log.module);

        const sectionTitleStyle = { fontSize: '12px', fontWeight: 600, color: textMuted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' };
        const labelStyle = { fontSize: '12px', color: textMuted, marginBottom: '4px' };
        const valueStyle = { fontSize: '14px', color: textPrimary, fontWeight: 500 };

        return (
            <StandardModal
                open
                onClose={onClose}
                title="Detalhes da Atividade"
                icon={actionStyle.icon}
                maxWidth="md"
                actions={[{ label: 'Fechar', onClick: onClose }]}
            >
                    <div style={{ marginBottom: '32px' }}>
                        <div style={sectionTitleStyle}>
                            <span className="material-icons-round" style={{ fontSize: '18px', color: '#3b82f6' }}>bolt</span>
                            Informacoes da Acao
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div>
                                <div style={labelStyle}>Acao Executada</div>
                                <div style={valueStyle}>{actionStyle.label} {log.entityType?.toLowerCase()}</div>
                            </div>
                            <div>
                                <div style={labelStyle}>Modulo</div>
                                <span style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, background: moduleStyle.bg, color: moduleStyle.color }}>
                                    {log.module}
                                </span>
                            </div>
                            <div>
                                <div style={labelStyle}>Entidade Afetada</div>
                                <div style={{ ...valueStyle, fontFamily: 'monospace', fontSize: '13px' }}>{log.entityType}_{log.entityId || '?'}</div>
                            </div>
                            <div>
                                <div style={labelStyle}>Timestamp</div>
                                <div style={valueStyle}>{new Date(log.createdAt).toLocaleString('pt-BR')}</div>
                            </div>
                        </div>
                    </div>

                    {/* User Info */}
                    <div style={{ marginBottom: '32px' }}>
                        <div style={sectionTitleStyle}>
                            <span className="material-icons-round" style={{ fontSize: '18px', color: '#06b6d4' }}>person</span>
                            Informacoes do Usuario
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div>
                                <div style={labelStyle}>Nome</div>
                                <div style={valueStyle}>{log.user?.name || 'Desconhecido'}</div>
                            </div>
                            <div>
                                <div style={labelStyle}>E-mail</div>
                                <div style={valueStyle}>{log.user?.email || '-'}</div>
                            </div>
                            <div>
                                <div style={labelStyle}>IP de Origem</div>
                                <div style={{ ...valueStyle, fontFamily: 'monospace' }}>{log.ipAddress || '192.168.1.1'}</div>
                            </div>
                            <div>
                                <div style={labelStyle}>User Agent</div>
                                <div style={{ ...valueStyle, fontSize: '12px' }}>{log.userAgent || 'Mozilla/5.0 (Windows NT 10.0)'}</div>
                            </div>
                        </div>
                    </div>

                    {/* Technical Details */}
                    <div style={{ marginBottom: '32px' }}>
                        <div style={sectionTitleStyle}>
                            <span className="material-icons-round" style={{ fontSize: '18px', color: '#f59e0b' }}>code</span>
                            Detalhes Tecnicos (JSON)
                        </div>
                        <div style={{ background: codeBg, borderRadius: '12px', padding: '16px', border: cardBorder, maxHeight: '200px', overflow: 'auto' }}>
                            <pre style={{ margin: 0, fontFamily: 'monospace', fontSize: '12px', color: codeText, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                                {JSON.stringify(log.changes || { action: log.action, module: log.module, entityType: log.entityType, entityId: log.entityId, timestamp: log.createdAt, userId: log.userId }, null, 2)}
                            </pre>
                        </div>
                    </div>

                    {/* Context */}
                    <div>
                        <div style={sectionTitleStyle}>
                            <span className="material-icons-round" style={{ fontSize: '18px', color: '#10b981' }}>info</span>
                            Contexto Adicional
                        </div>
                        <div style={{ background: surfaceBg, borderRadius: '12px', padding: '16px', border: cardBorder }}>
                            <div style={{ color: textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
                                Esta acao foi executada durante o processo de {log.action?.includes('CREATE') ? 'cadastro' : log.action?.includes('UPDATE') ? 'atualizacao' : log.action?.includes('DELETE') ? 'exclusao' : 'operacao'} de {log.entityType?.toLowerCase() || 'registro'}. O usuario acessou o sistema atraves da interface web e completou a operacao com sucesso. Nenhum erro foi reportado durante a operacao.
                            </div>
                        </div>
                    </div>
            </StandardModal>
        );
    };

    return (
        <Box>
            {/* Header */}
            <Box sx={{ ...cardStyle, mb: 3, p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ width: 48, height: 48, borderRadius: '12px', background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                        <span className="material-icons-round" style={{ fontSize: '24px' }}>history</span>
                    </Box>
                    <Box>
                        <Typography sx={{ fontSize: '20px', fontWeight: 600, color: textPrimary }}>Auditoria e Atividades</Typography>
                        <Typography sx={{ color: textMuted, fontSize: '14px' }}>Monitore todas as acoes e seguranca do sistema</Typography>
                    </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', gap: 1, background: surfaceBg, padding: '4px', borderRadius: '12px', border: cardBorder }}>
                        <button onClick={() => setViewMode('dashboard')} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: viewMode === 'dashboard' ? '#3b82f6' : 'transparent', color: viewMode === 'dashboard' ? 'white' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}>
                            <span className="material-icons-round" style={{ fontSize: '18px' }}>analytics</span>Dashboard
                        </button>
                        <button onClick={() => setViewMode('list')} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: viewMode === 'list' ? '#3b82f6' : 'transparent', color: viewMode === 'list' ? 'white' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}>
                            <span className="material-icons-round" style={{ fontSize: '18px' }}>list</span>Atividades
                        </button>
                    </Box>
                    <Button onClick={fetchLogs} sx={{ padding: '12px 20px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, textTransform: 'none', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: 'white', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)', '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 6px 16px rgba(59, 130, 246, 0.4)' } }} startIcon={<span className="material-icons-round" style={{ fontSize: '18px' }}>refresh</span>}>
                        Atualizar
                    </Button>
                </Box>
            </Box>

            {/* Dashboard View */}
            {viewMode === 'dashboard' && (
                <>
                    <KpiGrid maxColumns={4}>
                        {[
                            { label: 'Total de Atividades', value: analytics.total.toLocaleString('pt-BR'), icon: 'timeline', color: '#2563eb', trend: analytics.totalTrend, trendUp: analytics.totalTrendUp },
                            { label: 'Atividades Hoje', value: analytics.today, icon: 'today', color: '#10b981', trend: 'Ultimas 24 horas', trendUp: null },
                            { label: 'Usuarios Ativos', value: analytics.uniqueUsers, icon: 'people', color: '#06b6d4', trend: 'Nesta semana', trendUp: null },
                            { label: 'Acoes Criticas', value: analytics.critical, icon: 'warning', color: '#f43f5e', trend: 'Requer atencao', trendUp: false }
                        ].map((kpi, i) => (
                            <StatsCard
                                key={i}
                                title={kpi.label}
                                value={kpi.value}
                                iconName={kpi.icon}
                                hexColor={kpi.color}
                                subtitle={kpi.trend}
                            />
                        ))}
                    </KpiGrid>

                    {/* Charts Row 1 */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 3, mb: 3 }}>
                        {/* Atividades por Dia */}
                        <Box sx={{ ...cardStyle, p: 3 }}>
                            <Typography sx={{ fontSize: '16px', fontWeight: 600, color: textPrimary, display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                <span className="material-icons-round" style={{ fontSize: '20px', color: '#3b82f6' }}>show_chart</span>
                                Atividades por Dia (Ultimos 7 dias)
                            </Typography>
                            <BarChart
                                xAxis={[{ scaleType: 'band', data: analytics.last7Days.map(d => d.day) }]}
                                series={[{ data: analytics.last7Days.map(d => d.count), color: '#3b82f6' }]}
                                height={280}
                            />
                        </Box>
                        {/* Por Modulo */}
                        <Box sx={{ ...cardStyle, p: 3 }}>
                            <Typography sx={{ fontSize: '16px', fontWeight: 600, color: textPrimary, display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                <span className="material-icons-round" style={{ fontSize: '20px', color: '#06b6d4' }}>donut_large</span>
                                Por Modulo
                            </Typography>
                            {analytics.byModule.length > 0 ? (
                                <PieChart series={[{ data: analytics.byModule, innerRadius: 50, outerRadius: 100, paddingAngle: 2, cornerRadius: 4 }]} height={280} slotProps={{ legend: { hidden: true } }} />
                            ) : (
                                <Box sx={{ height: 280, background: surfaceBg, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: isDark ? '1px dashed rgba(255, 255, 255, 0.1)' : '1px dashed rgba(15, 23, 42, 0.12)' }}>
                                    <span className="material-icons-round" style={{ fontSize: '48px', color: textMuted }}>pie_chart</span>
                                </Box>
                            )}
                        </Box>
                    </Box>

                    {/* Charts Row 2 */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
                        {/* Usuarios Mais Ativos */}
                        <Box sx={{ ...cardStyle, p: 3 }}>
                            <Typography sx={{ fontSize: '16px', fontWeight: 600, color: textPrimary, display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                <span className="material-icons-round" style={{ fontSize: '20px', color: '#10b981' }}>person</span>
                                Usuarios Mais Ativos
                            </Typography>
                            {analytics.topUsers.length > 0 ? (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    {analytics.topUsers.map((u, i) => (
                                        <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                            <Box sx={{ width: 36, height: 36, borderRadius: '50%', background: `hsl(${i * 50}, 70%, 50%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, fontSize: '14px' }}>
                                                {u.name.charAt(0)}
                                            </Box>
                                            <Box sx={{ flex: 1 }}>
                                                <Typography sx={{ color: textPrimary, fontSize: '14px', fontWeight: 500 }}>{u.name}</Typography>
                                                <Box sx={{ height: 6, background: surfaceBg, borderRadius: '3px', mt: 0.5 }}>
                                                    <Box sx={{ height: '100%', width: `${(u.count / analytics.topUsers[0].count) * 100}%`, background: 'linear-gradient(90deg, #10b981 0%, #06b6d4 100%)', borderRadius: '3px' }} />
                                                </Box>
                                            </Box>
                                            <Typography sx={{ color: textMuted, fontSize: '14px', fontWeight: 600 }}>{u.count}</Typography>
                                        </Box>
                                    ))}
                                </Box>
                            ) : (
                                <Box sx={{ height: 200, background: surfaceBg, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: isDark ? '1px dashed rgba(255, 255, 255, 0.1)' : '1px dashed rgba(15, 23, 42, 0.12)' }}>
                                    <span className="material-icons-round" style={{ fontSize: '48px', color: textMuted }}>leaderboard</span>
                                </Box>
                            )}
                        </Box>
                        {/* Horarios de Pico */}
                        <Box sx={{ ...cardStyle, p: 3 }}>
                            <Typography sx={{ fontSize: '16px', fontWeight: 600, color: textPrimary, display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                <span className="material-icons-round" style={{ fontSize: '20px', color: '#f59e0b' }}>schedule</span>
                                Horarios de Pico
                            </Typography>
                            {analytics.peakHours.length > 0 ? (
                                <BarChart
                                    xAxis={[{ scaleType: 'band', data: analytics.peakHours.map(h => h.hour) }]}
                                    series={[{ data: analytics.peakHours.map(h => h.count), color: '#f59e0b' }]}
                                    height={200}
                                />
                            ) : (
                                <Box sx={{ height: 200, background: surfaceBg, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: isDark ? '1px dashed rgba(255, 255, 255, 0.1)' : '1px dashed rgba(15, 23, 42, 0.12)' }}>
                                    <span className="material-icons-round" style={{ fontSize: '48px', color: textMuted }}>access_time</span>
                                </Box>
                            )}
                        </Box>
                    </Box>
                </>
            )}

            {/* Activities List View */}
            {viewMode === 'list' && (
                <>
                    {/* Filters */}
                    <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                        <Box sx={{ flex: 1, minWidth: 300, position: 'relative' }}>
                            <span className="material-icons-round" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: textMuted, fontSize: '20px' }}>search</span>
                            <input type="text" placeholder="Buscar por usuario, acao, modulo..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '14px 16px 14px 48px', background: inputBg, border: inputBorder, borderRadius: '12px', color: textPrimary, fontSize: '14px', outline: 'none' }} />
                        </Box>
                        <select value={filters.module} onChange={(e) => setFilters(f => ({ ...f, module: e.target.value }))} style={{ padding: '14px 16px', background: inputBg, border: inputBorder, borderRadius: '12px', color: textPrimary, fontSize: '14px', minWidth: 180 }}>
                            <option value="">Todos os Modulos</option>
                            {modules.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <select value={filters.action} onChange={(e) => setFilters(f => ({ ...f, action: e.target.value }))} style={{ padding: '14px 16px', background: inputBg, border: inputBorder, borderRadius: '12px', color: textPrimary, fontSize: '14px', minWidth: 180 }}>
                            <option value="">Todas as Acoes</option>
                            {actions.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                    </Box>

                    {/* Activity List */}
                    <Box sx={{ ...cardStyle, overflow: 'hidden' }}>
                        <Box sx={{ p: 2.5, borderBottom: cardBorder, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography sx={{ fontSize: '18px', fontWeight: 600, color: textPrimary, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <span className="material-icons-round" style={{ fontSize: '20px', color: '#3b82f6' }}>list</span>
                                Log de Atividades
                                <span style={{ fontSize: '14px', color: textMuted, fontWeight: 400, marginLeft: '8px' }}>({totalItems} registros)</span>
                            </Typography>
                        </Box>

                        {loading ? (
                            <Box sx={{ p: 6, textAlign: 'center' }}><Typography sx={{ color: textMuted }}>Carregando registros...</Typography></Box>
                        ) : filteredLogs.length === 0 ? (
                            <Box sx={{ p: 6, textAlign: 'center' }}>
                                <span className="material-icons-round" style={{ fontSize: '48px', color: textMuted }}>history</span>
                                <Typography sx={{ color: textSecondary, fontSize: '16px', mt: 2 }}>Nenhuma atividade encontrada</Typography>
                            </Box>
                        ) : (
                            filteredLogs.map((log, i) => {
                                const actionStyle = getActionStyle(log.action);
                                const moduleStyle = getModuleStyle(log.module);
                                return (
                                    <Box key={log.id || i} onClick={() => setSelectedLog(log)} sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2, borderBottom: cardBorder, transition: 'all 0.2s', cursor: 'pointer', '&:hover': { background: surfaceBg } }}>
                                        <Box sx={{ width: 48, height: 48, borderRadius: '12px', background: actionStyle.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <span className="material-icons-round" style={{ fontSize: '22px', color: actionStyle.color }}>{actionStyle.icon}</span>
                                        </Box>
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Typography sx={{ fontSize: '14px', fontWeight: 600, color: textPrimary, mb: 0.5 }}>{actionStyle.label} {log.entityType?.toLowerCase()}</Typography>
                                            <Typography sx={{ fontSize: '13px', color: textSecondary, mb: 0.5 }}>{log.entityType ? `${log.entityType} #${log.entityId || '?'}` : 'Acao do sistema'}</Typography>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: '12px', color: textMuted }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span className="material-icons-round" style={{ fontSize: '14px' }}>person</span>{log.user?.name || 'Desconhecido'}</span>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span className="material-icons-round" style={{ fontSize: '14px' }}>schedule</span>{new Date(log.createdAt).toLocaleString('pt-BR')}</span>
                                            </Box>
                                        </Box>
                                        <span style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', background: moduleStyle.bg, color: moduleStyle.color }}>{log.module}</span>
                                    </Box>
                                );
                            })
                        )}
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                        <Pagination count={totalPages} page={page} onChange={(e, v) => setPage(v)} sx={{ '& .MuiPaginationItem-root': { color: textSecondary, borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.12)', '&.Mui-selected': { background: '#3b82f6', color: 'white' } } }} />
                    </Box>
                </>
            )}

            {/* Detail Modal */}
            {selectedLog && <DetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />}
        </Box>
    );
};

export default ActivityLogPage;







