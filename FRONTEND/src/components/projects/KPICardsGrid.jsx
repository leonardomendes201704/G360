import { Box } from '@mui/material';
import StatsCard from '../common/StatsCard';
import KpiGrid from '../common/KpiGrid';

const PRIORITY_LABEL = {
    LOW: 'Baixa',
    MEDIUM: 'Média',
    HIGH: 'Alta',
    CRITICAL: 'Crítica',
};

const PRIORITY_HEX = {
    LOW: '#10b981',
    MEDIUM: '#f59e0b',
    HIGH: '#f97316',
    CRITICAL: '#ef4444',
};

/** Valor numa linha: sem partir palavras; tooltip com texto completo (via `title` no StatsCard). */
const ellipsisValueSx = {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
};

const formatMoneyCompact = (n) => {
    const v = Number.isFinite(n) ? n : 0;
    return v.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    });
};

const formatPeriodCompact = (startDate, endDate) => {
    if (!startDate || !endDate) return '—';
    const opt = { day: '2-digit', month: '2-digit', year: '2-digit' };
    const a = new Date(startDate).toLocaleDateString('pt-BR', opt);
    const b = new Date(endDate).toLocaleDateString('pt-BR', opt);
    return `${a}–${b}`;
};

/**
 * Faixa única de 8 KPIs — modo denso (rótulos curtos, tipografia reduzida, ellipsis).
 */
const KPICardsGrid = ({ project, tasks = [], risks = [] }) => {
    if (!project) return null;

    const budget = project.budget ? parseFloat(project.budget) : 0;
    const actualCost = project.actualCost ? parseFloat(project.actualCost) : 0;
    const criticalRisks = risks.filter(
        (r) => r.impact === 'CRITICO' || r.riskLevel === 'CRITICO' || r.severity === 'CRITICAL'
    ).length;
    const completedTasks = tasks.filter((t) => t.status === 'DONE').length;

    const budgetFormatted = formatMoneyCompact(budget);
    const actualCostFormatted = formatMoneyCompact(actualCost);
    const tasksLabel = `${completedTasks}/${tasks.length}`;

    const priorityKey = project.priority || 'MEDIUM';
    const priorityLabel = PRIORITY_LABEL[priorityKey] || PRIORITY_LABEL.MEDIUM;
    const priorityColor = PRIORITY_HEX[priorityKey] || PRIORITY_HEX.MEDIUM;

    const periodLabel = formatPeriodCompact(project.startDate, project.endDate);

    const managerName = project.manager?.name || '—';
    const techLeadName = project.techLead?.name || '—';

    const dense = true;

    return (
        <Box
            sx={{
                width: '100%',
                overflowX: 'auto',
                WebkitOverflowScrolling: 'touch',
                mb: 4,
            }}
        >
            <KpiGrid
                maxColumns={8}
                maxColumnsMd={8}
                gap={1}
                mb={0}
                clampChildHeight
                sx={{
                    width: { xs: 'max(100%, 880px)', md: '100%' },
                    gridTemplateColumns: {
                        xs: 'repeat(8, minmax(100px, 1fr))',
                        sm: 'repeat(8, minmax(100px, 1fr))',
                        md: 'repeat(8, 1fr)',
                        lg: 'repeat(8, 1fr)',
                    },
                    '& > *': {
                        minWidth: 0,
                        maxHeight: '148px',
                    },
                }}
            >
                <StatsCard
                    dense={dense}
                    title="Gerente"
                    value={managerName}
                    iconName="person"
                    hexColor="#2563eb"
                    valueSx={ellipsisValueSx}
                />
                <StatsCard
                    dense={dense}
                    title="Técnico"
                    value={techLeadName}
                    iconName="engineering"
                    hexColor="#14b8a6"
                    valueSx={ellipsisValueSx}
                />
                <StatsCard dense={dense} title="Prioridade" value={priorityLabel} iconName="flag" hexColor={priorityColor} />
                <StatsCard
                    dense={dense}
                    title="Período"
                    value={periodLabel}
                    iconName="date_range"
                    hexColor="#3b82f6"
                    valueSx={ellipsisValueSx}
                />
                <StatsCard dense={dense} title="Riscos" value={criticalRisks} iconName="security" hexColor="#10b981" />
                <StatsCard
                    dense={dense}
                    title="Orçamento"
                    value={budgetFormatted}
                    iconName="account_balance_wallet"
                    hexColor="#2563eb"
                    valueSx={ellipsisValueSx}
                />
                <StatsCard
                    dense={dense}
                    title="Custo"
                    value={actualCostFormatted}
                    iconName="trending_down"
                    hexColor="#3b82f6"
                    valueSx={ellipsisValueSx}
                />
                <StatsCard dense={dense} title="Tarefas" value={tasksLabel} iconName="assignment" hexColor="#06b6d4" />
            </KpiGrid>
        </Box>
    );
};

export default KPICardsGrid;
