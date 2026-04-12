import { useState, useContext } from 'react';
import { Box, Typography, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import { format, startOfDay, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ThemeContext } from '../../contexts/ThemeContext';

const DarkTaskList = ({ tasks = [], onTaskClick, onTaskDelete, onTaskToggle }) => {
    const { mode } = useContext(ThemeContext);
    const isDark = mode === 'dark';

    // Theme-aware color variables
    const containerBg = isDark ? 'rgba(22, 29, 38, 0.5)' : '#FFFFFF';
    const containerBorder = isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(0, 0, 0, 0.08)';
    const headerBg = isDark ? 'rgba(28, 38, 50, 0.6)' : '#f8fafc';
    const headerBorder = isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(0, 0, 0, 0.06)';
    const rowBorder = isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(0, 0, 0, 0.06)';
    const rowHover = isDark ? 'rgba(37, 99, 235, 0.03)' : 'rgba(37, 99, 235, 0.05)';
    const textPrimary = isDark ? '#f1f5f9' : '#0f172a';
    const textSecondary = isDark ? '#94a3b8' : '#64748b';
    const textMuted = isDark ? '#64748b' : '#94a3b8';
    const surfaceBg = isDark ? '#1c2632' : '#f1f5f9';
    const checkboxBorder = isDark ? '2px solid rgba(255, 255, 255, 0.06)' : '2px solid rgba(0, 0, 0, 0.12)';
    const menuBg = isDark ? '#1c2632' : '#ffffff';
    const menuBorder = isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(0, 0, 0, 0.08)';
    const menuText = isDark ? '#f1f5f9' : '#0f172a';

    const [anchorEl, setAnchorEl] = useState(null);
    const [menuTask, setMenuTask] = useState(null);

    const handleMenuOpen = (event, task) => {
        event.stopPropagation();
        setAnchorEl(event.currentTarget);
        setMenuTask(task);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
        setMenuTask(null);
    };

    // --- Helpers ---
    const getTaskDeadline = (task) => task.dueDate || task.endDate;

    const isOverdue = (task) => {
        const deadline = getTaskDeadline(task);
        if (!deadline) return false;
        if (task.status === 'DONE' || task.status === 'COMPLETED' || task.status === 'CANCELLED') return false;
        // Compara apenas as datas (início do dia) para evitar que tarefas com vencimento hoje sejam marcadas como atrasadas
        const deadlineDate = startOfDay(new Date(deadline));
        const todayDate = startOfDay(new Date());
        return deadlineDate < todayDate;
    };

    const getPriorityLabel = (p) => {
        const map = { HIGH: 'Alta', MEDIUM: 'Média', LOW: 'Baixa', CRITICAL: 'Crítica' };
        return map[p] || p;
    };

    const getStatusConfig = (status) => {
        const configs = {
            TODO: { label: 'Pendente', bg: 'rgba(14, 165, 233, 0.15)', color: '#0ea5e9' },
            BACKLOG: { label: 'Backlog', bg: 'rgba(100, 116, 139, 0.15)', color: '#64748b' },
            ON_HOLD: { label: 'Em Pausa', bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' },
            IN_PROGRESS: { label: 'Em Progresso', bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' },
            DONE: { label: 'Concluído', bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981' },
            BLOCKED: { label: 'Bloqueado', bg: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e' },
            CANCELLED: { label: 'Cancelada', bg: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8' },
        };
        return configs[status] || { label: status, bg: 'rgba(100, 116, 139, 0.15)', color: '#64748b' };
    };

    const getCategoryConfig = (task) => {
        // Se tiver categoria explícita, usar; senão inferir pelo título ou tipo
        const category = task.category || (task.title?.toLowerCase().includes('reunião') || task.title?.toLowerCase().includes('meeting') ? 'meeting' :
            task.title?.toLowerCase().includes('review') ? 'review' :
                task.title?.toLowerCase().includes('suporte') ? 'support' :
                    task.title?.toLowerCase().includes('planning') ? 'planning' : 'admin');

        const configs = {
            meeting: { label: 'Reunião', bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' },
            admin: { label: 'Admin', bg: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4' },
            dev: { label: 'Dev', bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981' },
            review: { label: 'Revisão', bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' },
            support: { label: 'Suporte', bg: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e' },
            planning: { label: 'Planning', bg: 'rgba(37, 99, 235, 0.15)', color: '#2563eb' },
        };
        return configs[category] || configs.admin;
    };

    const formatDeadline = (task) => {
        const deadline = getTaskDeadline(task);
        if (!deadline) return '-';

        const date = new Date(deadline);
        if (task.status === 'DONE') {
            return format(date, 'dd MMM', { locale: ptBR });
        }
        if (isToday(date)) return 'Hoje';
        return format(date, 'dd MMM', { locale: ptBR });
    };

    const getDeadlineClass = (task) => {
        if (task.status === 'DONE') return 'completed';
        if (isOverdue(task)) return 'overdue';
        const deadline = getTaskDeadline(task);
        if (deadline && isToday(new Date(deadline))) return 'today';
        return '';
    };

    const getAvatarGradient = (name) => {
        const gradients = [
            'linear-gradient(135deg, #2563eb, #3b82f6)',
            'linear-gradient(135deg, #10b981, #06b6d4)',
            'linear-gradient(135deg, #f59e0b, #f97316)',
            'linear-gradient(135deg, #f43f5e, #3b82f6)',
        ];
        const index = name ? name.charCodeAt(0) % gradients.length : 0;
        return gradients[index];
    };

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    };

    return (
        <Box sx={{
            background: containerBg,
            backdropFilter: isDark ? 'blur(10px)' : 'none',
            border: containerBorder,
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: isDark ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.08)',
        }}>
            {/* Header */}
            <Box sx={{
                display: 'grid',
                gridTemplateColumns: '40px 1fr 140px 140px 120px 100px 50px',
                gap: '16px',
                padding: '16px 20px',
                background: headerBg,
                borderBottom: headerBorder,
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                color: textMuted,
                fontWeight: 600,
            }}>
                <span></span>
                <span>Tarefa</span>
                <span>Responsável</span>
                <span>Prazo</span>
                <span>Prioridade</span>
                <span>Status</span>
                <span></span>
            </Box>

            {/* Body */}
            <Box sx={{ maxHeight: '600px', overflowY: 'auto' }}>
                {tasks.map((task) => {
                    const statusConfig = getStatusConfig(task.status);
                    const categoryConfig = getCategoryConfig(task);
                    const deadlineClass = getDeadlineClass(task);
                    const isCompleted = task.status === 'DONE';
                    const overdue = isOverdue(task);

                    return (
                        <Box
                            key={task.id}
                            onClick={() => onTaskClick(task)}
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: '40px 1fr 140px 140px 120px 100px 50px',
                                gap: '16px',
                                padding: '16px 20px',
                                borderBottom: rowBorder,
                                borderLeft: overdue ? '3px solid #ef4444' : '3px solid transparent',
                                alignItems: 'center',
                                transition: 'all 0.2s',
                                cursor: 'pointer',
                                opacity: isCompleted ? 0.6 : 1,
                                background: overdue ? 'rgba(239, 68, 68, 0.05)' : 'transparent',
                                '&:hover': {
                                    background: overdue ? 'rgba(239, 68, 68, 0.1)' : rowHover,
                                },
                                '&:last-child': {
                                    borderBottom: 'none',
                                },
                            }}
                        >
                            {/* Checkbox */}
                            <Box
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onTaskToggle && onTaskToggle(task.id, task.status);
                                }}
                                sx={{
                                    width: '20px',
                                    height: '20px',
                                    border: isCompleted ? 'none' : checkboxBorder,
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s',
                                    background: isCompleted ? '#10b981' : 'transparent',
                                    '&:hover': {
                                        borderColor: '#2563eb',
                                    },
                                }}
                            >
                                {isCompleted && (
                                    <span className="material-icons-round" style={{ fontSize: '14px', color: 'white' }}>check</span>
                                )}
                            </Box>

                            {/* Task Main */}
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Typography sx={{
                                        fontSize: '14px',
                                        fontWeight: 600,
                                        color: isCompleted ? textMuted : textPrimary,
                                        textDecoration: isCompleted ? 'line-through' : 'none',
                                    }}>
                                        {task.title}
                                    </Typography>
                                    <Box sx={{
                                        fontSize: '10px',
                                        padding: '3px 8px',
                                        borderRadius: '4px',
                                        fontWeight: 600,
                                        textTransform: 'uppercase',
                                        background: categoryConfig.bg,
                                        color: categoryConfig.color,
                                    }}>
                                        {categoryConfig.label}
                                    </Box>
                                </Box>
                                {task.description && (
                                    <Typography sx={{
                                        fontSize: '12px',
                                        color: textMuted,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        maxWidth: '400px',
                                    }}>
                                        {task.description}
                                    </Typography>
                                )}
                            </Box>

                            {/* Assignee */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Box sx={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    background: task.assignee ? getAvatarGradient(task.assignee.name) : surfaceBg,
                                    color: task.assignee ? '#f1f5f9' : textMuted,
                                }}>
                                    {getInitials(task.assignee?.name)}
                                </Box>
                                <Typography sx={{ fontSize: '13px', color: textSecondary }}>
                                    {task.assignee?.name?.split(' ')[0] || 'N/A'}
                                </Typography>
                            </Box>

                            {/* Deadline */}
                            <Box sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '13px',
                                color: deadlineClass === 'overdue' ? '#f43f5e' :
                                    deadlineClass === 'today' ? '#f59e0b' :
                                        deadlineClass === 'completed' ? '#10b981' : '#94a3b8',
                            }}>
                                <span className="material-icons-round" style={{ fontSize: '16px' }}>
                                    {deadlineClass === 'completed' ? 'check_circle' : 'event'}
                                </span>
                                {formatDeadline(task)}
                            </Box>

                            {/* Priority */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600 }}>
                                <Box sx={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    background: task.priority === 'HIGH' || task.priority === 'CRITICAL' ? '#f43f5e' :
                                        task.priority === 'MEDIUM' ? '#f59e0b' : '#10b981',
                                    boxShadow: `0 0 8px ${task.priority === 'HIGH' || task.priority === 'CRITICAL' ? '#f43f5e' :
                                        task.priority === 'MEDIUM' ? '#f59e0b' : '#10b981'}`,
                                }} />
                                <Typography sx={{ color: textSecondary, fontSize: '12px' }}>
                                    {getPriorityLabel(task.priority)}
                                </Typography>
                            </Box>

                            {/* Status */}
                            <Box sx={{
                                padding: '5px 12px',
                                borderRadius: '20px',
                                fontSize: '11px',
                                fontWeight: 600,
                                textAlign: 'center',
                                background: statusConfig.bg,
                                color: statusConfig.color,
                            }}>
                                {statusConfig.label}
                            </Box>

                            {/* Actions */}
                            <Box sx={{ display: 'flex', gap: '4px' }}>
                                <Box
                                    component="button"
                                    onClick={(e) => handleMenuOpen(e, task)}
                                    sx={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '8px',
                                        background: 'transparent',
                                        border: 'none',
                                        color: textMuted,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'all 0.2s',
                                        '&:hover': {
                                            background: surfaceBg,
                                            color: textPrimary,
                                        },
                                    }}
                                >
                                    <span className="material-icons-round" style={{ fontSize: '18px' }}>more_vert</span>
                                </Box>
                            </Box>
                        </Box>
                    );
                })}

                {tasks.length === 0 && (
                    <Box sx={{ p: 4, textAlign: 'center', color: textMuted }}>
                        <Typography>Nenhuma tarefa encontrada</Typography>
                    </Box>
                )}
            </Box>

            {/* Context Menu */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                PaperProps={{
                    sx: {
                        bgcolor: menuBg,
                        border: menuBorder,
                        color: menuText,
                        boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.4)' : '0 8px 24px rgba(0,0,0,0.15)',
                    }
                }}
            >
                <MenuItem onClick={() => { onTaskClick(menuTask); handleMenuClose(); }}>
                    <ListItemIcon><span className="material-icons-round" style={{ color: textSecondary, fontSize: '18px' }}>edit</span></ListItemIcon>
                    <ListItemText>Editar</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => { onTaskDelete(menuTask.id); handleMenuClose(); }}>
                    <ListItemIcon><span className="material-icons-round" style={{ color: '#f43f5e', fontSize: '18px' }}>delete</span></ListItemIcon>
                    <ListItemText sx={{ color: '#f43f5e' }}>Excluir</ListItemText>
                </MenuItem>
            </Menu>
        </Box>
    );
};

export default DarkTaskList;
