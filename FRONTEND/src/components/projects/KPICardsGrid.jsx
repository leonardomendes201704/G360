import { useContext } from 'react';
import { Box, useTheme } from '@mui/material';
import { ThemeContext } from '../../contexts/ThemeContext';

const KPICardsGrid = ({ project, tasks = [], risks = [] }) => {
    const { mode } = useContext(ThemeContext);
    const theme = useTheme();

    // Theme-aware styles
    const textPrimary = mode === 'dark' ? '#f1f5f9' : theme.palette.text.primary;
    const textSecondary = mode === 'dark' ? '#64748b' : theme.palette.text.secondary;
    const cardBg = mode === 'dark' ? 'linear-gradient(145deg, #1a222d 0%, #151c25 100%)' : '#FFFFFF';
    const borderColor = mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.08)';
    const cardShadow = mode === 'dark' ? 'none' : '0 4px 6px -1px rgba(0, 0, 0, 0.07)';

    const budget = project?.budget ? parseFloat(project.budget) : 0;
    const actualCost = project?.actualCost ? parseFloat(project.actualCost) : 0;
    const criticalRisks = risks.filter(r =>
        r.impact === 'CRITICO' || r.riskLevel === 'CRITICO' || r.severity === 'CRITICAL'
    ).length;
    const completedTasks = tasks.filter(t => t.status === 'DONE').length;

    const kpis = [
        {
            label: 'Riscos Críticos',
            value: criticalRisks,
            icon: 'shield',
            colorClass: 'emerald',
            bgColor: 'rgba(16, 185, 129, 0.15)',
            iconColor: '#10b981',
            gradient: 'linear-gradient(90deg, #10b981, #06b6d4)',
        },
        {
            label: 'Orçamento',
            value: budget.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
            icon: 'account_balance_wallet',
            colorClass: 'indigo',
            bgColor: 'rgba(37, 99, 235, 0.15)',
            iconColor: '#2563eb',
            gradient: 'linear-gradient(90deg, #2563eb, #3b82f6)',
        },
        {
            label: 'Custo Real',
            value: actualCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
            icon: 'trending_down',
            colorClass: 'violet',
            bgColor: 'rgba(59, 130, 246, 0.15)',
            iconColor: '#3b82f6',
            gradient: 'linear-gradient(90deg, #3b82f6, #f43f5e)',
        },
        {
            label: 'Tarefas (Feitas/Total)',
            value: `${completedTasks} / ${tasks.length}`,
            icon: 'assignment',
            colorClass: 'cyan',
            bgColor: 'rgba(6, 182, 212, 0.15)',
            iconColor: '#06b6d4',
            gradient: 'linear-gradient(90deg, #06b6d4, #2563eb)',
        },
    ];

    return (
        <Box sx={{ display: 'flex', gap: 2.5, mb: 4 }}>
            {kpis.map((kpi, index) => (
                <Box
                    key={index}
                    sx={{
                        flex: 1,
                        background: cardBg,
                        border: `1px solid ${borderColor}`,
                        borderRadius: '8px',
                        p: 3,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2.5,
                        position: 'relative',
                        overflow: 'hidden',
                        transition: 'all 0.3s ease',
                        boxShadow: cardShadow,
                        '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            height: '3px',
                            background: kpi.gradient,
                            opacity: 0,
                            transition: 'opacity 0.3s',
                        },
                        '&:hover': {
                            transform: 'translateY(-4px)',
                            borderColor: mode === 'dark' ? 'rgba(37, 99, 235, 0.3)' : 'rgba(37, 99, 235, 0.5)',
                            boxShadow: mode === 'dark' ? '0 0 40px rgba(37, 99, 235, 0.1)' : '0 10px 25px rgba(37, 99, 235, 0.15)',
                            '&::before': {
                                opacity: 1,
                            },
                        },
                    }}
                >
                    {/* Icon */}
                    <Box
                        sx={{
                            width: 56,
                            height: 56,
                            borderRadius: '8px',
                            background: kpi.bgColor,
                            color: kpi.iconColor,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}
                    >
                        <span className="material-icons-round" style={{ fontSize: 28 }}>
                            {kpi.icon}
                        </span>
                    </Box>

                    {/* Content */}
                    <Box>
                        <Box
                            sx={{
                                fontSize: '13px',
                                color: textSecondary,
                                mb: 0.5,
                            }}
                        >
                            {kpi.label}
                        </Box>
                        <Box
                            sx={{
                                fontSize: '26px',
                                fontWeight: 700,
                                color: textPrimary,
                                fontFamily: kpi.label.includes('Orçamento') || kpi.label.includes('Custo') ? 'DM Sans, monospace' : 'inherit',
                            }}
                        >
                            {kpi.value}
                        </Box>
                    </Box>
                </Box>
            ))}
        </Box>
    );
};

export default KPICardsGrid;
