import { useContext } from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { ThemeContext } from '../../contexts/ThemeContext';
import DashboardQuickAction from '../common/DashboardQuickAction';

const QuickActionsGrid = ({
    onNewTask,
    onNewRisk,
    onNewMinute,
    onAddMember,
    onAddCost,
    onAddProposal,
    onAddFollowUp,
}) => {
    const { mode } = useContext(ThemeContext);
    const theme = useTheme();
    const isDark = mode === 'dark';

    const actions = [
        {
            label: 'Nova Tarefa',
            subtitle: 'Adicionar atividade',
            icon: 'add_task',
            color: '#2563eb',
            onClick: onNewTask,
        },
        {
            label: 'Reportar Risco',
            subtitle: 'Identificar ameaça',
            icon: 'report_problem',
            color: '#f59e0b',
            onClick: onNewRisk,
        },
        {
            label: 'Nova Ata',
            subtitle: 'Registrar reunião',
            icon: 'summarize',
            color: '#10b981',
            onClick: onNewMinute,
        },
        {
            label: 'Add Membro',
            subtitle: 'Convidar para o time',
            icon: 'person_add',
            color: '#06b6d4',
            onClick: onAddMember,
        },
        {
            label: 'Adicionar Custo',
            subtitle: 'Registrar despesa',
            icon: 'attach_money',
            color: '#ec4899',
            onClick: onAddCost,
        },
        {
            label: 'Nova Proposta',
            subtitle: 'Criar proposta',
            icon: 'assignment',
            color: '#f97316',
            onClick: onAddProposal,
        },
        {
            label: 'Follow-Up',
            subtitle: 'Acompanhamento',
            icon: 'trending_up',
            color: '#6366f1',
            onClick: onAddFollowUp,
        },
    ];

    return (
        <Box
            sx={{
                bgcolor: isDark ? 'background.paper' : '#FFFFFF',
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: '8px',
                overflow: 'hidden',
                boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.06)',
            }}
        >
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    p: 2.5,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                }}
            >
                <span className="material-icons-round" style={{ fontSize: '20px', color: '#2563eb' }}>
                    flash_on
                </span>
                <Typography sx={{ fontSize: '15px', fontWeight: 600, color: 'text.primary' }}>
                    Ações Rápidas
                </Typography>
            </Box>

            <Box
                sx={{
                    p: 2,
                    display: 'flex',
                    flexDirection: { xs: 'row', sm: 'row' },
                    flexWrap: 'nowrap',
                    gap: 1,
                    width: '100%',
                    overflowX: 'auto',
                    WebkitOverflowScrolling: 'touch',
                    alignItems: 'stretch',
                    justifyContent: { xs: 'flex-start', sm: 'center' },
                }}
            >
                {actions.map((action) => (
                    <DashboardQuickAction
                        key={action.label}
                        icon={action.icon}
                        label={action.label}
                        subtitle={action.subtitle}
                        color={action.color}
                        onClick={action.onClick}
                    />
                ))}
            </Box>
        </Box>
    );
};

export default QuickActionsGrid;
