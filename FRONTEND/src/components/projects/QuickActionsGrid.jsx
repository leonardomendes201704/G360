import { useContext } from 'react';
import { Box, Grid, useTheme } from '@mui/material';
import { ThemeContext } from '../../contexts/ThemeContext';

const QuickActionsGrid = ({
    onNewTask,
    onNewRisk,
    onNewMinute,
    onAddMember,
    onAddCost,
    onAddProposal,
    onAddFollowUp
}) => {
    const { mode } = useContext(ThemeContext);
    const theme = useTheme();

    // Theme-aware styles
    const textPrimary = mode === 'dark' ? '#f1f5f9' : theme.palette.text.primary;
    const textSecondary = mode === 'dark' ? '#64748b' : theme.palette.text.secondary;
    const cardBg = mode === 'dark' ? 'linear-gradient(145deg, #1a222d 0%, #151c25 100%)' : '#FFFFFF';
    const borderColor = mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.08)';
    const cardShadow = mode === 'dark' ? 'none' : '0 4px 6px -1px rgba(0, 0, 0, 0.07)';
    const actionBg = mode === 'dark' ? '#1c2632' : '#f8fafc';
    const actionHoverBg = mode === 'dark' ? 'linear-gradient(145deg, #1e2835 0%, #19212b 100%)' : 'linear-gradient(145deg, #f1f5f9 0%, #ffffff 100%)';

    const actions = [
        {
            title: 'Nova Tarefa',
            subtitle: 'Adicionar atividade',
            icon: 'add_task',
            onClick: onNewTask,
            gradient: 'linear-gradient(135deg, #2563eb, #3b82f6)',
            shadow: 'rgba(37, 99, 235, 0.3)',
        },
        {
            title: 'Reportar Risco',
            subtitle: 'Identificar ameaça',
            icon: 'report_problem',
            onClick: onNewRisk,
            gradient: 'linear-gradient(135deg, #f59e0b, #f43f5e)',
            shadow: 'rgba(245, 158, 11, 0.3)',
        },
        {
            title: 'Nova Ata',
            subtitle: 'Registrar reunião',
            icon: 'summarize',
            onClick: onNewMinute,
            gradient: 'linear-gradient(135deg, #10b981, #06b6d4)',
            shadow: 'rgba(16, 185, 129, 0.3)',
        },
        {
            title: 'Add Membro',
            subtitle: 'Convidar para o time',
            icon: 'person_add',
            onClick: onAddMember,
            gradient: 'linear-gradient(135deg, #06b6d4, #2563eb)',
            shadow: 'rgba(6, 182, 212, 0.3)',
        },
        {
            title: 'Adicionar Custo',
            subtitle: 'Registrar despesa',
            icon: 'attach_money',
            onClick: onAddCost,
            gradient: 'linear-gradient(135deg, #ec4899, #3b82f6)',
            shadow: 'rgba(236, 72, 153, 0.3)',
        },
        {
            title: 'Nova Proposta',
            subtitle: 'Criar proposta',
            icon: 'assignment',
            onClick: onAddProposal,
            gradient: 'linear-gradient(135deg, #f59e0b, #ec4899)',
            shadow: 'rgba(245, 158, 11, 0.3)',
        },
        {
            title: 'Follow-Up',
            subtitle: 'Acompanhamento',
            icon: 'trending_up',
            onClick: onAddFollowUp,
            gradient: 'linear-gradient(135deg, #10b981, #2563eb)',
            shadow: 'rgba(16, 185, 129, 0.3)',
        },
    ];

    return (
        <Box
            sx={{
                background: cardBg,
                border: `1px solid ${borderColor}`,
                borderRadius: '8px',
                p: '28px',
                boxShadow: cardShadow,
            }}
        >
            {/* Header */}
            <Box display="flex" alignItems="center" gap={1.5} mb={3}>
                <span className="material-icons-round" style={{ color: '#2563eb', fontSize: 24 }}>
                    bolt
                </span>
                <Box sx={{ fontSize: '18px', fontWeight: 600, color: textPrimary }}>
                    Ações Rápidas
                </Box>
            </Box>

            {/* Actions Grid - CENTERED */}
            <Grid container spacing={2} justifyContent="center">
                {actions.map((action, index) => (
                    <Grid item xs={12} sm={6} md={4} lg={3} xl={2.4} key={index}>
                        <Box
                            onClick={action.onClick}
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 1.5,
                                p: '24px 16px',
                                background: actionBg,
                                border: `1px solid ${borderColor}`,
                                borderRadius: '8px',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                textAlign: 'center',
                                '&:hover': {
                                    background: actionHoverBg,
                                    borderColor: mode === 'dark' ? 'rgba(37, 99, 235, 0.3)' : 'rgba(37, 99, 235, 0.5)',
                                    transform: 'translateY(-4px)',
                                    boxShadow: mode === 'dark' ? '0 8px 24px rgba(0, 0, 0, 0.4)' : '0 8px 24px rgba(37, 99, 235, 0.15)',
                                    '& .action-icon': {
                                        transform: 'scale(1.1)',
                                    },
                                },
                            }}
                        >
                            {/* Icon */}
                            <Box
                                className="action-icon"
                                sx={{
                                    width: 52,
                                    height: 52,
                                    borderRadius: '8px',
                                    background: action.gradient,
                                    boxShadow: `0 4px 12px ${action.shadow}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    transition: 'transform 0.3s',
                                }}
                            >
                                <span className="material-icons-round" style={{ fontSize: 28 }}>
                                    {action.icon}
                                </span>
                            </Box>

                            {/* Text */}
                            <Box sx={{ fontSize: '14px', fontWeight: 600, color: textPrimary }}>
                                {action.title}
                            </Box>
                            <Box sx={{ fontSize: '12px', color: textSecondary }}>
                                {action.subtitle}
                            </Box>
                        </Box>
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
};

export default QuickActionsGrid;
