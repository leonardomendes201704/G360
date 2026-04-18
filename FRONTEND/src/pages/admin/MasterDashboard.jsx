import React, { useState, useEffect, useContext, useCallback } from 'react';
import api from '../../services/api';
import GlobalSettingService from '../../services/global-setting.service';
import { Box, Typography, Chip, LinearProgress } from '@mui/material';
import { ThemeContext } from '../../contexts/ThemeContext';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

const MasterDashboard = () => {
    const [stats, setStats] = useState(null);
    const [health, setHealth] = useState(null);
    const { mode } = useContext(ThemeContext);
    const isDark = mode === 'dark';

    const cardBg = isDark ? 'linear-gradient(145deg, #1a222d 0%, #151c25 100%)' : '#ffffff';
    const cardBorder = isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(15, 23, 42, 0.08)';
    const textPrimary = isDark ? '#f1f5f9' : '#0f172a';
    const textSecondary = isDark ? '#94a3b8' : '#64748b';
    const surfaceBg = isDark ? '#1c2632' : '#f1f5f9';

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await api.get('/tenants/dashboard-stats');
                setStats(res.data.data);
            } catch (err) {
                console.error(err);
            }
        };
        fetchStats();
    }, []);

    const fetchHealth = useCallback(async () => {
        try {
            const res = await GlobalSettingService.getSystemHealth();
            setHealth(res.data);
        } catch { /* ignore */ }
    }, []);

    useEffect(() => {
        fetchHealth();
        const interval = setInterval(fetchHealth, 15000);
        return () => clearInterval(interval);
    }, [fetchHealth]);

    if (!stats) return <Box sx={{ p: 4, color: textSecondary }}>Carregando dashboard...</Box>;

    const kpis = [
        { label: 'Total de Tenants', value: stats.total, color: '#2563eb', icon: 'domain' },
        { label: 'Ativos', value: stats.active, color: '#10b981', icon: 'check_circle' },
        { label: 'Bloqueados', value: stats.inactive, color: '#f43f5e', icon: 'block' },
        { label: 'Conexões Pool', value: stats.pool?.activeClients || 0, color: '#06b6d4', icon: 'storage' },
    ];

    const statusColor = health?.status === 'healthy' ? '#10b981' : health?.status === 'degraded' ? '#f59e0b' : '#f43f5e';
    const heapPercent = parseInt(health?.memory?.heapPercent) || 0;

    return (
        <Box sx={{ p: 0 }}>
            <Typography sx={{ fontSize: '24px', fontWeight: 700, color: textPrimary, mb: 3 }}>
                Visão Geral da Plataforma
            </Typography>

            {/* KPIs */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 3, mb: 4 }}>
                {kpis.map((kpi, i) => (
                    <Box key={i} sx={{
                        background: cardBg, border: cardBorder, borderRadius: '8px', p: 3,
                        display: 'flex', alignItems: 'center', gap: 2.5
                    }}>
                        <Box sx={{
                            width: 56, height: 56, borderRadius: '8px',
                            background: `${kpi.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <span className="material-icons-round" style={{ fontSize: 28, color: kpi.color }}>{kpi.icon}</span>
                        </Box>
                        <Box>
                            <Typography sx={{ fontSize: '14px', color: textSecondary }}>{kpi.label}</Typography>
                            <Typography sx={{ fontSize: '32px', fontWeight: 700, color: textPrimary, lineHeight: 1 }}>{kpi.value}</Typography>
                        </Box>
                    </Box>
                ))}
            </Box>

            {/* Charts Row */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 3, mb: 4 }}>
                {/* Distribution Chart */}
                <Box sx={{ background: cardBg, border: cardBorder, borderRadius: '8px', p: 3, height: 400 }}>
                    <Typography sx={{ fontSize: '18px', fontWeight: 600, color: textPrimary, mb: 4 }}>
                        Distribuição por Plano
                    </Typography>
                    <ResponsiveContainer width="100%" height="80%">
                        <BarChart data={stats.byPlan} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} vertical={false} />
                            <XAxis dataKey="plan" stroke={textSecondary} tickLine={false} axisLine={false} />
                            <YAxis stroke={textSecondary} tickLine={false} axisLine={false} />
                            <Tooltip
                                contentStyle={{ background: isDark ? '#1e293b' : '#fff', borderRadius: '8px', border: 'none' }}
                                itemStyle={{ color: textPrimary }}
                            />
                            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                {stats.byPlan.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={['#2563eb', '#10b981', '#f59e0b', '#f43f5e'][index % 4]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </Box>

                {/* Recent Tenants */}
                <Box sx={{ background: cardBg, border: cardBorder, borderRadius: '8px', p: 3 }}>
                    <Typography sx={{ fontSize: '18px', fontWeight: 600, color: textPrimary, mb: 3 }}>
                        Novos Clientes
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {stats.recent.map((t, i) => (
                            <Box key={i} sx={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                p: 2, borderRadius: '8px', background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc'
                            }}>
                                <Box>
                                    <Typography sx={{ fontSize: '14px', fontWeight: 600, color: textPrimary }}>{t.name}</Typography>
                                    <Typography sx={{ fontSize: '11px', color: textSecondary }}>{t.slug}</Typography>
                                </Box>
                                <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#2563eb' }}>{t.plan}</Typography>
                            </Box>
                        ))}
                    </Box>
                </Box>
            </Box>

            {/* System Health */}
            {health && (
                <Box sx={{ background: cardBg, border: cardBorder, borderRadius: '8px', p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <span className="material-icons-round" style={{ fontSize: 22, color: '#2563eb' }}>monitor_heart</span>
                            <Typography sx={{ fontSize: '18px', fontWeight: 600, color: textPrimary }}>
                                Saúde do Sistema
                            </Typography>
                            <Typography sx={{ fontSize: '12px', color: textSecondary, ml: 1 }}>
                                Atualiza a cada 15s
                            </Typography>
                        </Box>
                        <Chip
                            label={health.status.toUpperCase()}
                            size="small"
                            sx={{ fontWeight: 700, fontSize: '11px', letterSpacing: '0.05em', background: `${statusColor}20`, color: statusColor, border: `1px solid ${statusColor}40` }}
                        />
                    </Box>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 2, mb: 2 }}>
                        {[
                            { icon: 'timer', label: 'Uptime', value: health.uptime, color: '#2563eb' },
                            { icon: 'memory', label: 'Memória RSS', value: health.memory?.rss, color: '#10b981' },
                            { icon: 'dns', label: 'DB Latência', value: health.database?.latency || 'N/A', color: '#06b6d4' },
                            { icon: 'domain', label: 'Tenants Ativos', value: health.activeTenants, color: '#f59e0b' },
                            { icon: 'storage', label: 'Pool', value: `${health.tenantPool?.size || 0}/${health.tenantPool?.maxClients || 0}`, color: '#3b82f6' },
                            { icon: 'schedule', label: 'Resp.', value: health.responseTime, color: '#f43f5e' },
                        ].map((kpi, i) => (
                            <Box key={i} sx={{ p: 1.5, borderRadius: '8px', background: surfaceBg, textAlign: 'center' }}>
                                <span className="material-icons-round" style={{ fontSize: 18, color: kpi.color }}>{kpi.icon}</span>
                                <Typography sx={{ fontSize: '11px', color: textSecondary, mt: 0.5 }}>{kpi.label}</Typography>
                                <Typography sx={{ fontSize: '16px', fontWeight: 700, color: textPrimary, lineHeight: 1.3 }}>{kpi.value}</Typography>
                            </Box>
                        ))}
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography sx={{ fontSize: '12px', color: textSecondary, minWidth: 100 }}>
                            Heap: {health.memory?.heapUsed} / {health.memory?.heapTotal}
                        </Typography>
                        <Box sx={{ flex: 1 }}>
                            <LinearProgress variant="determinate" value={heapPercent} sx={{
                                height: 8, borderRadius: '8px', backgroundColor: surfaceBg,
                                '& .MuiLinearProgress-bar': {
                                    borderRadius: '8px',
                                    background: heapPercent > 80 ? 'linear-gradient(90deg, #f43f5e, #ef4444)' :
                                        heapPercent > 60 ? 'linear-gradient(90deg, #f59e0b, #eab308)' :
                                            'linear-gradient(90deg, #2563eb, #3b82f6)',
                                },
                            }} />
                        </Box>
                        <Typography sx={{ fontSize: '12px', fontWeight: 700, color: textPrimary }}>{heapPercent}%</Typography>
                    </Box>
                </Box>
            )}
        </Box>
    );
};

export default MasterDashboard;
