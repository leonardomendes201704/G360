import { useState, useEffect } from 'react';
import { Box, Typography, Avatar, Chip, CircularProgress, MenuItem, Select, FormControl } from '@mui/material';
import { formatRelative } from '../../utils/dateUtils';
import { getDashboardActivity } from '../../services/dashboard.service';

const MODULE_CONFIG = {
    INCIDENT: { label: 'Incidente', icon: 'warning', color: '#f59e0b' },
    TASK: { label: 'Tarefa', icon: 'task_alt', color: '#3b82f6' },
    PROJECT: { label: 'Projeto', icon: 'folder_special', color: '#8b5cf6' },
    RISK: { label: 'Risco', icon: 'shield', color: '#ef4444' },
    ASSET: { label: 'Ativo', icon: 'inventory_2', color: '#06b6d4' },
    CONTRACT: { label: 'Contrato', icon: 'description', color: '#10b981' },
    SUPPLIER: { label: 'Fornecedor', icon: 'store', color: '#f97316' },
    CHANGE_REQUEST: { label: 'GMUD', icon: 'published_with_changes', color: '#6366f1' },
    EXPENSE: { label: 'Despesa', icon: 'receipt_long', color: '#10b981' },
    USER: { label: 'Usuário', icon: 'person', color: '#64748b' },
};

const ACTION_VERB = {
    CREATE: 'criou',
    UPDATE: 'atualizou',
    DELETE: 'excluiu',
    APPROVE: 'aprovou',
    REJECT: 'rejeitou',
    CLOSE: 'fechou',
};

const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    return parts.length >= 2 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
};

const ActivityFeed = ({ isDark = false, maxHeight = 440, showModuleFilter = true }) => {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [moduleFilter, setModuleFilter] = useState('');

    const textPrimary = isDark ? '#f1f5f9' : '#0f172a';
    const textSecondary = isDark ? '#64748b' : '#475569';
    const textMuted = isDark ? '#94a3b8' : '#64748b';
    const borderSubtle = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
    const lineBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

    const load = async () => {
        setLoading(true);
        try {
            const data = await getDashboardActivity({ limit: 40, module: moduleFilter || undefined });
            setActivities(Array.isArray(data) ? data : (data?.activities || []));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [moduleFilter]);

    // Group by day
    const grouped = activities.reduce((acc, act) => {
        const day = new Date(act.createdAt).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
        if (!acc[day]) acc[day] = [];
        acc[day].push(act);
        return acc;
    }, {});

    return (
        <Box>
            {showModuleFilter && (
                <FormControl size="small" sx={{ mb: 2, minWidth: 180 }}>
                    <Select
                        value={moduleFilter}
                        onChange={(e) => setModuleFilter(e.target.value)}
                        displayEmpty
                        sx={{
                            fontSize: '13px', borderRadius: 2,
                            color: textSecondary,
                            '& .MuiOutlinedInput-notchedOutline': { borderColor: borderSubtle },
                            bgcolor: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc',
                        }}
                    >
                        <MenuItem value="">Todos os módulos</MenuItem>
                        {Object.entries(MODULE_CONFIG).map(([key, cfg]) => (
                            <MenuItem key={key} value={key}>{cfg.label}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
            )}

            <Box sx={{ maxHeight, overflowY: 'auto', pr: 0.5 }}>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress size={28} sx={{ color: '#667eea' }} />
                    </Box>
                ) : activities.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 4, color: textMuted }}>
                        <span className="material-icons-round" style={{ fontSize: '36px', display: 'block', marginBottom: '8px', opacity: 0.4 }}>history</span>
                        <Typography fontSize={13}>Nenhuma atividade registrada</Typography>
                    </Box>
                ) : (
                    Object.entries(grouped).map(([day, items]) => (
                        <Box key={day} sx={{ mb: 2 }}>
                            {/* Day separator */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                                <Box sx={{ flex: 1, height: '1px', bgcolor: borderSubtle }} />
                                <Typography sx={{ fontSize: '11px', fontWeight: 700, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                                    {day}
                                </Typography>
                                <Box sx={{ flex: 1, height: '1px', bgcolor: borderSubtle }} />
                            </Box>

                            {/* Events */}
                            <Box sx={{ position: 'relative' }}>
                                {/* Vertical line */}
                                <Box sx={{ position: 'absolute', left: 16, top: 0, bottom: 0, width: '2px', bgcolor: lineBg, borderRadius: 1 }} />

                                {items.map((act, idx) => {
                                    const mod = MODULE_CONFIG[act.entityType] || { label: act.entityType, icon: 'info', color: '#64748b' };
                                    const verb = ACTION_VERB[act.action] || act.action?.toLowerCase() || 'atualizou';

                                    return (
                                        <Box key={act.id} sx={{
                                            display: 'flex', gap: 2, mb: idx === items.length - 1 ? 0 : 1.5,
                                            position: 'relative', pl: 0.5
                                        }}>
                                            {/* Icon dot on timeline */}
                                            <Box sx={{
                                                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                                                bgcolor: `${mod.color}18`, border: `2px solid ${mod.color}40`,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: mod.color, zIndex: 1,
                                            }}>
                                                <span className="material-icons-round" style={{ fontSize: '15px' }}>{mod.icon}</span>
                                            </Box>

                                            {/* Content */}
                                            <Box sx={{ flex: 1, minWidth: 0, pt: 0.3 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.3 }}>
                                                    {/* User avatar + name */}
                                                    {act.user ? (
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                                            <Avatar
                                                                src={act.user.avatar}
                                                                sx={{ width: 18, height: 18, fontSize: '9px', bgcolor: '#667eea' }}
                                                            >
                                                                {getInitials(act.user.name)}
                                                            </Avatar>
                                                            <Typography sx={{ fontSize: '13px', fontWeight: 600, color: textPrimary }}>
                                                                {act.user.name.split(' ')[0]}
                                                            </Typography>
                                                        </Box>
                                                    ) : (
                                                        <Typography sx={{ fontSize: '13px', fontWeight: 600, color: textMuted }}>Sistema</Typography>
                                                    )}
                                                    <Typography sx={{ fontSize: '13px', color: textSecondary }}>{verb}</Typography>
                                                    <Chip
                                                        label={mod.label}
                                                        size="small"
                                                        sx={{ height: 18, fontSize: '10px', bgcolor: `${mod.color}15`, color: mod.color, fontWeight: 600, px: 0.25 }}
                                                    />
                                                </Box>
                                                {act.description && (
                                                    <Typography sx={{ fontSize: '12px', color: textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                                                        {act.description}
                                                    </Typography>
                                                )}
                                                <Typography sx={{ fontSize: '11px', color: textMuted, mt: 0.25 }}>
                                                    {formatRelative(act.createdAt)}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    );
                                })}
                            </Box>
                        </Box>
                    ))
                )}
            </Box>
        </Box>
    );
};

export default ActivityFeed;
