import { useState } from 'react';
import { Box, Typography, Switch, Drawer, IconButton, Divider } from '@mui/material';
import { Settings, Close } from '@mui/icons-material';

export const DEFAULT_WIDGETS = [
    { id: 'incidents', label: 'KPIs de Incidentes', icon: 'warning', color: '#f59e0b', enabled: true, col: 'full' },
    { id: 'my-tasks', label: 'Minhas Tarefas', icon: 'task_alt', color: '#3b82f6', enabled: true, col: 'half' },
    { id: 'risks', label: 'Riscos Críticos', icon: 'shield', color: '#ef4444', enabled: true, col: 'half' },
    { id: 'sla', label: 'Alertas de SLA', icon: 'timer_off', color: '#ef4444', enabled: true, col: 'half' },
    { id: 'approvals', label: 'Aprovações Pendentes', icon: 'pending_actions', color: '#8b5cf6', enabled: true, col: 'half' },
    { id: 'activity', label: 'Timeline de Atividade', icon: 'history', color: '#667eea', enabled: true, col: 'full' },
];

const STORAGE_KEY = 'g360_dashboard_widgets';

export const loadWidgetConfig = () => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) return DEFAULT_WIDGETS;
        const savedMap = JSON.parse(saved);
        // Merge: preserve order from DEFAULT, apply saved enabled state
        return DEFAULT_WIDGETS.map(w => ({ ...w, enabled: savedMap[w.id] !== undefined ? savedMap[w.id] : w.enabled }));
    } catch { return DEFAULT_WIDGETS; }
};

export const saveWidgetConfig = (widgets) => {
    const map = {};
    widgets.forEach(w => { map[w.id] = w.enabled; });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
};

const DashboardCustomizer = ({ widgets, onWidgetsChange, isDark = false }) => {
    const [open, setOpen] = useState(false);

    const cardBg = isDark ? 'rgba(22,29,38,0.98)' : '#FFFFFF';
    const cardBorder = isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.09)';
    const textPrimary = isDark ? '#f1f5f9' : '#0f172a';
    const textMuted = isDark ? '#94a3b8' : '#64748b';

    const toggle = (id) => {
        const updated = widgets.map(w => w.id === id ? { ...w, enabled: !w.enabled } : w);
        onWidgetsChange(updated);
        saveWidgetConfig(updated);
    };

    return (
        <>
            <IconButton
                onClick={() => setOpen(true)}
                sx={{
                    width: 38, height: 38, borderRadius: '8px',
                    border: cardBorder,
                    bgcolor: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc',
                    color: textMuted,
                    '&:hover': { bgcolor: 'rgba(102,126,234,0.1)', color: '#667eea', borderColor: 'rgba(102,126,234,0.4)' },
                    transition: 'all 0.2s',
                }}
            >
                <Settings fontSize="small" />
            </IconButton>

            <Drawer
                anchor="right"
                open={open}
                onClose={() => setOpen(false)}
                PaperProps={{
                    sx: {
                        width: 300,
                        bgcolor: cardBg,
                        borderLeft: cardBorder,
                        p: 0,
                    }
                }}
            >
                {/* Header */}
                <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: cardBorder }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ width: 32, height: 32, borderRadius: '8px', bgcolor: 'rgba(102,126,234,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#667eea' }}>
                            <Settings fontSize="small" />
                        </Box>
                        <Typography sx={{ fontSize: '15px', fontWeight: 700, color: textPrimary }}>
                            Personalizar Dashboard
                        </Typography>
                    </Box>
                    <IconButton size="small" onClick={() => setOpen(false)} sx={{ color: textMuted }}>
                        <Close fontSize="small" />
                    </IconButton>
                </Box>

                {/* Subtitle */}
                <Box sx={{ px: 2.5, py: 1.5 }}>
                    <Typography sx={{ fontSize: '12px', color: textMuted, lineHeight: 1.6 }}>
                        Ative ou desative widgets para personalizar sua visão do dashboard.
                        As preferências são salvas automaticamente.
                    </Typography>
                </Box>

                <Divider sx={{ borderColor: cardBorder.replace('1px solid ', '') }} />

                {/* Widget list */}
                <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {widgets.map((w) => (
                        <Box key={w.id} sx={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            p: 1.5, borderRadius: '8px',
                            bgcolor: w.enabled
                                ? isDark ? 'rgba(102,126,234,0.08)' : 'rgba(102,126,234,0.05)'
                                : 'transparent',
                            border: `1px solid ${w.enabled ? 'rgba(102,126,234,0.2)' : 'transparent'}`,
                            transition: 'all 0.2s',
                        }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Box sx={{
                                    width: 30, height: 30, borderRadius: '8px',
                                    bgcolor: `${w.color}18`, color: w.color,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    opacity: w.enabled ? 1 : 0.4,
                                }}>
                                    <span className="material-icons-round" style={{ fontSize: '16px' }}>{w.icon}</span>
                                </Box>
                                <Typography sx={{ fontSize: '13px', fontWeight: 500, color: w.enabled ? textPrimary : textMuted }}>
                                    {w.label}
                                </Typography>
                            </Box>
                            <Switch
                                checked={w.enabled}
                                onChange={() => toggle(w.id)}
                                size="small"
                                sx={{
                                    '& .MuiSwitch-switchBase.Mui-checked': { color: '#667eea' },
                                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#667eea' },
                                }}
                            />
                        </Box>
                    ))}
                </Box>
            </Drawer>
        </>
    );
};

export default DashboardCustomizer;
