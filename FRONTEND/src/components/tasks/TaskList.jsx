import { format, startOfDay } from 'date-fns';
import { Edit, Delete, CalendarToday, Warning, CheckBox, CheckBoxOutlineBlank } from '@mui/icons-material';
import { Paper, Box, Typography, Checkbox } from '@mui/material';
import StatusChip from '../common/StatusChip';
import InlineStatusSelect from '../common/InlineStatusSelect';
import { formatRelative } from '../../utils/dateUtils';

const taskStatusConfig = {
    'TODO': { label: 'A Fazer', color: '#64748b', bg: 'rgba(100, 116, 139, 0.15)' },
    'IN_PROGRESS': { label: 'Em Andamento', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
    'DONE': { label: 'Concluído', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
    'COMPLETED': { label: 'Concluído', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
    'CANCELLED': { label: 'Cancelado', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
    'BLOCKED': { label: 'Bloqueado', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
    'REVIEW': { label: 'Em Revisão', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' },
};

const taskStatusOptions = [
    { value: 'TODO', label: 'A Fazer', color: '#64748b' },
    { value: 'IN_PROGRESS', label: 'Em Andamento', color: '#3b82f6' },
    { value: 'REVIEW', label: 'Em Revisão', color: '#8b5cf6' },
    { value: 'DONE', label: 'Concluído', color: '#10b981' },
    { value: 'BLOCKED', label: 'Bloqueado', color: '#f59e0b' },
    { value: 'CANCELLED', label: 'Cancelado', color: '#ef4444' },
];

const getPriorityLabel = (p) => ({ HIGH: 'Alta', MEDIUM: 'Média', LOW: 'Baixa', CRITICAL: 'Crítica' })[p] || p;
const getPriorityColor = (p) => ({ CRITICAL: '#ef4444', HIGH: '#f97316', MEDIUM: '#3b82f6', LOW: '#94a3b8' })[p] || '#94a3b8';

const getTaskDeadline = (task) => task.dueDate || task.endDate;
const isOverdue = (task) => {
    const deadline = getTaskDeadline(task);
    if (!deadline) return false;
    if (['DONE', 'COMPLETED', 'CANCELLED'].includes(task.status)) return false;
    return startOfDay(new Date(deadline)) < startOfDay(new Date());
};

const TaskList = ({
    tasks,
    onTaskClick,
    onDeleteTask,
    onStatusChange,
    selectedIds = [],
    onSelectionChange,
    canWrite = true,
    activeTimerTaskId,
    currentUserId,
    onTimerToggle
}) => {
    const allSelected = tasks.length > 0 && tasks.every(t => selectedIds.includes(t.id));
    const someSelected = tasks.some(t => selectedIds.includes(t.id)) && !allSelected;
    const showBulk = !!onSelectionChange;

    const toggleAll = () => {
        if (allSelected) onSelectionChange?.([]);
        else onSelectionChange?.(tasks.map(t => t.id));
    };
    const toggleOne = (id) => {
        if (selectedIds.includes(id)) onSelectionChange?.(selectedIds.filter(s => s !== id));
        else onSelectionChange?.([...selectedIds, id]);
    };

    return (
        <Paper elevation={0} variant="outlined" sx={{ borderRadius: '8px', overflow: 'hidden' }}>
            <Box sx={{ overflowX: 'auto' }}>
                <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
                    <Box component="thead" sx={{ bgcolor: '#f8fafc' }}>
                        <Box component="tr">
                            {showBulk && (
                                <Box component="th" sx={{ p: 1, width: 40 }}>
                                    <Checkbox
                                        size="small"
                                        checked={allSelected}
                                        indeterminate={someSelected}
                                        onChange={toggleAll}
                                        sx={{ color: '#94a3b8' }}
                                    />
                                </Box>
                            )}
                            {['TAREFA', 'TIPO', 'RESPONSÁVEL', 'STATUS', 'PRIORIDADE', 'VENCIMENTO', 'AÇÕES'].map(h => (
                                <Box key={h} component="th" sx={{ p: 2, textAlign: 'left', fontSize: '0.75rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.5px' }}>{h}</Box>
                            ))}
                        </Box>
                    </Box>
                    <Box component="tbody">
                        {tasks.length === 0 ? (
                            <Box component="tr">
                                <Box component="td" colSpan={showBulk ? 8 : 7} sx={{ p: 4, textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                                    Nenhuma tarefa encontrada.
                                </Box>
                            </Box>
                        ) : (
                            tasks.map((task) => {
                                const deadline = getTaskDeadline(task);
                                const overdue = isOverdue(task);
                                const isSelected = selectedIds.includes(task.id);

                                return (
                                    <Box component="tr" key={task.id}
                                        onClick={() => onTaskClick(task)}
                                        sx={{
                                            borderBottom: '1px solid #f1f5f9',
                                            transition: 'all 0.2s',
                                            cursor: 'pointer',
                                            bgcolor: isSelected
                                                ? 'rgba(102, 126, 234, 0.06)'
                                                : overdue ? '#fef2f2' : 'transparent',
                                            borderLeft: isSelected
                                                ? '3px solid #667eea'
                                                : overdue ? '3px solid #ef4444' : '3px solid transparent',
                                            '&:hover': { bgcolor: isSelected ? 'rgba(102, 126, 234, 0.1)' : overdue ? '#fee2e2' : '#f8fafc' },
                                            '&:last-child': { borderBottom: 'none' }
                                        }}
                                    >
                                        {showBulk && (
                                            <Box component="td" sx={{ p: 1 }} onClick={(e) => e.stopPropagation()}>
                                                <Checkbox
                                                    size="small"
                                                    checked={isSelected}
                                                    onChange={() => toggleOne(task.id)}
                                                    sx={{ color: '#94a3b8', '&.Mui-checked': { color: '#667eea' } }}
                                                />
                                            </Box>
                                        )}

                                        {/* TAREFA */}
                                        <Box component="td" sx={{ p: 2 }}>
                                            <Typography variant="body2" fontWeight="700" color="text.primary">
                                                {task.title}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                                {task.description ? (task.description.length > 50 ? task.description.substring(0, 50) + '...' : task.description) : 'Sem descrição'}
                                            </Typography>
                                        </Box>

                                        {/* TIPO */}
                                        <Box component="td" sx={{ p: 2 }}>
                                            <Box sx={{
                                                display: 'inline-block', px: 1, py: 0.3, borderRadius: '8px',
                                                bgcolor: task.riskId ? 'rgba(239, 68, 68, 0.12)' : '#f1f5f9',
                                                color: task.riskId ? '#dc2626' : '#475569',
                                                fontSize: '0.7rem', fontWeight: 700
                                            }}>
                                                {task.riskId ? '🛡️ RISCO' : task.projectId ? 'PROJETO' : (task.isPersonal ? 'PESSOAL' : 'GERAL')}
                                            </Box>
                                            {task.risk && (
                                                <Typography variant="caption" sx={{ display: 'block', color: '#dc2626', fontSize: '0.65rem', fontWeight: 600 }}>
                                                    {task.risk.title?.length > 25 ? task.risk.title.substring(0, 25) + '...' : task.risk.title}
                                                </Typography>
                                            )}
                                        </Box>

                                        {/* RESPONSÁVEL */}
                                        <Box component="td" sx={{ p: 2 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                <Box sx={{
                                                    width: 32, height: 32, borderRadius: '8px',
                                                    bgcolor: '#e0e7ff', color: '#1e40af', fontSize: '0.75rem', fontWeight: 'bold',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                }}>
                                                    {task.assignee ? task.assignee.name.charAt(0) : '?'}
                                                </Box>
                                                <Typography variant="body2" fontWeight="600" color="text.primary" fontSize="0.85rem">
                                                    {task.assignee ? task.assignee.name.split(' ')[0] : 'N/A'}
                                                </Typography>
                                            </Box>
                                        </Box>

                                        {/* STATUS */}
                                        <Box component="td" sx={{ p: 2 }} onClick={(e) => e.stopPropagation()}>
                                            {onStatusChange && canWrite ? (
                                                <InlineStatusSelect
                                                    status={task.status}
                                                    statusConfig={taskStatusConfig}
                                                    statusOptions={taskStatusOptions}
                                                    onStatusChange={(newStatus) => onStatusChange(task.id, newStatus)}
                                                />
                                            ) : (
                                                <StatusChip status={task.status} />
                                            )}
                                        </Box>

                                        {/* PRIORIDADE */}
                                        <Box component="td" sx={{ p: 2 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                <Box sx={{ width: 8, height: 8, borderRadius: '8px', bgcolor: getPriorityColor(task.priority) }} />
                                                <Typography variant="body2" fontSize="0.8rem" color="text.secondary">
                                                    {getPriorityLabel(task.priority)}
                                                </Typography>
                                            </Box>
                                        </Box>

                                        {/* VENCIMENTO */}
                                        <Box component="td" sx={{ p: 2 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: overdue ? '#dc2626' : '#64748b' }}>
                                                {overdue ? <Warning fontSize="inherit" /> : <CalendarToday fontSize="inherit" />}
                                                <Typography variant="body2" fontWeight={overdue ? 700 : 400} fontSize="0.85rem">
                                                    {deadline ? formatRelative(deadline) : '-'}
                                                </Typography>
                                            </Box>
                                        </Box>

                                        {/* AÇÕES */}
                                        <Box component="td" sx={{ p: 2, textAlign: 'right' }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                                                {task.assignee?.id === currentUserId && onTimerToggle && (
                                                    <Box component="button"
                                                        title={activeTimerTaskId === task.id ? 'Parar timer' : 'Iniciar timer'}
                                                        onClick={(e) => { e.stopPropagation(); onTimerToggle(task); }}
                                                        sx={{
                                                            border: 'none',
                                                            bgcolor: activeTimerTaskId === task.id ? 'rgba(16,185,129,0.15)' : 'transparent',
                                                            cursor: 'pointer',
                                                            p: 0.4,
                                                            borderRadius: '8px',
                                                            display: 'flex', alignItems: 'center',
                                                            color: activeTimerTaskId === task.id ? '#10b981' : '#64748b',
                                                            transition: 'all 0.15s',
                                                            animation: activeTimerTaskId === task.id ? 'timerPulse 1.5s ease-in-out infinite' : 'none',
                                                            '@keyframes timerPulse': {
                                                                '0%,100%': { opacity: 1 }, '50%': { opacity: 0.6 }
                                                            },
                                                            '&:hover': { bgcolor: 'rgba(0,0,0,0.04)', color: activeTimerTaskId === task.id ? '#ef4444' : '#0f172a' }
                                                        }}
                                                    >
                                                        <span className="material-icons-round" style={{ fontSize: 16 }}>
                                                            {activeTimerTaskId === task.id ? 'stop' : 'play_arrow'}
                                                        </span>
                                                    </Box>
                                                )}
                                                {canWrite && (
                                                    <Box component="button"
                                                        onClick={(e) => { e.stopPropagation(); onTaskClick(task); }}
                                                        sx={{ border: 'none', bgcolor: 'transparent', cursor: 'pointer', color: '#64748b', '&:hover': { color: '#0f172a' } }}>
                                                        <Edit fontSize="small" />
                                                    </Box>
                                                )}
                                                {canWrite && (
                                                    <Box component="button"
                                                        onClick={(e) => { e.stopPropagation(); onDeleteTask(task.id); }}
                                                        sx={{ border: 'none', bgcolor: 'transparent', cursor: 'pointer', color: '#cbd5e1', '&:hover': { color: '#ef4444' } }}>
                                                        <Delete fontSize="small" />
                                                    </Box>
                                                )}
                                            </Box>
                                        </Box>
                                    </Box>
                                );
                            })
                        )}
                    </Box>
                </Box>
            </Box>
        </Paper>
    );
};

export default TaskList;
