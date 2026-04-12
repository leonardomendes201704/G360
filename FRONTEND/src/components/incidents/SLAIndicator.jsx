import { Box, LinearProgress, Typography, Tooltip } from '@mui/material';

/**
 * SLAIndicator - Indicador visual de progresso do SLA
 * Mostra tempo restante e barra de progresso com cores
 */
const SLAIndicator = ({
    dueDate,
    startDate = null,
    slaBreached = false,
    showLabel = true,
    size = 'normal' // 'small' | 'normal'
}) => {
    if (!dueDate) return null;

    const now = new Date();
    const due = new Date(dueDate);
    const start = startDate ? new Date(startDate) : new Date(due.getTime() - 4 * 60 * 60 * 1000); // Default 4h window

    const totalDuration = due - start;
    const elapsed = now - start;
    const percentage = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
    const remaining = due - now;

    // Determinar cor baseado no tempo restante
    let color = 'success';
    let bgColor = '#22c55e';
    let status = 'No Prazo';

    if (slaBreached || remaining < 0) {
        color = 'error';
        bgColor = '#ef4444';
        status = 'Estourado';
    } else if (remaining < 60 * 60 * 1000) { // < 1h
        color = 'error';
        bgColor = '#ef4444';
        status = 'Crítico';
    } else if (remaining < 2 * 60 * 60 * 1000) { // < 2h
        color = 'warning';
        bgColor = '#f59e0b';
        status = 'Atenção';
    }

    // Formatar tempo restante
    const formatRemaining = () => {
        if (remaining < 0) {
            const overdue = Math.abs(remaining);
            const hours = Math.floor(overdue / (1000 * 60 * 60));
            const minutes = Math.floor((overdue % (1000 * 60 * 60)) / (1000 * 60));
            return `-${hours}h ${minutes}m`;
        }
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m`;
    };

    const height = size === 'small' ? 4 : 6;
    const labelSize = size === 'small' ? 10 : 11;

    return (
        <Tooltip
            title={
                <Box>
                    <div><strong>SLA: </strong>{status}</div>
                    <div><strong>Vencimento: </strong>{due.toLocaleString('pt-BR')}</div>
                    <div><strong>Tempo Restante: </strong>{formatRemaining()}</div>
                </Box>
            }
        >
            <Box sx={{ width: '100%' }}>
                {showLabel && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography sx={{ fontSize: labelSize, color: bgColor, fontWeight: 600 }}>
                            {status}
                        </Typography>
                        <Typography sx={{ fontSize: labelSize, color: '#94a3b8' }}>
                            {formatRemaining()}
                        </Typography>
                    </Box>
                )}
                <LinearProgress
                    variant="determinate"
                    value={percentage}
                    color={color}
                    sx={{
                        height,
                        borderRadius: 1,
                        bgcolor: 'rgba(255,255,255,0.1)',
                        '& .MuiLinearProgress-bar': {
                            borderRadius: 1,
                            transition: 'none'
                        }
                    }}
                />
            </Box>
        </Tooltip>
    );
};

/**
 * SLABadge - Badge compacto para uso em tabelas
 */
export const SLABadge = ({ dueDate, slaBreached = false }) => {
    if (!dueDate) return <Typography sx={{ color: '#64748b', fontSize: 11 }}>-</Typography>;

    const now = new Date();
    const due = new Date(dueDate);
    const remaining = due - now;

    let color = '#22c55e';
    let label = 'OK';

    if (slaBreached || remaining < 0) {
        color = '#ef4444';
        label = 'Estourado';
    } else if (remaining < 60 * 60 * 1000) {
        color = '#ef4444';
        label = '< 1h';
    } else if (remaining < 2 * 60 * 60 * 1000) {
        color = '#f59e0b';
        label = '< 2h';
    } else {
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        label = `${hours}h`;
    }

    return (
        <Typography
            sx={{
                color,
                fontSize: 11,
                fontWeight: 700,
                px: 1,
                py: 0.25,
                borderRadius: 1,
                bgcolor: `${color}15`,
                display: 'inline-block'
            }}
        >
            {label}
        </Typography>
    );
};

export default SLAIndicator;
