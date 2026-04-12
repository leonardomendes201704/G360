import { useState } from 'react';
import { Box, Typography, TextField, Button } from '@mui/material';
import { format, addDays, subDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const TasksRightPanel = ({
    tasks = [],
    users = [],
    currentUser,
    onQuickCreate,
    onRefresh
}) => {
    const [quickTaskTitle, setQuickTaskTitle] = useState('');
    const [currentMonth, setCurrentMonth] = useState(new Date());

    // --- "Meu Dia" - Tarefas do usuário para hoje ---
    const myDayTasks = tasks
        .filter(t => {
            const deadline = t.dueDate || t.endDate;
            if (!deadline) return false;
            return isToday(new Date(deadline)) && t.status !== 'DONE';
        })
        .slice(0, 4);

    // --- Equipe com progresso (apenas pessoas com tarefas alocadas) ---
    const teamProgress = (() => {
        // Obter IDs únicos de assignees das tarefas
        const assigneeIds = [...new Set(tasks.filter(t => t.assigneeId).map(t => t.assigneeId))];

        // Para cada assignee, calcular tarefas e progresso
        const teamData = assigneeIds.map(assigneeId => {
            const userTasks = tasks.filter(t => t.assigneeId === assigneeId);
            const completed = userTasks.filter(t => t.status === 'DONE').length;
            const total = userTasks.length;
            const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

            // Buscar info do usuário (pode estar no assignee da tarefa ou na lista de users)
            const taskWithAssignee = userTasks.find(t => t.assignee);
            const userFromList = users.find(u => u.id === assigneeId);
            const userName = taskWithAssignee?.assignee?.name || userFromList?.name || 'Usuário';

            return {
                id: assigneeId,
                name: userName,
                activeTasks: userTasks.filter(t => t.status !== 'DONE').length,
                totalTasks: total,
                progress: percent
            };
        });

        // Ordenar por mais tarefas ativas e pegar os 6 primeiros
        return teamData
            .filter(m => m.totalTasks > 0)
            .sort((a, b) => b.activeTasks - a.activeTasks)
            .slice(0, 6);
    })();

    // --- Mini Calendário ---
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Preencher dias anteriores para começar no domingo
    const startDay = getDay(monthStart);
    const previousDays = [];
    for (let i = startDay - 1; i >= 0; i--) {
        previousDays.push(subDays(monthStart, i + 1));
    }

    // Dias com tarefas
    const daysWithTasks = new Set(
        tasks
            .filter(t => t.dueDate || t.endDate)
            .map(t => format(new Date(t.dueDate || t.endDate), 'yyyy-MM-dd'))
    );

    const handleQuickCreate = () => {
        if (!quickTaskTitle.trim()) return;
        onQuickCreate && onQuickCreate({ title: quickTaskTitle });
        setQuickTaskTitle('');
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
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* My Day */}
            <Box sx={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(6, 182, 212, 0.05) 100%)',
                border: '1px solid rgba(16, 185, 129, 0.15)',
                borderRadius: '16px',
                padding: '24px',
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '16px', fontWeight: 600, color: '#f1f5f9' }}>
                        <span className="material-icons-round" style={{ color: '#10b981' }}>wb_sunny</span>
                        Meu Dia
                    </Box>
                    <Typography sx={{ fontSize: '12px', color: '#64748b' }}>
                        {format(new Date(), "EEEE, dd MMM", { locale: ptBR })}
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {myDayTasks.length > 0 ? myDayTasks.map((task, idx) => (
                        <Box key={task.id} sx={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 1.5,
                            padding: '12px',
                            background: '#161d26',
                            border: '1px solid rgba(255, 255, 255, 0.06)',
                            borderRadius: '12px',
                            transition: 'all 0.2s',
                            cursor: 'pointer',
                            '&:hover': { borderColor: 'rgba(37, 99, 235, 0.3)' },
                        }}>
                            <Typography sx={{ fontSize: '12px', color: '#10b981', fontWeight: 600, minWidth: '50px' }}>
                                {format(new Date(task.dueDate || task.endDate), 'HH:mm')}
                            </Typography>
                            <Box>
                                <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#f1f5f9', mb: 0.5 }}>
                                    {task.title}
                                </Typography>
                                <Typography sx={{ fontSize: '11px', color: '#64748b' }}>
                                    {task.description?.substring(0, 30) || 'Sem descrição'}
                                </Typography>
                            </Box>
                        </Box>
                    )) : (
                        <Typography sx={{ fontSize: '13px', color: '#64748b', textAlign: 'center', py: 2 }}>
                            Nenhuma tarefa para hoje 🎉
                        </Typography>
                    )}
                </Box>
            </Box>

            {/* Team Activity */}
            <Box sx={{
                background: '#161d26',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '16px',
                padding: '24px',
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '16px', fontWeight: 600, color: '#f1f5f9' }}>
                        <span className="material-icons-round" style={{ color: '#3b82f6' }}>groups</span>
                        Equipe
                    </Box>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {teamProgress.length > 0 ? teamProgress.map((member) => (
                        <Box key={member.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box sx={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '14px',
                                fontWeight: 600,
                                background: getAvatarGradient(member.name),
                                color: '#f1f5f9',
                            }}>
                                {getInitials(member.name)}
                            </Box>
                            <Box sx={{ flex: 1 }}>
                                <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#f1f5f9', mb: 0.25 }}>
                                    {member.name?.split(' ')[0]}
                                </Typography>
                                <Typography sx={{ fontSize: '12px', color: '#64748b' }}>
                                    {member.activeTasks} tarefas ativas
                                </Typography>
                            </Box>
                            <Box sx={{ width: '60px', textAlign: 'right' }}>
                                <Box sx={{
                                    height: '4px',
                                    background: '#1c2632',
                                    borderRadius: '2px',
                                    overflow: 'hidden',
                                    mb: 0.5,
                                }}>
                                    <Box sx={{
                                        height: '100%',
                                        width: `${member.progress}%`,
                                        background: '#10b981',
                                        borderRadius: '2px',
                                    }} />
                                </Box>
                                <Typography sx={{ fontSize: '11px', color: '#64748b' }}>
                                    {member.progress}%
                                </Typography>
                            </Box>
                        </Box>
                    )) : (
                        <Typography sx={{ fontSize: '13px', color: '#64748b', textAlign: 'center', py: 2 }}>
                            Nenhuma tarefa atribuída
                        </Typography>
                    )}
                </Box>
            </Box>

            {/* Mini Calendar */}
            <Box sx={{
                background: '#161d26',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '16px',
                padding: '24px',
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '16px', fontWeight: 600, color: '#f1f5f9' }}>
                        <span className="material-icons-round" style={{ color: '#06b6d4' }}>calendar_today</span>
                        {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Box
                            component="button"
                            onClick={() => setCurrentMonth(subDays(currentMonth, 30))}
                            sx={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '8px',
                                background: '#1c2632',
                                border: 'none',
                                color: '#94a3b8',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                '&:hover': { color: '#f1f5f9' },
                            }}
                        >
                            <span className="material-icons-round" style={{ fontSize: '18px' }}>chevron_left</span>
                        </Box>
                        <Box
                            component="button"
                            onClick={() => setCurrentMonth(addDays(currentMonth, 30))}
                            sx={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '8px',
                                background: '#1c2632',
                                border: 'none',
                                color: '#94a3b8',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                '&:hover': { color: '#f1f5f9' },
                            }}
                        >
                            <span className="material-icons-round" style={{ fontSize: '18px' }}>chevron_right</span>
                        </Box>
                    </Box>
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5 }}>
                    {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, i) => (
                        <Box key={i} sx={{
                            textAlign: 'center',
                            fontSize: '11px',
                            color: '#64748b',
                            padding: '8px 0',
                            fontWeight: 600,
                        }}>
                            {day}
                        </Box>
                    ))}

                    {/* Previous month days */}
                    {previousDays.map((day, i) => (
                        <Box key={`prev-${i}`} sx={{
                            aspectRatio: '1',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '13px',
                            borderRadius: '8px',
                            color: '#64748b',
                            opacity: 0.5,
                        }}>
                            {format(day, 'd')}
                        </Box>
                    ))}

                    {/* Current month days */}
                    {daysInMonth.map((day) => {
                        const dateStr = format(day, 'yyyy-MM-dd');
                        const hasTasks = daysWithTasks.has(dateStr);
                        const today = isToday(day);

                        return (
                            <Box key={dateStr} sx={{
                                aspectRatio: '1',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '13px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                position: 'relative',
                                color: today ? 'white' : '#f1f5f9',
                                background: today ? '#2563eb' : 'transparent',
                                fontWeight: today ? 600 : 400,
                                '&:hover': {
                                    background: today ? '#2563eb' : '#1c2632',
                                },
                                '&::after': hasTasks ? {
                                    content: '""',
                                    position: 'absolute',
                                    bottom: '4px',
                                    width: '4px',
                                    height: '4px',
                                    background: today ? 'white' : '#f59e0b',
                                    borderRadius: '50%',
                                } : {},
                            }}>
                                {format(day, 'd')}
                            </Box>
                        );
                    })}
                </Box>
            </Box>
        </Box>
    );
};

export default TasksRightPanel;
