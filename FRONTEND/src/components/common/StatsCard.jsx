import React from 'react';
import { Paper, Box, Typography, Chip } from '@mui/material';
import { TrendingUp, TrendingDown, Remove } from '@mui/icons-material';

/**
 * StatsCard Component
 * Card padronizado para exibição de KPIs e métricas.
 * 
 * @param {string} title - Título do KPI (ex: "Receita Total")
 * @param {string|number} value - Valor principal
 * @param {ReactNode} icon - Ícone do Material UI (componente)
 * @param {string} iconName - Nome do Material Icon (string, ex: 'payments') — alternativa a icon
 * @param {string} color - Cor temática ('primary', 'success', 'warning', 'error', 'info')
 * @param {string} hexColor - Cor hex direta (sobrepoe color quando fornecida)
 * @param {object} trend - Objeto de tendência { value: number, label: string, type: 'up'|'down'|'neutral' }
 * @param {boolean} active - Se true, aplica um destaque visual (borda/sombra)
 * @param {function} onClick - Handler de clique (torna o card interativo)
 */
const StatsCard = ({ title, value, icon, iconName, color = 'primary', hexColor, trend, active = false, onClick }) => {

    // Mapeamento de cores para backgrounds suaves
    const bgColors = {
        primary: '#e0e7ff', // indigo-100
        success: '#dcfce7', // green-100
        warning: '#fef3c7', // amber-100
        error: '#fee2e2',   // red-100
        info: '#e0f2fe',    // sky-100
    };

    const textColors = {
        primary: '#1e40af', // indigo-700
        success: '#15803d', // green-700
        warning: '#b45309', // amber-700
        error: '#b91c1c',   // red-700
        info: '#0369a1',    // sky-700
    };

    const mainColor = hexColor || textColors[color] || textColors.primary;
    const bgColor = hexColor ? `${hexColor}20` : bgColors[color] || bgColors.primary;

    const iconElement = iconName
        ? <span className="material-icons-round" style={{ fontSize: 22, color: mainColor }}>{iconName}</span>
        : icon;

    return (
        <Paper
            elevation={0}
            variant="outlined"
            onClick={onClick}
            sx={{
                p: 3,
                borderRadius: 4,
                border: active ? `1px solid ${mainColor}` : '1px solid #f1f5f9',
                height: '100%',
                transition: 'all 0.2s ease-in-out',
                position: 'relative',
                overflow: 'hidden',
                cursor: onClick ? 'pointer' : 'default',
                boxShadow: active ? `0 4px 20px ${bgColor}` : 'none',
                '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 12px 24px rgba(0,0,0,0.05)',
                    borderColor: active ? mainColor : '#e2e8f0'
                }
            }}
        >
            {/* Indicador de topo se ativo */}
            {active && (
                <Box
                    sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '4px',
                        bgcolor: mainColor
                    }}
                />
            )}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Typography variant="subtitle2" sx={{ color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.75rem' }}>
                    {title}
                </Typography>
                <Box
                    sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 3,
                        bgcolor: bgColor,
                        color: mainColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    {iconElement}
                </Box>
            </Box>

            <Typography variant="h4" sx={{ fontWeight: 800, color: '#1e293b', mb: 1, letterSpacing: '-1px' }}>
                {value}
            </Typography>

            {trend && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                        size="small"
                        icon={trend.type === 'up' ? <TrendingUp /> : trend.type === 'down' ? <TrendingDown /> : <Remove />}
                        label={`${trend.value}%`}
                        sx={{
                            height: 24,
                            bgcolor: trend.type === 'up' ? '#dcfce7' : trend.type === 'down' ? '#fee2e2' : '#f1f5f9',
                            color: trend.type === 'up' ? '#166534' : trend.type === 'down' ? '#991b1b' : '#64748b',
                            fontWeight: 700,
                            '& .MuiChip-icon': { fontSize: '16px', color: 'inherit' }
                        }}
                    />
                    <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 500 }}>
                        {trend.label || 'vs mês anterior'}
                    </Typography>
                </Box>
            )}
        </Paper>
    );
};

export default StatsCard;
