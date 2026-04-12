import React from 'react';
import { Paper, Box, Typography, Chip } from '@mui/material';
import { TrendingUp, TrendingDown, Remove } from '@mui/icons-material';

/**
 * StatsCard Component
 * Card padronizado para exibicao de KPIs e metricas.
 *
 * Layout: barra colorida no topo com icone branco + corpo branco com valor e titulo.
 * Linha fina colorida no rodape como accent.
 *
 * @param {string} title - Titulo do KPI (ex: "Despesas Pendentes")
 * @param {string|number} value - Valor principal
 * @param {ReactNode} icon - Icone do Material UI (componente)
 * @param {string} iconName - Nome do Material Icon (string, ex: 'payments')
 * @param {string} color - Cor tematica ('primary', 'success', 'warning', 'error', 'info')
 * @param {string} hexColor - Cor hex direta (sobrepoe color)
 * @param {object} trend - { value: number, label: string, type: 'up'|'down'|'neutral' }
 * @param {string} subtitle - Texto auxiliar abaixo do titulo
 * @param {boolean} accentBar - Exibe barra colorida no topo com icone (padrao: true)
 * @param {boolean} active - Destaque visual (borda colorida)
 * @param {function} onClick - Handler de clique
 */
const StatsCard = ({ title, value, icon, iconName, color = 'primary', hexColor, trend, subtitle, accentBar = true, active = false, onClick }) => {

    const colorMap = {
        primary: '#2563eb',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#0284c7',
    };

    const mainColor = hexColor || colorMap[color] || colorMap.primary;

    const iconElement = iconName
        ? <span className="material-icons-round" style={{ fontSize: 28, color: '#ffffff' }}>{iconName}</span>
        : icon ? React.cloneElement(icon, { style: { fontSize: 28, color: '#ffffff' } }) : null;

    return (
        <Paper
            elevation={0}
            onClick={onClick}
            sx={{
                borderRadius: '6px',
                border: active ? `1px solid ${mainColor}` : '1px solid rgba(0,0,0,0.08)',
                height: '100%',
                transition: 'all 0.2s ease-in-out',
                position: 'relative',
                overflow: 'hidden',
                cursor: onClick ? 'pointer' : 'default',
                bgcolor: '#ffffff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                '&:hover': {
                    transform: onClick ? 'translateY(-2px)' : 'none',
                    boxShadow: onClick ? '0 8px 24px rgba(0,0,0,0.08)' : '0 1px 3px rgba(0,0,0,0.06)',
                }
            }}
        >
            {/* Barra colorida no topo com icone dentro */}
            {accentBar && (
                <Box
                    sx={{
                        height: 40,
                        bgcolor: mainColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        px: 1.5,
                    }}
                >
                    {iconElement}
                </Box>
            )}

            {/* Corpo */}
            <Box sx={{ p: 2, pt: accentBar ? 2.5 : 2 }}>
                {/* Valor */}
                <Typography sx={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', lineHeight: 1, mb: 0.5 }}>
                    {value}
                </Typography>

                {/* Titulo */}
                <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#334155', mb: subtitle ? 0.25 : 0 }}>
                    {title}
                </Typography>

                {/* Subtitle */}
                {subtitle && (
                    <Typography sx={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>
                        {subtitle}
                    </Typography>
                )}

                {/* Trend */}
                {trend && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.75 }}>
                        <Chip
                            size="small"
                            icon={trend.type === 'up' ? <TrendingUp /> : trend.type === 'down' ? <TrendingDown /> : <Remove />}
                            label={`${trend.value}%`}
                            sx={{
                                height: 22,
                                bgcolor: trend.type === 'up' ? '#dcfce7' : trend.type === 'down' ? '#fee2e2' : '#f1f5f9',
                                color: trend.type === 'up' ? '#166534' : trend.type === 'down' ? '#991b1b' : '#64748b',
                                fontWeight: 700,
                                fontSize: '11px',
                                '& .MuiChip-icon': { fontSize: '14px', color: 'inherit' }
                            }}
                        />
                        <Typography sx={{ fontSize: '10px', color: '#94a3b8', fontWeight: 500 }}>
                            {trend.label || 'vs anterior'}
                        </Typography>
                    </Box>
                )}
            </Box>

            {/* Linha fina colorida no rodape */}
            <Box sx={{ height: '3px', bgcolor: mainColor }} />
        </Paper>
    );
};

export default StatsCard;
