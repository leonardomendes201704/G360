import { useContext } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Box, Typography, Chip, Avatar, Tooltip } from '@mui/material';
import { Event } from '@mui/icons-material';
import { format, isPast, isToday, isTomorrow, addDays, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ThemeContext } from '../../contexts/ThemeContext';

const DraggableTaskCard = ({
    task,
    onClick,
    taskIndex,
    activeTimerTaskId,
    onTimerToggle,
    currentUserId,
    onContextMenu,
}) => {
    const { mode } = useContext(ThemeContext);
    const isDark = mode === 'dark';
    const cardBg = isDark ? 'linear-gradient(145deg, #1a222d 0%, #151c25 100%)' : '#ffffff';
    const cardBorder = isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(0, 0, 0, 0.08)';
    const cardHoverShadow = isDark ? '0 8px 24px rgba(0, 0, 0, 0.4)' : '0 8px 24px rgba(0, 0, 0, 0.12)';
    const badgeBg = isDark ? '#1c2632' : '#f1f5f9';
    const textPrimary = isDark ? '#f1f5f9' : '#0f172a';
    const textSecondary = isDark ? '#64748b' : '#475569';
    const textMuted = isDark ? '#94a3b8' : '#64748b';
    const borderSubtle = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';
    const progressBg = isDark ? 'rgba(255, 255, 255, 0.06)' : '#e2e8f0';

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: task.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const getPriorityColor = (priority) => {
        switch (priority?.toUpperCase()) {
            case 'CRITICAL': return { bg: '#ef4444', shadow: '0 0 8px rgba(239, 68, 68, 0.5)', label: 'Crítica', icon: 'error' };
            case 'HIGH': return { bg: '#f43f5e', shadow: '0 0 8px rgba(244, 63, 94, 0.5)', label: 'Alta', icon: 'arrow_upward' };
            case 'MEDIUM': return { bg: '#f59e0b', shadow: '0 0 8px rgba(245, 158, 11, 0.5)', label: 'Média', icon: 'remove' };
            case 'LOW': return { bg: '#10b981', shadow: '0 0 8px rgba(16, 185, 129, 0.5)', label: 'Baixa', icon: 'arrow_downward' };
            default: return { bg: '#64748b', shadow: '0 0 8px rgba(100, 116, 139, 0.5)', label: priority, icon: 'remove' };
        }
    };

    const getTagColor = (tag) => {
        const tagLower = tag?.toLowerCase() || '';
        if (tagLower.includes('frontend') || tagLower.includes('ui'))
            return { bg: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4' };
        if (tagLower.includes('backend') || tagLower.includes('api') || tagLower.includes('devops'))
            return { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' };
        if (tagLower.includes('design') || tagLower.includes('ux'))
            return { bg: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e' };
        if (tagLower.includes('doc'))
            return { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' };
        if (tagLower.includes('bug') || tagLower.includes('fix'))
            return { bg: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e' };
        return { bg: 'rgba(37, 99, 235, 0.15)', color: '#2563eb' };
    };

    const getDueStatus = (dueDate) => {
        if (!dueDate) return null;
        const date = startOfDay(new Date(dueDate));
        const today = startOfDay(new Date());
        if (date < today) return { color: '#f43f5e', label: 'Atrasada', icon: 'warning' };
        if (isToday(date) || isTomorrow(date) || date <= addDays(today, 3))
            return { color: '#f59e0b', label: format(date, 'dd MMM', { locale: ptBR }), icon: 'schedule' };
        return { color: textMuted, label: format(date, 'dd MMM', { locale: ptBR }), icon: 'event' };
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'BACKLOG': return { bg: '#64748b', label: 'Backlog' };
            case 'TODO': return { bg: '#0ea5e9', label: 'A Fazer' };
            case 'ON_HOLD': return { bg: '#f59e0b', label: 'Em Pausa' };
            case 'IN_PROGRESS': return { bg: '#3b82f6', label: 'Em Progresso' };
            case 'DONE': return { bg: '#10b981', label: 'Concluído' };
            case 'CANCELLED': return { bg: '#94a3b8', label: 'Cancelada' };
            default: return { bg: '#64748b', label: status };
        }
    };

    const priorityStyle = getPriorityColor(task.priority);
    const statusStyle = getStatusColor(task.status);
    const dueStatus = task.status === 'DONE' ? null : getDueStatus(task.dueDate || task.endDate);

    const checklistTotal = task.checklist?.length || 0;
    const checklistDone = task.checklist?.filter(item => item.completed || item.done).length || 0;

    let progressValue = null;
    let progressLabel = '';

    if (checklistTotal > 0) {
        progressValue = Math.round((checklistDone / checklistTotal) * 100);
        progressLabel = `${checklistDone}/${checklistTotal}`;
    } else if (task.progress !== undefined && task.progress !== null) {
        progressValue = Number(task.progress);
        progressLabel = 'Progresso';
    }

    const assignee = task.assignedTo || task.assignee;
    const showTimer = onTimerToggle && currentUserId && assignee?.id === currentUserId;

    return (
        <Box
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onContextMenu={
                onContextMenu
                    ? (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onContextMenu(e, task);
                    }
                    : undefined
            }
            className="animate-card-enter"
            sx={{
                background: cardBg,
                border: cardBorder,
                borderRadius: '8px',
                borderLeft: `3px solid ${statusStyle.bg}`,
                padding: '14px 16px',
                cursor: isDragging ? 'grabbing' : 'grab',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                '&:hover': {
                    borderColor: 'rgba(37, 99, 235, 0.3)',
                    borderLeftColor: statusStyle.bg,
                    transform: isDragging ? 'none' : 'translateY(-2px)',
                    boxShadow: isDragging ? 'none' : cardHoverShadow,
                    '& .card-open-btn': { opacity: 1, transform: 'scale(1)' },
                },
            }}
        >
            {/* Header: Title + Open Button */}
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, mb: 0.75 }}>
                <Typography
                    sx={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: textPrimary,
                        lineHeight: 1.4,
                        flex: 1,
                    }}
                >
                    {task.title || task.name}
                </Typography>
                <Box
                    className="card-open-btn"
                    onClick={(e) => { e.stopPropagation(); onClick(task); }}
                    sx={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        opacity: 0,
                        transform: 'scale(0.8)',
                        background: 'rgba(37, 99, 235, 0.1)',
                        flexShrink: 0,
                        '&:hover': {
                            background: 'rgba(37, 99, 235, 0.2)',
                        },
                    }}
                    title="Abrir tarefa"
                >
                    <span className="material-icons-round" style={{ fontSize: '16px', color: '#2563eb' }}>open_in_new</span>
                </Box>
            </Box>

            {/* Description */}
            {task.description && (
                <Typography
                    sx={{
                        fontSize: '12px',
                        color: textSecondary,
                        mb: 1.25,
                        lineHeight: 1.5,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                    }}
                >
                    {task.description}
                </Typography>
            )}

            {/* Badges: Priority + Tags */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1.25 }}>
                {task.priority && (
                    <Box sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.5,
                        px: 1,
                        py: 0.25,
                        borderRadius: '8px',
                        background: `${priorityStyle.bg}18`,
                        border: `1px solid ${priorityStyle.bg}35`,
                    }}>
                        <span className="material-icons-round" style={{ fontSize: '12px', color: priorityStyle.bg }}>{priorityStyle.icon}</span>
                        <Typography sx={{ fontSize: '11px', fontWeight: 600, color: priorityStyle.bg }}>{priorityStyle.label}</Typography>
                    </Box>
                )}
                {task.tags && task.tags.length > 0 && task.tags.slice(0, 2).map((tag, idx) => {
                    const tagStyle = getTagColor(tag);
                    return (
                        <Box key={idx} sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            px: 1,
                            py: 0.25,
                            borderRadius: '8px',
                            background: tagStyle.bg,
                        }}>
                            <Typography sx={{ fontSize: '11px', fontWeight: 600, color: tagStyle.color }}>{tag}</Typography>
                        </Box>
                    );
                })}
            </Box>

            {/* Progress Bar */}
            {progressValue !== null && (
                <Box sx={{ mb: 1.25 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <span className="material-icons-round" style={{ fontSize: '13px', color: textSecondary }}>
                                {checklistTotal > 0 ? 'checklist' : 'trending_up'}
                            </span>
                            <Typography sx={{ fontSize: '11px', color: textSecondary }}>
                                {progressLabel}
                            </Typography>
                        </Box>
                        <Typography sx={{ fontSize: '11px', fontWeight: 600, color: progressValue === 100 ? '#22c55e' : '#2563eb' }}>
                            {progressValue}%
                        </Typography>
                    </Box>
                    <Box sx={{ height: '3px', borderRadius: '8px', bgcolor: progressBg, overflow: 'hidden' }}>
                        <Box sx={{
                            width: `${progressValue}%`,
                            height: '100%',
                            background: progressValue === 100
                                ? 'linear-gradient(90deg, #22c55e 0%, #10b981 100%)'
                                : 'linear-gradient(90deg, #2563eb 0%, #3b82f6 100%)',
                            transition: 'width 0.3s ease',
                        }} />
                    </Box>
                </Box>
            )}

            {/* Footer: Assignee + Due Date */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    pt: 1,
                    borderTop: `1px solid ${borderSubtle}`,
                }}
            >
                {/* Assignee */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
                    {assignee ? (
                        <Box sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.75,
                            bgcolor: isDark ? 'rgba(37,99,235,0.1)' : '#eff6ff',
                            px: 1,
                            py: 0.5,
                            borderRadius: '8px',
                            border: `1px solid ${isDark ? 'rgba(37,99,235,0.2)' : '#bfdbfe'}`
                        }}>
                            <span className="material-icons-round" style={{ fontSize: '14px', color: '#3b82f6' }}>person</span>
                            <Typography sx={{ fontSize: '11px', fontWeight: 600, color: isDark ? '#60a5fa' : '#2563eb', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {assignee.name || assignee.email || 'Sem responsável'}
                            </Typography>
                        </Box>
                    ) : (
                        <Typography sx={{ fontSize: '11px', color: textSecondary, fontStyle: 'italic' }}>
                            Não atribuído
                        </Typography>
                    )}
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {showTimer && (
                        <Tooltip title={activeTimerTaskId === task.id ? 'Parar timer' : 'Iniciar timer'} arrow>
                            <Box
                                component="button"
                                type="button"
                                onClick={(e) => { e.stopPropagation(); onTimerToggle(task); }}
                                onPointerDown={(e) => e.stopPropagation()}
                                sx={{
                                    border: 'none',
                                    bgcolor: activeTimerTaskId === task.id ? 'rgba(16,185,129,0.15)' : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
                                    cursor: 'pointer',
                                    p: 0.4,
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: activeTimerTaskId === task.id ? '#10b981' : textMuted,
                                    transition: 'all 0.2s',
                                    flexShrink: 0,
                                    animation: activeTimerTaskId === task.id ? 'timerPulse 1.5s ease-in-out infinite' : 'none',
                                    '@keyframes timerPulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.6 } },
                                    '&:hover': {
                                        bgcolor: activeTimerTaskId === task.id ? 'rgba(239,68,68,0.15)' : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'),
                                        color: activeTimerTaskId === task.id ? '#ef4444' : '#2563eb'
                                    }
                                }}
                            >
                                <span className="material-icons-round" style={{ fontSize: 14 }}>
                                    {activeTimerTaskId === task.id ? 'stop' : 'play_arrow'}
                                </span>
                            </Box>
                        </Tooltip>
                    )}

                    {task.status === 'DONE' && (
                        <Box sx={{
                            display: 'flex', alignItems: 'center', gap: 0.4,
                            px: 0.75, py: 0.25, borderRadius: '8px',
                            background: 'rgba(34, 197, 94, 0.15)',
                        }}>
                            <span className="material-icons-round" style={{ fontSize: '13px', color: '#4ade80' }}>check_circle</span>
                            <Typography sx={{ fontSize: '11px', fontWeight: 600, color: '#4ade80', textTransform: 'uppercase' }}>Entregue</Typography>
                        </Box>
                    )}

                    {dueStatus && task.status !== 'DONE' && (
                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.4,
                        px: 0.75,
                        py: 0.25,
                        borderRadius: '8px',
                        background: `${dueStatus.color}15`,
                    }}>
                        <span className="material-icons-round" style={{ fontSize: '13px', color: dueStatus.color }}>{dueStatus.icon}</span>
                        <Typography sx={{ fontSize: '11px', fontWeight: 500, color: dueStatus.color }}>
                            {dueStatus.label}
                        </Typography>
                    </Box>
                )}
                </Box>
            </Box>
        </Box>
    );
};

export default DraggableTaskCard;
