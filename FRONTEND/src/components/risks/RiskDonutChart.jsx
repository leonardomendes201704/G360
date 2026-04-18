import React, { useContext, useMemo } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { PieChart } from '@mui/x-charts/PieChart';
import { ThemeContext } from '../../contexts/ThemeContext';

const RiskDonutChart = ({ risks = [] }) => {
    const { mode } = useContext(ThemeContext);
    const isDark = mode === 'dark';

    const severityData = useMemo(() => {
        const counts = { critical: 0, high: 0, medium: 0, low: 0 };

        risks.forEach(risk => {
            const sev = risk.severity || 0;
            if (sev >= 16) counts.critical++;
            else if (sev >= 10) counts.high++;
            else if (sev >= 6) counts.medium++;
            else counts.low++;
        });

        return [
            { id: 0, value: counts.critical, label: 'Crítico', color: '#ef4444' },
            { id: 1, value: counts.high, label: 'Alto', color: '#f97316' },
            { id: 2, value: counts.medium, label: 'Médio', color: '#f59e0b' },
            { id: 3, value: counts.low, label: 'Baixo', color: '#10b981' },
        ].filter(d => d.value > 0);
    }, [risks]);

    const total = risks.length;

    // When there's no data, show placeholder
    const placeholderData = [
        { id: 0, value: 1, label: 'Sem dados', color: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }
    ];

    const chartData = severityData.length > 0 ? severityData : placeholderData;

    return (
        <Paper sx={{
            p: 3,
            borderRadius: '8px',
            background: isDark ? 'linear-gradient(145deg, #1a222d 0%, #151c25 100%)' : '#FFFFFF',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(0, 0, 0, 0.08)',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
        }}>
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                Distribuição por Severidade
            </Typography>

            {/* Chart Container */}
            <Box sx={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                minHeight: 220,
            }}>
                <PieChart
                    series={[{
                        data: chartData,
                        innerRadius: 55,
                        outerRadius: 90,
                        paddingAngle: 3,
                        cornerRadius: 6,
                        startAngle: -90,
                        cx: 105,
                        highlightScope: { fade: 'global', highlight: 'item' },
                        faded: { innerRadius: 50, additionalRadius: -5, color: 'gray' },
                    }]}
                    slotProps={{
                        legend: { hidden: true },
                    }}
                    width={220}
                    height={220}
                    sx={{
                        '& .MuiChartsTooltip-root': {
                            bgcolor: isDark ? '#1a222d' : '#fff',
                            border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0',
                            borderRadius: '8px',
                        },
                    }}
                />
                {/* Center label */}
                <Box sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                    pointerEvents: 'none',
                }}>
                    <Typography sx={{
                        fontSize: '1.75rem',
                        fontWeight: 800,
                        color: isDark ? '#f1f5f9' : '#0f172a',
                        lineHeight: 1,
                    }}>
                        {total}
                    </Typography>
                    <Typography sx={{
                        fontSize: '0.65rem',
                        fontWeight: 600,
                        color: isDark ? '#64748b' : '#94a3b8',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                    }}>
                        Riscos
                    </Typography>
                </Box>
            </Box>

            {/* Custom Legend */}
            <Box sx={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 1,
                mt: 1,
            }}>
                {[
                    { label: 'Crítico', color: '#ef4444', count: risks.filter(r => (r.severity || 0) >= 16).length },
                    { label: 'Alto', color: '#f97316', count: risks.filter(r => (r.severity || 0) >= 10 && (r.severity || 0) < 16).length },
                    { label: 'Médio', color: '#f59e0b', count: risks.filter(r => (r.severity || 0) >= 6 && (r.severity || 0) < 10).length },
                    { label: 'Baixo', color: '#10b981', count: risks.filter(r => (r.severity || 0) < 6).length },
                ].map(item => (
                    <Box key={item.label} sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        px: 1.5,
                        py: 0.75,
                        borderRadius: '8px',
                        bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                        transition: 'background 0.2s',
                        '&:hover': {
                            bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                        },
                    }}>
                        <Box sx={{
                            width: 10,
                            height: 10,
                            borderRadius: '8px',
                            bgcolor: item.color,
                            boxShadow: `0 0 6px ${item.color}40`,
                            flexShrink: 0,
                        }} />
                        <Typography sx={{
                            fontSize: '0.75rem',
                            color: isDark ? '#94a3b8' : '#64748b',
                            flex: 1,
                        }}>
                            {item.label}
                        </Typography>
                        <Typography sx={{
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            color: isDark ? '#f1f5f9' : '#0f172a',
                        }}>
                            {item.count}
                        </Typography>
                    </Box>
                ))}
            </Box>
        </Paper>
    );
};

export default RiskDonutChart;
