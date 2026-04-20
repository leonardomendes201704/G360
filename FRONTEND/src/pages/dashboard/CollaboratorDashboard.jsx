import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, CircularProgress, Paper, useTheme } from '@mui/material';
import api from '../../services/api';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useSnackbar } from 'notistack';
import { ThemeContext } from '../../contexts/ThemeContext';

// Modals
import TaskModal from '../../components/modals/TaskModal';
import ChangeModal from '../../components/modals/ChangeModal';

// Services
import projectService from '../../services/project.service';
import { createGeneralTask, updateGeneralTask } from '../../services/task.service';
import { getReferenceUsers } from '../../services/reference.service';
import { createChange } from '../../services/change-request.service';
import RecentActivities from '../../components/projects/RecentActivities';

const commonPaperStyle = {
    borderRadius: '8px',
    overflow: 'hidden',
    transition: 'all 0.3s',
};

const CollaboratorDashboard = ({ user }) => {
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();
    const theme = useTheme();
    const { mode } = useContext(ThemeContext);
    const [stats, setStats] = useState(null);
    const recentActivity = stats?.activities || stats?.recentActivity || [];
    const [loading, setLoading] = useState(true);

    // Modal States
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [isGmudModalOpen, setIsGmudModalOpen] = useState(false);
    const [taskAssignees, setTaskAssignees] = useState([]);

    useEffect(() => {
        getReferenceUsers().then(setTaskAssignees).catch(() => setTaskAssignees([]));
    }, []);

    const fetchStats = async () => {
        try {
            const response = await api.get('/dashboard/collaborator');
            setStats(response.data);
        } catch (error) {
            console.error("Error loading collaborator stats:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchStats(); }, []);

    const handleCreateTask = async (data) => { try { await createGeneralTask(data); enqueueSnackbar('Tarefa criada!', { variant: 'success' }); setIsTaskModalOpen(false); fetchStats(); } catch { enqueueSnackbar('Erro.', { variant: 'error' }); } };
    const handleCreateGmud = async (data) => { try { await createChange(data); enqueueSnackbar('GMUD criada!', { variant: 'success' }); setIsGmudModalOpen(false); fetchStats(); } catch { enqueueSnackbar('Erro.', { variant: 'error' }); } };

    const handleCompleteTask = async (taskId, e) => {
        e.stopPropagation(); // Evita navegação ao clicar no checkbox
        try {
            await updateGeneralTask(taskId, { status: 'DONE' });
            enqueueSnackbar('Tarefa concluída! ✨', { variant: 'success' });
            fetchStats(); // Recarrega os dados
        } catch (error) {
            console.error('Erro ao concluir tarefa:', error);
            enqueueSnackbar('Erro ao concluir tarefa.', { variant: 'error' });
        }
    };

    if (loading) return (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', flexDirection: 'column', gap: 2 }}>
            <CircularProgress sx={{ color: '#2563eb' }} />
            <Typography sx={{ color: '#64748b' }}>Carregando...</Typography>
        </Box>
    );

    if (!stats) return null;

    // KPI Config for Collaborator (3 cards)
    const kpis = [
        { key: 'projects', value: stats.kpis.projects, label: 'Meus Projetos', icon: 'rocket_launch', badgeLabel: 'Ativos', color: '#0ea5e9', footer: 'Como membro ou responsável', gradient: 'linear-gradient(90deg, #0ea5e9, #2563eb)' },
        { key: 'tasks', value: stats.kpis.tasks, label: 'Minhas Tarefas', icon: 'check_circle', badgeLabel: 'Abertas', color: '#10b981', footer: `${stats.myTasks?.filter(t => t.dueDate && differenceInDays(new Date(t.dueDate), new Date()) <= 7).length || 0} para entregar esta semana`, gradient: 'linear-gradient(90deg, #10b981, #06b6d4)' },
        { key: 'gmuds', value: stats.kpis.gmuds, label: 'Minhas GMUDs', icon: 'sync_alt', badgeLabel: 'Enviadas', color: '#f59e0b', footer: `${stats.upcomingGmuds?.length || 0} aguardando aprovação`, gradient: 'linear-gradient(90deg, #f59e0b, #f97316)' }
    ];

    const quickActions = [
        { key: 'project', icon: 'rocket_launch', label: 'Novo Projeto', color: '#f43f5e' },
        { key: 'task', icon: 'add_task', label: 'Nova Tarefa', color: '#10b981' },
        { key: 'gmud', icon: 'sync_alt', label: 'Nova GMUD', color: '#f59e0b' }
    ];

    const getPriorityColor = (p) => p === 'HIGH' ? '#f43f5e' : p === 'MEDIUM' ? '#f59e0b' : '#10b981';
    const getPriorityLabel = (p) => p === 'HIGH' ? 'Alta' : p === 'MEDIUM' ? 'Média' : 'Baixa';

    const getDueStatus = (date) => {
        if (!date) return null;
        const diff = differenceInDays(new Date(date), new Date());
        if (diff < 0) return { label: 'Atrasada', bg: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e' };
        if (diff === 0) return { label: 'Hoje', bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' };
        return { label: format(new Date(date), 'dd/MM'), bg: 'rgba(14, 165, 233, 0.15)', color: '#0ea5e9' };
    };

    return (
        <Box sx={{ width: '100%', maxWidth: '100%' }}>
            {/* Page Header */}
            <Box sx={{
                mb: 4,
                p: 3,
                borderRadius: '8px',
                background: mode === 'dark' ? 'rgba(22, 29, 38, 0.5)' : 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(10px)',
                border: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <span className="material-icons-round" style={{ fontSize: '36px', color: '#2563eb' }}>dashboard</span>
                    <Box>
                        <Typography sx={{ fontSize: '20px', fontWeight: 600, color: 'text.primary' }}>
                            Bem-vindo, {user.name.split(' ')[0]}
                        </Typography>
                        <Typography sx={{ color: 'text.secondary', fontSize: '15px' }}>
                            Aqui está o resumo das suas atividades
                        </Typography>
                    </Box>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                    <Typography sx={{ fontSize: '14px', color: 'text.secondary', textTransform: 'lowercase' }}>{format(new Date(), 'EEEE', { locale: ptBR })}</Typography>
                    <Typography sx={{ fontSize: '18px', fontWeight: 600, color: 'text.primary' }}>{format(new Date(), "d 'de' MMMM", { locale: ptBR })}</Typography>
                </Box>
            </Box>

            {/* Quick Actions Strip */}
            <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
                {quickActions.map(action => (
                    <Paper key={action.key} onClick={() => action.key === 'project' ? navigate('/projects/new') : action.key === 'task' ? setIsTaskModalOpen(true) : setIsGmudModalOpen(true)} sx={{
                        ...commonPaperStyle, p: 2, display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer',
                        transition: 'all 0.2s', '&:hover': { transform: 'translateY(-2px)', borderColor: 'primary.main' }
                    }}>
                        <span className="material-icons-round" style={{ fontSize: '20px', color: action.color }}>{action.icon}</span>
                        <Typography sx={{ fontSize: '14px', fontWeight: 600, color: 'text.primary' }}>{action.label}</Typography>
                    </Paper>
                ))}
            </Box>

            {/* KPI Grid - 3 cards */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2.5, mb: 4 }}>
                {kpis.map(kpi => (
                    <Paper key={kpi.key} onClick={() => navigate(kpi.key === 'projects' ? '/projects' : kpi.key === 'tasks' ? '/tasks' : '/changes')} sx={{
                        ...commonPaperStyle, p: 3, cursor: 'pointer', transition: 'all 0.3s',
                        '&:hover': { transform: 'translateY(-2px)', borderColor: 'primary.main' },
                        '&::before': { content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: kpi.gradient, borderRadius: '8px' }
                    }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                            <Box sx={{ width: 48, height: 48, borderRadius: '8px', background: `${kpi.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span className="material-icons-round" style={{ fontSize: '24px', color: kpi.color }}>{kpi.icon}</span>
                            </Box>
                            <span style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', background: `${kpi.color}22`, color: kpi.color }}>
                                {kpi.badgeLabel}
                            </span>
                        </Box>
                        <Typography sx={{ fontSize: '36px', fontWeight: 700, color: 'text.primary', mb: 0.5, textAlign: 'center' }}>{kpi.value}</Typography>
                        <Typography sx={{ fontSize: '14px', color: 'text.secondary', fontWeight: 500, textAlign: 'center' }}>{kpi.label}</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mt: 2, pt: 1.5, borderTop: '1px solid', borderColor: 'divider', fontSize: '12px', color: 'text.secondary' }}>
                            <span className="material-icons-round" style={{ fontSize: '14px' }}>person</span>
                            {kpi.footer}
                        </Box>
                    </Paper>
                ))}
            </Box>

            {/* Main Grid Layout */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 380px' }, gap: 4 }}>
                {/* Left Column */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {/* Minhas Tarefas */}
                    <Box sx={{ ...commonPaperStyle, background: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}` }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <span className="material-icons-round" style={{ fontSize: '22px', color: '#10b981' }}>task_alt</span>
                                <Typography sx={{ fontSize: '16px', fontWeight: 600, color: 'text.primary' }}>Minhas Tarefas</Typography>
                            </Box>
                            <span onClick={() => navigate('/tasks')} style={{ fontSize: '13px', color: '#2563eb', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                Ver todas <span className="material-icons-round" style={{ fontSize: '16px' }}>arrow_forward</span>
                            </span>
                        </Box>
                        <Box sx={{ p: 2 }}>
                            {stats.myTasks?.length > 0 ? (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    {stats.myTasks.slice(0, 5).map(task => {
                                        const dueStatus = getDueStatus(task.dueDate);
                                        return (
                                            <Box key={task.id} onClick={() => navigate('/tasks')} sx={{
                                                display: 'flex', alignItems: 'center', gap: 2, p: 2,
                                                background: theme.palette.background.default,
                                                border: '1px solid', borderColor: 'divider', borderRadius: '8px', cursor: 'pointer',
                                                transition: 'all 0.2s', '&:hover': { transform: 'translateX(4px)', borderColor: 'primary.main' }
                                            }}>
                                                <Box
                                                    onClick={(e) => handleCompleteTask(task.id, e)}
                                                    sx={{
                                                        width: 22, height: 22, borderRadius: '8px',
                                                        border: '2px solid', borderColor: 'divider',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0,
                                                        '& .check-icon': { opacity: 0, transition: 'all 0.2s' },
                                                        '&:hover': {
                                                            background: 'rgba(16, 185, 129, 0.2)',
                                                            borderColor: '#10b981',
                                                            transform: 'scale(1.1)',
                                                            '& .check-icon': { opacity: 1 }
                                                        }
                                                    }}
                                                >
                                                    <span className="material-icons-round check-icon" style={{ fontSize: '14px', color: '#10b981' }}>check</span>
                                                </Box>
                                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                                    <Typography sx={{ fontSize: '14px', fontWeight: 600, color: 'text.primary', mb: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</Typography>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: '12px', color: 'text.secondary' }}>
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <span className="material-icons-round" style={{ fontSize: '14px', color: '#0ea5e9' }}>folder</span>
                                                            {task.projectId ? 'Projeto' : 'Geral'}
                                                        </span>
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <span style={{ width: 8, height: 8, borderRadius: '8px', background: getPriorityColor(task.priority), boxShadow: `0 0 8px ${getPriorityColor(task.priority)}` }} />
                                                            {getPriorityLabel(task.priority)}
                                                        </span>
                                                    </Box>
                                                </Box>
                                                {dueStatus && (
                                                    <span style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 500, background: dueStatus.bg, color: dueStatus.color, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <span className="material-icons-round" style={{ fontSize: '14px' }}>event</span>
                                                        {dueStatus.label}
                                                    </span>
                                                )}
                                            </Box>
                                        );
                                    })}
                                </Box>
                            ) : (
                                <Box sx={{ textAlign: 'center', py: 4 }}>
                                    <span className="material-icons-round" style={{ fontSize: '40px', color: 'text.secondary', opacity: 0.5, display: 'block', marginBottom: '12px' }}>task_alt</span>
                                    <Typography sx={{ fontSize: '14px', fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>Nenhuma tarefa pendente!</Typography>
                                    <Typography sx={{ fontSize: '13px', color: 'text.secondary' }}>🎉 Parabéns!</Typography>
                                </Box>
                            )}
                        </Box>
                    </Box>

                    {/* Meus Projetos */}
                    <Box sx={{ ...commonPaperStyle, background: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}` }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <span className="material-icons-round" style={{ fontSize: '22px', color: '#0ea5e9' }}>rocket_launch</span>
                                <Typography sx={{ fontSize: '16px', fontWeight: 600, color: 'text.primary' }}>Meus Projetos</Typography>
                            </Box>
                            <span onClick={() => navigate('/projects')} style={{ fontSize: '13px', color: '#2563eb', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                Ver todos <span className="material-icons-round" style={{ fontSize: '16px' }}>arrow_forward</span>
                            </span>
                        </Box>
                        <Box sx={{ p: 2, display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
                            {stats.myProjects?.length > 0 ? stats.myProjects.slice(0, 4).map(proj => (
                                <Box key={proj.id} onClick={() => navigate(`/projects/${proj.id}`)} sx={{
                                    p: 2.5,
                                    background: theme.palette.background.default,
                                    border: '1px solid', borderColor: 'divider', borderRadius: '8px',
                                    cursor: 'pointer', transition: 'all 0.2s', '&:hover': { transform: 'translateY(-2px)', borderColor: 'primary.main' }
                                }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                        <Box sx={{ width: 40, height: 40, borderRadius: '8px', background: 'rgba(14, 165, 233, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <span className="material-icons-round" style={{ fontSize: '20px', color: '#0ea5e9' }}>folder</span>
                                        </Box>
                                        <span style={{ padding: '4px 8px', borderRadius: '8px', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                                            {proj.status}
                                        </span>
                                    </Box>
                                    <Typography sx={{ fontSize: '15px', fontWeight: 600, color: 'text.primary', mb: 1.5 }}>{proj.name}</Typography>
                                    <Box sx={{ mb: 1.5 }}>
                                        <Box sx={{ height: 6, background: theme.palette.action.selected, borderRadius: '8px', overflow: 'hidden', mb: 0.5 }}>
                                            <Box sx={{ height: '100%', width: `${proj.progress}%`, background: 'linear-gradient(90deg, #0ea5e9, #2563eb)', borderRadius: '8px' }} />
                                        </Box>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'text.secondary' }}>
                                            <span>Progresso</span>
                                            <span style={{ fontWeight: 600 }}>{proj.progress}%</span>
                                        </Box>
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'text.secondary' }}>
                                        <span>📅 {format(new Date(proj.endDate), 'dd/MM/yyyy')}</span>
                                        <span>📋 {proj.completedTasks}/{proj.totalTasks}</span>
                                    </Box>
                                </Box>
                            )) : (
                                <Box sx={{ gridColumn: 'span 2', textAlign: 'center', py: 4 }}>
                                    <span className="material-icons-round" style={{ fontSize: '40px', color: 'text.secondary', opacity: 0.5, display: 'block', marginBottom: '12px' }}>folder_off</span>
                                    <Typography sx={{ fontSize: '14px', color: 'text.secondary' }}>Nenhum projeto encontrado.</Typography>
                                </Box>
                            )}
                        </Box>
                    </Box>
                </Box>

                {/* Right Column */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {/* Próximos Prazos */}
                    <Box sx={{ ...commonPaperStyle, background: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}` }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <span className="material-icons-round" style={{ fontSize: '22px', color: '#f59e0b' }}>schedule</span>
                                <Typography sx={{ fontSize: '16px', fontWeight: 600, color: 'text.primary' }}>Próximos Prazos</Typography>
                            </Box>
                        </Box>
                        <Box sx={{ p: 2 }}>
                            {stats.upcomingGmuds?.length > 0 ? (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                    {stats.upcomingGmuds.slice(0, 4).map(gmud => (
                                        <Box key={gmud.id} onClick={() => navigate('/changes')} sx={{
                                            display: 'flex', alignItems: 'center', gap: 2, p: 2,
                                            background: theme.palette.background.default,
                                            border: '1px solid', borderColor: 'divider',
                                            borderLeft: '3px solid #f59e0b', borderRadius: '8px',
                                            cursor: 'pointer', transition: 'all 0.2s', '&:hover': { borderColor: 'primary.main', borderLeftColor: '#f59e0b' }
                                        }}>
                                            <Box sx={{ width: 40, height: 40, borderRadius: '8px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <span className="material-icons-round" style={{ fontSize: '20px', color: '#f59e0b' }}>sync_alt</span>
                                            </Box>
                                            <Box sx={{ flex: 1 }}>
                                                <Typography sx={{ fontSize: '11px', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{gmud.code}</Typography>
                                                <Typography sx={{ fontSize: '14px', fontWeight: 600, color: 'text.primary', my: 0.5 }}>{gmud.title}</Typography>
                                                <Typography sx={{ fontSize: '12px', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <span className="material-icons-round" style={{ fontSize: '14px' }}>event</span>
                                                    {format(new Date(gmud.scheduledStart || gmud.scheduledDate), "dd 'de' MMM", { locale: ptBR })}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    ))}
                                </Box>
                            ) : (
                                <Box sx={{ textAlign: 'center', py: 4 }}>
                                    <span className="material-icons-round" style={{ fontSize: '40px', color: 'text.secondary', opacity: 0.5, display: 'block', marginBottom: '12px' }}>event_available</span>
                                    <Typography sx={{ fontSize: '14px', fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>Sem prazos urgentes</Typography>
                                    <Typography sx={{ fontSize: '13px', color: 'text.secondary' }}>Tudo tranquilo por aqui.</Typography>
                                </Box>
                            )}
                        </Box>
                    </Box>

                    {/* Atividade Recente */}
                    <RecentActivities userId={user.id} />
                </Box>
            </Box>

            {/* Modals */}
            <TaskModal
                open={isTaskModalOpen}
                onClose={() => setIsTaskModalOpen(false)}
                onSave={handleCreateTask}
                isGeneralTask={true}
                members={taskAssignees.map((u) => ({ user: u }))}
            />
            <ChangeModal open={isGmudModalOpen} onClose={() => setIsGmudModalOpen(false)} onSave={handleCreateGmud} />
        </Box>
    );
};

export default CollaboratorDashboard;
