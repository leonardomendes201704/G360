import { useState, useMemo, useContext } from 'react';
import { Box, Typography, IconButton, Tooltip, Avatar, Chip } from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import { ThemeContext } from '../../contexts/ThemeContext';

// Cores por status
const STATUS_COLORS = {
    BACKLOG: { border: '#64748b', bg: 'rgba(100, 116, 139, 0.15)', label: 'Backlog' },
    TODO: { border: '#0ea5e9', bg: 'rgba(14, 165, 233, 0.15)', label: 'A Fazer' },
    IN_PROGRESS: { border: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', label: 'Em Progresso' },
    DONE: { border: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', label: 'Concluido' },
};

// Cores por prioridade
const PRIORITY_COLORS = {
    HIGH: '#ef4444',
    MEDIUM: '#f59e0b',
    LOW: '#10b981',
};

/**
 * Componente de Agenda Mensal - Visualizacao por 4 semanas (S1-S4)
 */
const TaskPlanningGrid = ({
    tasks = [],
    onTaskClick,
}) => {
    const { mode } = useContext(ThemeContext);
    const isDark = mode === 'dark';

    const containerBg = isDark ? 'rgba(22, 29, 38, 0.6)' : '#ffffff';
    const containerBorder = isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(0, 0, 0, 0.08)';
    const headerBg = isDark ? 'rgba(22, 29, 38, 0.8)' : '#f8fafc';
    const headerBorder = isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.08)';
    const textPrimary = isDark ? '#f1f5f9' : '#0f172a';
    const textSecondary = isDark ? '#94a3b8' : '#64748b';
    const textMuted = isDark ? '#64748b' : '#94a3b8';
    const columnBg = isDark ? 'rgba(255, 255, 255, 0.02)' : '#ffffff';

    const [currentDate, setCurrentDate] = useState(new Date());

    // Generate weeks structure for current month
    const weeks = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const lastDay = new Date(year, month + 1, 0).getDate();

        return [
            { id: 'S1', label: 'Semana 1', range: `01 - 07`, start: 1, end: 7 },
            { id: 'S2', label: 'Semana 2', range: `08 - 14`, start: 8, end: 14 },
            { id: 'S3', label: 'Semana 3', range: `15 - 21`, start: 15, end: 21 },
            { id: 'S4', label: 'Semana 4+', range: `22 - ${lastDay}`, start: 22, end: 31 }
        ];
    }, [currentDate]);

    // Header Month Label
    const monthLabel = useMemo(() => {
        const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        return `${months[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    }, [currentDate]);

    // Group tasks by week
    const tasksByWeek = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth(); // 0-indexed

        const groups = { S1: [], S2: [], S3: [], S4: [] };

        tasks.forEach(task => {
            if (!task.dueDate) return;
            const taskDate = new Date(task.dueDate);

            // Filter only tasks for current month view
            if (taskDate.getMonth() !== month || taskDate.getFullYear() !== year) return;

            const day = taskDate.getDate();
            if (day <= 7) groups.S1.push(task);
            else if (day <= 14) groups.S2.push(task);
            else if (day <= 21) groups.S3.push(task);
            else groups.S4.push(task);
        });

        // Sort by day within week
        Object.keys(groups).forEach(key => {
            groups[key].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
        });

        return groups;
    }, [tasks, currentDate]);

    // Total tasks in month view
    const totalMonthTasks = useMemo(() => {
        return Object.values(tasksByWeek).reduce((acc, curr) => acc + curr.length, 0);
    }, [tasksByWeek]);

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const goToPreviousMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const goToNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const goToCurrentMonth = () => {
        setCurrentDate(new Date());
    };

    return (
        <Box sx={{
            background: containerBg,
            backdropFilter: isDark ? 'blur(10px)' : 'none',
            border: containerBorder,
            borderRadius: '8px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0, // Crucial for flex nested scrolling
        }}>
            {/* Header */}
            <Box sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                p: 2,
                background: headerBg,
                borderBottom: headerBorder,
                flexShrink: 0,
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <span className="material-icons-round" style={{ fontSize: '20px', color: '#2563eb' }}>
                        calendar_view_week
                    </span>
                    <Typography sx={{ fontSize: '15px', fontWeight: 600, color: textPrimary }}>
                        Planejamento Mensal
                    </Typography>
                    <Chip
                        size="small"
                        label={`${totalMonthTasks} tarefa${totalMonthTasks !== 1 ? 's' : ''}`}
                        sx={{
                            bgcolor: 'rgba(37, 99, 235, 0.15)',
                            color: '#2563eb',
                            fontSize: '11px',
                            height: '22px'
                        }}
                    />
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Tooltip title="Mês anterior">
                        <IconButton onClick={goToPreviousMonth} size="small" sx={{ color: textMuted, '&:hover': { color: textPrimary } }}>
                            <ChevronLeft />
                        </IconButton>
                    </Tooltip>

                    <Box
                        onClick={goToCurrentMonth}
                        sx={{
                            px: 2,
                            py: 0.5,
                            borderRadius: '8px',
                            bgcolor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#f1f5f9',
                            color: textPrimary,
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            minWidth: '140px',
                            textAlign: 'center',
                            '&:hover': { bgcolor: 'rgba(37, 99, 235, 0.15)', color: '#2563eb' },
                        }}
                    >
                        {monthLabel}
                    </Box>

                    <Tooltip title="Próximo mês">
                        <IconButton onClick={goToNextMonth} size="small" sx={{ color: textMuted, '&:hover': { color: textPrimary } }}>
                            <ChevronRight />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>

            {/* S1-S4 Grid */}
            <Box sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                flex: 1,
                overflow: 'hidden'
            }}>
                {weeks.map((week) => {
                    const weekTasks = tasksByWeek[week.id];
                    const count = weekTasks.length;

                    return (
                        <Box
                            key={week.id}
                            sx={{
                                borderRight: isDark ? '1px solid rgba(255, 255, 255, 0.03)' : '1px solid rgba(0, 0, 0, 0.06)',
                                '&:last-child': { borderRight: 'none' },
                                display: 'flex',
                                flexDirection: 'column',
                                height: '100%',
                                minWidth: 0,
                            }}
                        >
                            {/* Column Header */}
                            <Box sx={{
                                p: 1.5,
                                background: headerBg,
                                borderBottom: headerBorder,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                            }}>
                                <Box>
                                    <Typography sx={{ fontSize: '14px', fontWeight: 600, color: textPrimary }}>
                                        {week.label}
                                    </Typography>
                                    <Typography sx={{ fontSize: '11px', color: textSecondary }}>
                                        Dias {week.range}
                                    </Typography>
                                </Box>
                                <Box sx={{
                                    bgcolor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0,0,0,0.05)',
                                    borderRadius: '8px',
                                    px: 1,
                                    py: 0.5,
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    color: textSecondary
                                }}>
                                    {count}
                                </Box>
                            </Box>

                            {/* Column Body */}
                            <Box sx={{
                                flex: 1,
                                p: 1.5,
                                bgcolor: columnBg,
                                overflowY: 'auto',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 1
                            }}>
                                {weekTasks.length === 0 ? (
                                    <Box sx={{
                                        height: '100px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        opacity: 0.4
                                    }}>
                                        <Typography sx={{ fontSize: '11px', color: textMuted }}>Sem tarefas</Typography>
                                    </Box>
                                ) : (
                                    weekTasks.map(task => {
                                        const statusColor = STATUS_COLORS[task.status] || STATUS_COLORS.TODO;
                                        const assignee = task.assignee || task.assignedTo;
                                        const date = new Date(task.dueDate);
                                        const dayStr = date.getDate().toString().padStart(2, '0');
                                        const monthStr = (date.getMonth() + 1).toString().padStart(2, '0');

                                        return (
                                            <Box
                                                key={task.id}
                                                onClick={() => onTaskClick && onTaskClick(task)}
                                                sx={{
                                                    p: 1.5,
                                                    bgcolor: statusColor.bg,
                                                    borderLeft: `3px solid ${statusColor.border}`,
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                    '&:hover': {
                                                        transform: 'translateY(-2px)',
                                                        boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.4)' : '0 4px 12px rgba(0,0,0,0.1)',
                                                    }
                                                }}
                                            >
                                                <Typography sx={{
                                                    fontSize: '12px',
                                                    fontWeight: 600,
                                                    color: textPrimary,
                                                    mb: 1,
                                                    lineHeight: 1.4
                                                }}>
                                                    {task.title}
                                                </Typography>

                                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        {assignee && (
                                                            <Tooltip title={assignee.name || ''}>
                                                                <Avatar sx={{ width: 20, height: 20, fontSize: '9px', bgcolor: statusColor.border }}>
                                                                    {getInitials(assignee.name)}
                                                                </Avatar>
                                                            </Tooltip>
                                                        )}
                                                        <Typography sx={{ fontSize: '10px', color: textSecondary, fontWeight: 500 }}>
                                                            {dayStr}/{monthStr}
                                                        </Typography>
                                                    </Box>

                                                    <Typography sx={{
                                                        fontSize: '9px',
                                                        color: statusColor.border,
                                                        fontWeight: 700,
                                                        textTransform: 'uppercase',
                                                        letterSpacing: '0.5px'
                                                    }}>
                                                        {statusColor.label}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        );
                                    })
                                )}
                            </Box>
                        </Box>
                    );
                })}
            </Box>
        </Box>
    );
};

export default TaskPlanningGrid;
