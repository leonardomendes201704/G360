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
 * @param {number}   [titleLineClamp=1] - Linhas do titulo (1 = uma linha + ellipsis; 2+ = line-clamp multilinha)
 * @param {string|object} [valueFontSize] - `fontSize` do valor principal (string ou breakpoints MUI, ex: `{ xs: '1rem', sm: '1.25rem' }`). Omite para o padrao compacto.
 * @param {object} [valueSx] - `sx` extra fundido no Typography do valor (sobrepoe parcialmente estilos padrao).
 */
const DEFAULT_VALUE_FONT_SIZE = {
    xs: 'clamp(0.875rem, 2.4vw, 1.25rem)',
    sm: '1.25rem',
};

const StatsCard = ({
    title,
    value,
    icon,
    iconName,
    color = 'primary',
    hexColor,
    trend,
    subtitle,
    accentBar = true,
    active = false,
    onClick,
    titleLineClamp = 1,
    valueFontSize,
    valueSx = {},
}) => {

    // Escurece uma cor hex em 25%
    const darken = (hex, amount = 0.25) => {
        const num = parseInt(hex.replace('#', ''), 16);
        const r = Math.max(0, Math.round(((num >> 16) & 0xff) * (1 - amount)));
        const g = Math.max(0, Math.round(((num >> 8) & 0xff) * (1 - amount)));
        const b = Math.max(0, Math.round((num & 0xff) * (1 - amount)));
        return `rgb(${r},${g},${b})`;
    };

    const colorMap = {
        primary: '#2563eb',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#0284c7',
    };

    const mainColor = hexColor || colorMap[color] || colorMap.primary;
    const darkColor = darken(mainColor, 0.3);

    const iconElement = iconName
        ? <span className="material-icons-round" style={{ fontSize: 42, color: '#ffffff' }}>{iconName}</span>
        : icon ? React.cloneElement(icon, { style: { fontSize: 42, color: '#ffffff' } }) : null;

    return (
        <Paper
            elevation={0}
            onClick={onClick}
            sx={{
                borderRadius: '6px',
                border: active ? `1px solid ${mainColor}` : '1px solid rgba(0,0,0,0.08)',
                display: 'flex',
                flexDirection: 'column',
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
                        height: 56,
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
            <Box sx={{ p: 2, pt: accentBar ? 1.5 : 2 }}>
                {/* Valor */}
                <Typography
                    component="div"
                    title={
                        value != null && (typeof value === 'string' || typeof value === 'number')
                            ? String(value)
                            : undefined
                    }
                    sx={{
                        fontSize: valueFontSize ?? DEFAULT_VALUE_FONT_SIZE,
                        fontWeight: 800,
                        color: darkColor,
                        lineHeight: 1.1,
                        mb: 0.5,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        minWidth: 0,
                        ...valueSx,
                    }}
                >
                    {value}
                </Typography>

                {/* Titulo — 1 linha (padrao) ou varias linhas com line-clamp */}
                <Typography
                    component="div"
                    title={typeof title === 'string' ? title : undefined}
                    data-testid="stats-card-title"
                    sx={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: darkColor,
                        opacity: 0.85,
                        mb: subtitle ? 0.25 : 0,
                        ...(titleLineClamp > 1
                            ? {
                                display: '-webkit-box',
                                WebkitLineClamp: titleLineClamp,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                whiteSpace: 'normal',
                                lineHeight: 1.35,
                            }
                            : {
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                            }),
                    }}
                >
                    {title}
                </Typography>

                {/* Subtitle */}
                {subtitle && (
                    <Typography
                        sx={{
                            fontSize: '11px',
                            color: darkColor,
                            opacity: 0.6,
                            fontWeight: 500,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            lineHeight: 1.35,
                        }}
                    >
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
            <Box sx={{ height: '3px', bgcolor: mainColor, mt: 'auto' }} />
        </Paper>
    );
};

export default StatsCard;
