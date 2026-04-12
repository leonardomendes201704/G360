import { Box, Avatar, Typography, IconButton, Tooltip, Chip, useTheme } from '@mui/material';
import { Edit, Visibility, Warning } from '@mui/icons-material';
import StatusChip from '../common/StatusChip';

const PRIORITY_COLORS = {
    P1: '#dc2626',
    P2: '#f59e0b',
    P3: '#3b82f6',
    P4: '#64748b'
};

const STATUS_COLUMNS = [
    { id: 'OPEN', label: 'Abertos', color: '#ef4444' },
    { id: 'IN_PROGRESS', label: 'Em Andamento', color: '#3b82f6' },
    { id: 'PENDING', label: 'Pendentes', color: '#f59e0b' },
    { id: 'RESOLVED', label: 'Resolvidos', color: '#22c55e' }
];

/**
 * IncidentKanban - Vista Kanban para gestão visual de incidentes
 */
const IncidentKanban = ({ incidents = [], onView, onEdit }) => {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';

    // Agrupar incidentes por status
    const groupedIncidents = STATUS_COLUMNS.reduce((acc, col) => {
        acc[col.id] = incidents.filter(inc => inc.status === col.id);
        return acc;
    }, {});

    const formatDate = (date) => {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    };

    const isSLANearBreach = (incident) => {
        if (!incident.slaResolveDue) return false;
        const now = new Date();
        const due = new Date(incident.slaResolveDue);
        const hoursRemaining = (due - now) / (1000 * 60 * 60);
        return hoursRemaining > 0 && hoursRemaining < 2;
    };

    return (
        <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 2, minHeight: 500 }}>
            {STATUS_COLUMNS.map(column => (
                <Box
                    key={column.id}
                    sx={{
                        minWidth: 300,
                        maxWidth: 320,
                        flex: '0 0 300px',
                        background: isDark ? '#1e293b' : theme.palette.grey[100],
                        borderRadius: 2,
                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : theme.palette.divider}`,
                        display: 'flex',
                        flexDirection: 'column'
                    }}
                >
                    {/* Column Header */}
                    <Box
                        sx={{
                            p: 2,
                            borderBottom: `3px solid ${column.color}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}
                    >
                        <Typography sx={{ fontWeight: 600, color: theme.palette.text.primary, fontSize: 14 }}>
                            {column.label}
                        </Typography>
                        <Chip
                            label={groupedIncidents[column.id].length}
                            size="small"
                            sx={{
                                bgcolor: `${column.color}20`,
                                color: column.color,
                                fontWeight: 700,
                                height: 24
                            }}
                        />
                    </Box>

                    {/* Column Content */}
                    <Box sx={{ p: 1, flex: 1, overflowY: 'auto', maxHeight: 'calc(100vh - 400px)' }}>
                        {groupedIncidents[column.id].length === 0 ? (
                            <Box sx={{ textAlign: 'center', py: 4, color: theme.palette.text.secondary }}>
                                Nenhum incidente
                            </Box>
                        ) : (
                            groupedIncidents[column.id].map(incident => (
                                <Box
                                    key={incident.id}
                                    sx={{
                                        p: 2,
                                        mb: 1,
                                        borderRadius: 2,
                                        background: isDark ? '#0f172a' : theme.palette.background.paper,
                                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : theme.palette.divider}`,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        '&:hover': {
                                            borderColor: 'rgba(37, 99, 235, 0.3)',
                                            transform: 'translateY(-2px)',
                                            boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.1)'
                                        }
                                    }}
                                    onClick={() => onView?.(incident)}
                                >
                                    {/* Header */}
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                                        <Typography sx={{ color: theme.palette.text.secondary, fontSize: 11, fontWeight: 600 }}>
                                            {incident.code}
                                        </Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            {incident.slaBreached && (
                                                <Tooltip title="SLA Estourado">
                                                    <Warning sx={{ fontSize: 14, color: '#ef4444' }} />
                                                </Tooltip>
                                            )}
                                            {isSLANearBreach(incident) && !incident.slaBreached && (
                                                <Tooltip title="SLA Próximo de Estourar">
                                                    <Warning sx={{ fontSize: 14, color: '#f59e0b' }} />
                                                </Tooltip>
                                            )}
                                            <Chip
                                                label={incident.priority}
                                                size="small"
                                                sx={{
                                                    bgcolor: `${PRIORITY_COLORS[incident.priority]}20`,
                                                    color: PRIORITY_COLORS[incident.priority],
                                                    fontWeight: 700,
                                                    height: 20,
                                                    fontSize: 10
                                                }}
                                            />
                                        </Box>
                                    </Box>

                                    {/* Title */}
                                    <Typography
                                        sx={{
                                            color: theme.palette.text.primary,
                                            fontSize: 13,
                                            fontWeight: 500,
                                            mb: 1,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical'
                                        }}
                                    >
                                        {incident.title}
                                    </Typography>

                                    {/* Category */}
                                    <Typography sx={{ color: theme.palette.text.secondary, fontSize: 11, mb: 1 }}>
                                        {incident.category?.name || 'Sem categoria'}
                                    </Typography>

                                    {/* Footer */}
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            {incident.assignee ? (
                                                <Tooltip title={incident.assignee.name}>
                                                    <Avatar
                                                        sx={{ width: 24, height: 24, fontSize: 10, bgcolor: '#2563eb' }}
                                                    >
                                                        {incident.assignee.name.charAt(0)}
                                                    </Avatar>
                                                </Tooltip>
                                            ) : (
                                                <Chip label="Não atribuído" size="small" sx={{ height: 20, fontSize: 10 }} />
                                            )}
                                        </Box>
                                        <Typography sx={{ color: theme.palette.text.secondary, fontSize: 10 }}>
                                            {formatDate(incident.createdAt)}
                                        </Typography>
                                    </Box>
                                </Box>
                            ))
                        )}
                    </Box>
                </Box>
            ))}
        </Box>
    );
};

export default IncidentKanban;
