import { useContext } from 'react';
import { Box, Typography, Chip, Avatar } from '@mui/material';
import { Event, Warning, Flag } from '@mui/icons-material';
import { format, isPast, isToday, isTomorrow, addDays, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ThemeContext } from '../../contexts/ThemeContext';

const DarkTaskCard = ({ task, onClick, taskIndex }) => {
    const { mode } = useContext(ThemeContext);
    const isDark = mode === 'dark';

    // Theme-aware styles
    const cardBg = isDark ? 'linear-gradient(145deg, #1a222d 0%, #151c25 100%)' : '#FFFFFF';
    const cardBorder = isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(0, 0, 0, 0.08)';
    const cardHoverShadow = isDark ? '0 8px 24px rgba(0, 0, 0, 0.4)' : '0 8px 24px rgba(0, 0, 0, 0.12)';
    const badgeBg = isDark ? '#1c2632' : '#f1f5f9';
    const textPrimary = isDark ? '#f1f5f9' : '#0f172a';
    const textSecondary = isDark ? '#64748b' : '#475569';
    const textMuted = isDark ? '#94a3b8' : '#64748b';
    const borderSubtle = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';
    const progressBg = isDark ? 'rgba(255, 255, 255, 0.06)' : '#e2e8f0';

    const getPriorityColor = (priority) => {
        switch (priority?.toUpperCase()) {
            case 'HIGH': return { bg: '#f43f5e', shadow: '0 0 8px rgba(244, 63, 94, 0.6)' };
            case 'MEDIUM': return { bg: '#f59e0b', shadow: '0 0 8px rgba(245, 158, 11, 0.6)' };
            case 'LOW': return { bg: '#10b981', shadow: '0 0 8px rgba(16, 185, 129, 0.6)' };
            default: return { bg: '#64748b', shadow: '0 0 8px rgba(100, 116, 139, 0.6)' };
        }
    };

    const getTagColor = (tag) => {
        const tagLower = tag?.toLowerCase() || '';
        if (tagLower.includes('frontend') || tagLower.includes('ui')) {
            return { bg: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4' };
        }
        if (tagLower.includes('backend') || tagLower.includes('api') || tagLower.includes('devops')) {
            return { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' };
        }
        if (tagLower.includes('design') || tagLower.includes('ux')) {
            return { bg: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e' };
        }
        if (tagLower.includes('doc')) {
            return { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' };
        }
        if (tagLower.includes('bug') || tagLower.includes('fix')) {
            return { bg: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e' };
        }
        return { bg: 'rgba(37, 99, 235, 0.15)', color: '#2563eb' };
    };

    const getDueStatus = (dueDate) => {
        if (!dueDate) return null;
        const date = startOfDay(new Date(dueDate));
        const today = startOfDay(new Date());
        if (date < today) {
            return { color: '#f43f5e', label: 'Atrasada' };
        }
        if (isToday(date) || isTomorrow(date) || date <= addDays(today, 3)) {
            return { color: '#f59e0b', label: format(date, 'dd MMM', { locale: ptBR }) };
        }
        return { color: '#94a3b8', label: format(date, 'dd MMM', { locale: ptBR }) };
    };

    const priorityStyle = getPriorityColor(task.priority);
    const dueStatus = getDueStatus(task.dueDate);
    const assignee = task.assignedTo || task.assignee;

    // Progress calculation
    let progressValue = null;
    let progressLabel = '';

    if (task.checklist && task.checklist.length > 0) {
        const checklistTotal = task.checklist.length;
        const checklistDone = task.checklist.filter(item => item.completed || item.done).length;
        progressValue = Math.round((checklistDone / checklistTotal) * 100);
        progressLabel = `${checklistDone}/${checklistTotal}`;
    } else if (task.progress !== undefined && task.progress !== null) {
        progressValue = Number(task.progress);
        progressLabel = 'Progresso';
    }

    return (
        <Box
            onClick={() => onClick(task)}
            sx={{
                background: cardBg,
                border: cardBorder,
                borderRadius: '8px',
                padding: '16px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: isDark ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.08)',
                '&:hover': {
                    borderColor: 'rgba(37, 99, 235, 0.3)',
                    transform: 'translateY(-2px)',
                    boxShadow: cardHoverShadow,
                },
            }}
        >
            {/* Header: ID + Priority */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography
                    sx={{
                        fontSize: '11px',
                        fontFamily: 'monospace',
                        color: textSecondary,
                        bgcolor: badgeBg,
                        padding: '2px 8px',
                        borderRadius: '8px',
                    }}
                >
                    TSK-{taskIndex !== undefined ? (taskIndex + 1).toString().padStart(3, '0') : '000'}
                </Typography>
                <Box
                    sx={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '8px',
                        bgcolor: priorityStyle.bg,
                        boxShadow: priorityStyle.shadow,
                    }}
                />
            </Box>

            {/* Title */}
            <Typography
                sx={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: textPrimary,
                    mb: 1,
                    lineHeight: 1.4,
                }}
            >
                {task.title || task.name}
            </Typography>

            {/* Description */}
            {task.description && (
                <Typography
                    sx={{
                        fontSize: '13px',
                        color: textSecondary,
                        mb: 1.5,
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

            {/* Progress Bar */}
            {progressValue !== null && (
                <Box sx={{ mb: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <span className="material-icons-round" style={{ fontSize: '13px', color: textSecondary }}>
                                {(task.checklist && task.checklist.length > 0) ? 'checklist' : 'trending_up'}
                            </span>
                            <Typography sx={{ fontSize: '11px', color: textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                {progressLabel}
                            </Typography>
                        </Box>
                        <Typography sx={{ fontSize: '11px', fontWeight: 600, color: progressValue === 100 ? '#22c55e' : '#2563eb' }}>
                            {progressValue}%
                        </Typography>
                    </Box>
                    <Box
                        sx={{
                            height: '4px',
                            borderRadius: '8px',
                            bgcolor: progressBg,
                            overflow: 'hidden',
                        }}
                    >
                        <Box
                            sx={{
                                width: `${progressValue}%`,
                                height: '100%',
                                background: progressValue === 100
                                    ? 'linear-gradient(90deg, #22c55e 0%, #10b981 100%)'
                                    : 'linear-gradient(90deg, #2563eb 0%, #3b82f6 100%)',
                                transition: 'width 0.3s ease',
                            }}
                        />
                    </Box>
                </Box>
            )}

            {/* Tags */}
            {task.tags && task.tags.length > 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1.5 }}>
                    {task.tags.map((tag, idx) => {
                        const tagStyle = getTagColor(tag);
                        return (
                            <Chip
                                key={idx}
                                label={tag}
                                size="small"
                                sx={{
                                    height: '22px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    bgcolor: tagStyle.bg,
                                    color: tagStyle.color,
                                    border: 'none',
                                    '& .MuiChip-label': { px: 1.25 },
                                }}
                            />
                        );
                    })}
                </Box>
            )}

            {/* Footer: Assignee + Due Date */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    pt: 1.5,
                    borderTop: `1px solid ${borderSubtle}`,
                }}
            >
                {/* Assignee */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
                            <Typography sx={{ fontSize: '11px', fontWeight: 600, color: isDark ? '#60a5fa' : '#2563eb', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {assignee.name || assignee.email || 'Sem responsável'}
                            </Typography>
                        </Box>
                    ) : (
                        <Typography sx={{ fontSize: '12px', color: textSecondary }}>Não atribuído</Typography>
                    )}
                </Box>

                {/* Due Date or Done Status */}
                {(dueStatus || task.status === 'DONE') && (
                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        bgcolor: task.status === 'DONE' ? 'rgba(34, 197, 94, 0.15)' : 'transparent',
                        px: task.status === 'DONE' ? 1 : 0,
                        py: task.status === 'DONE' ? 0.3 : 0,
                        borderRadius: task.status === 'DONE' ? 1.5 : 0,
                    }}>
                        {task.status === 'DONE' ? (
                            <>
                                <span className="material-icons-round" style={{ fontSize: '14px', color: '#4ade80' }}>check_circle</span>
                                <Typography sx={{ fontSize: '11px', fontWeight: 600, color: '#4ade80', textTransform: 'uppercase' }}>
                                    Entregue
                                </Typography>
                            </>
                        ) : (
                            <>
                                <Event sx={{ fontSize: '14px', color: dueStatus.color }} />
                                <Typography sx={{ fontSize: '12px', color: dueStatus.color }}>
                                    {dueStatus.label}
                                </Typography>
                            </>
                        )}
                    </Box>
                )}
            </Box>
        </Box>
    );
};

export default DarkTaskCard;
