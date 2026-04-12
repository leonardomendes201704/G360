import { Box, Typography, Chip, Avatar, Tooltip, IconButton, Checkbox } from '@mui/material';
import { Visibility, Edit, AccessTime, Warning } from '@mui/icons-material';
import InlineStatusSelect from '../common/InlineStatusSelect';
import { formatRelative } from '../../utils/dateUtils';

const statusConfig = {
    'OPEN': { label: 'Aberto', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
    'IN_PROGRESS': { label: 'Em Andamento', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
    'PENDING': { label: 'Pendente', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
    'RESOLVED': { label: 'Resolvido', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
    'CLOSED': { label: 'Fechado', color: '#64748b', bg: 'rgba(100, 116, 139, 0.15)' }
};

const statusOptions = [
    { value: 'OPEN', label: 'Aberto', color: '#f59e0b' },
    { value: 'IN_PROGRESS', label: 'Em Andamento', color: '#3b82f6' },
    { value: 'PENDING', label: 'Pendente', color: '#8b5cf6' },
    { value: 'RESOLVED', label: 'Resolvido', color: '#10b981' },
    { value: 'CLOSED', label: 'Fechado', color: '#64748b' },
];

const priorityConfig = {
    'P1': { label: 'P1 - Crítica', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
    'P2': { label: 'P2 - Alta', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
    'P3': { label: 'P3 - Média', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
    'P4': { label: 'P4 - Baixa', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' }
};

const IncidentList = ({
    incidents,
    onView,
    onEdit,
    onRefresh,
    onStatusChange,
    selectedIds = [],
    onSelectionChange,
    canWrite = true,
}) => {
    const allSelected = incidents.length > 0 && incidents.every(i => selectedIds.includes(i.id));
    const someSelected = incidents.some(i => selectedIds.includes(i.id)) && !allSelected;

    const toggleAll = () => {
        if (allSelected) onSelectionChange?.([]);
        else onSelectionChange?.(incidents.map(i => i.id));
    };

    const toggleOne = (id) => {
        if (selectedIds.includes(id)) onSelectionChange?.(selectedIds.filter(s => s !== id));
        else onSelectionChange?.([...selectedIds, id]);
    };

    const getSLAColor = (incident) => {
        if (incident.slaBreached) return '#ef4444';
        if (incident.status === 'CLOSED' || incident.status === 'RESOLVED') return '#10b981';
        const now = new Date(), created = new Date(incident.createdAt), due = new Date(incident.slaResolveDue);
        const pct = ((now - created) / (due - created)) * 100;
        return pct >= 80 ? '#f59e0b' : '#10b981';
    };

    const showBulk = !!onSelectionChange;

    return (
        <Box sx={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                        {showBulk && (
                            <th style={{ padding: '12px 8px', width: 40 }}>
                                <Checkbox
                                    size="small"
                                    checked={allSelected}
                                    indeterminate={someSelected}
                                    onChange={toggleAll}
                                    sx={{ color: '#64748b', '&.Mui-checked': { color: '#667eea' }, '&.MuiCheckbox-indeterminate': { color: '#667eea' } }}
                                />
                            </th>
                        )}
                        {['Código', 'Título', 'Categoria', 'Prioridade', 'Status', 'SLA', 'Responsável', 'Criado em', 'Ações'].map((h, i) => (
                            <th key={h} style={{ padding: '12px 16px', textAlign: i >= 3 && i <= 5 ? 'center' : 'left', color: '#9ca3af', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {incidents.map((inc, idx) => {
                        const status = statusConfig[inc.status] || statusConfig['OPEN'];
                        const priority = priorityConfig[inc.priority] || priorityConfig['P3'];
                        const slaColor = getSLAColor(inc);
                        const isSelected = selectedIds.includes(inc.id);

                        return (
                            <tr
                                key={inc.id}
                                style={{
                                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                                    background: isSelected
                                        ? 'rgba(102, 126, 234, 0.08)'
                                        : idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.02)',
                                    transition: 'background 0.2s',
                                    cursor: 'pointer',
                                    outline: isSelected ? '1px solid rgba(102, 126, 234, 0.3)' : 'none',
                                }}
                                onClick={() => onView(inc)}
                                onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'rgba(37, 99, 235, 0.05)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = isSelected ? 'rgba(102, 126, 234, 0.08)' : idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.02)'; }}
                            >
                                {showBulk && (
                                    <td style={{ padding: '8px 8px' }} onClick={(e) => e.stopPropagation()}>
                                        <Checkbox
                                            size="small"
                                            checked={isSelected}
                                            onChange={() => toggleOne(inc.id)}
                                            sx={{ color: '#64748b', '&.Mui-checked': { color: '#667eea' } }}
                                        />
                                    </td>
                                )}
                                <td style={{ padding: '12px 16px' }}>
                                    <Typography sx={{ color: '#818cf8', fontWeight: 600, fontSize: 14 }}>{inc.code}</Typography>
                                </td>
                                <td style={{ padding: '12px 16px', maxWidth: 250 }}>
                                    <Typography sx={{ color: '#e0e0e0', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inc.title}</Typography>
                                </td>
                                <td style={{ padding: '12px 16px' }}>
                                    <Typography sx={{ color: '#9ca3af', fontSize: 13 }}>{inc.category?.name || '-'}</Typography>
                                </td>
                                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                    <Chip label={priority.label} size="small" sx={{ bgcolor: priority.bg, color: priority.color, fontWeight: 600, fontSize: 11 }} />
                                </td>
                                <td style={{ padding: '12px 16px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                                    {onStatusChange && canWrite ? (
                                        <InlineStatusSelect
                                            status={inc.status}
                                            statusConfig={statusConfig}
                                            statusOptions={statusOptions}
                                            onStatusChange={(newStatus) => onStatusChange(inc.id, newStatus)}
                                        />
                                    ) : (
                                        <Chip label={status.label} size="small" sx={{ bgcolor: status.bg, color: status.color, fontWeight: 500, fontSize: 11 }} />
                                    )}
                                </td>
                                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                    <Tooltip title={inc.slaBreached ? 'SLA Estourado!' : 'Dentro do SLA'}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                                            {inc.slaBreached ? <Warning sx={{ color: '#ef4444', fontSize: 18 }} /> : <AccessTime sx={{ color: slaColor, fontSize: 18 }} />}
                                        </Box>
                                    </Tooltip>
                                </td>
                                <td style={{ padding: '12px 16px' }}>
                                    {inc.assignee ? (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Avatar sx={{ width: 24, height: 24, fontSize: 12, bgcolor: '#2563eb' }}>{inc.assignee.name?.[0]}</Avatar>
                                            <Typography sx={{ color: '#e0e0e0', fontSize: 13 }}>{inc.assignee.name}</Typography>
                                        </Box>
                                    ) : (
                                        <Typography sx={{ color: '#64748b', fontSize: 13, fontStyle: 'italic' }}>Não atribuído</Typography>
                                    )}
                                </td>
                                <td style={{ padding: '12px 16px' }}>
                                    <Tooltip title={new Date(inc.createdAt).toLocaleString('pt-BR')}>
                                        <Typography sx={{ color: '#9ca3af', fontSize: 13 }}>{formatRelative(inc.createdAt)}</Typography>
                                    </Tooltip>
                                </td>
                                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                                        <Tooltip title="Visualizar">
                                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); onView(inc); }} sx={{ color: '#818cf8', '&:hover': { bgcolor: 'rgba(129, 140, 248, 0.1)' } }}>
                                                <Visibility fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        {canWrite && inc.status !== 'CLOSED' && (
                                            <Tooltip title="Editar">
                                                <IconButton size="small" onClick={(e) => { e.stopPropagation(); onEdit(inc); }} sx={{ color: '#10b981', '&:hover': { bgcolor: 'rgba(16, 185, 129, 0.1)' } }}>
                                                    <Edit fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                    </Box>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </Box>
    );
};

export default IncidentList;
