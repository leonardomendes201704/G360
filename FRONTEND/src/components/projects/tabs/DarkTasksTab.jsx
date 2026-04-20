import { useState, useMemo, useEffect, useCallback, useContext } from 'react';
import { Box, Typography, Button, TextField, Select, MenuItem, FormControl, InputAdornment, CircularProgress } from '@mui/material';
import { Add, Search } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { ThemeContext } from '../../../contexts/ThemeContext';
import DarkTaskKanban from '../../tasks/DarkTaskKanban';
import ProjectTaskListTable from '../projectDetailLists/ProjectTaskListTable';
import { getProjectTasks, updateProjectTask, createProjectTask, deleteProjectTask } from '../../../services/project-details.service';
import ProjectTaskModal from '../../modals/ProjectTaskModal';
import StatsCard from '../../common/StatsCard';
import ProjectTabKpiStrip from '../ProjectTabKpiStrip';

const DarkTasksTab = ({ project }) => {
    const { mode } = useContext(ThemeContext);
    const isDark = mode === 'dark';

    // Theme-aware styles
    const cardBg = isDark ? 'rgba(22, 29, 38, 0.5)' : '#FFFFFF';
    const cardBorder = isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(0, 0, 0, 0.08)';
    const cardShadow = isDark ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.08)';
    const textPrimary = isDark ? '#f1f5f9' : '#0f172a';
    const textSecondary = isDark ? '#64748b' : '#475569';
    const textMuted = isDark ? '#94a3b8' : '#64748b';
    const surfaceBg = isDark ? '#1c2632' : '#f8fafc';
    const borderSubtle = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';

    const { enqueueSnackbar } = useSnackbar();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('KANBAN');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [priorityFilter, setPriorityFilter] = useState('ALL');
    const [assigneeFilter, setAssigneeFilter] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);

    // Fetch tasks
    const fetchTasks = useCallback(async () => {
        if (!project?.id) return;
        try {
            setLoading(true);
            const data = await getProjectTasks(project.id);
            setTasks(data);
        } catch (error) {
            console.error('Erro ao carregar tarefas:', error);
            enqueueSnackbar('Erro ao carregar tarefas', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    }, [project?.id, enqueueSnackbar]);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    // Handlers
    const handleTaskClick = (task) => {
        setSelectedTask(task);
        setModalOpen(true);
    };

    const handleOpenCreateTask = () => {
        setSelectedTask(null);
        setModalOpen(true);
    };

    const handleTaskMove = async (taskId, newStatus) => {
        try {
            await updateProjectTask(taskId, { status: newStatus });
            fetchTasks();
        } catch (error) {
            console.error('Erro ao mover tarefa:', error);
            enqueueSnackbar('Erro ao mover tarefa', { variant: 'error' });
        }
    };

    const handleTaskDelete = async (taskId) => {
        if (!window.confirm('Tem certeza que deseja excluir esta tarefa?')) return;
        try {
            await deleteProjectTask(taskId);
            fetchTasks();
            enqueueSnackbar('Tarefa excluida com sucesso', { variant: 'success' });
        } catch (error) {
            console.error('Erro ao excluir tarefa:', error);
            enqueueSnackbar('Erro ao excluir tarefa', { variant: 'error' });
        }
    };

    const handleTaskToggle = async (taskId, currentStatus) => {
        const newStatus = currentStatus === 'DONE' ? 'TODO' : 'DONE';
        try {
            await updateProjectTask(taskId, { status: newStatus });
            fetchTasks();
        } catch (error) {
            console.error('Erro ao atualizar status:', error);
            enqueueSnackbar('Erro ao atualizar status', { variant: 'error' });
        }
    };


    const handleSaveTask = async (data) => {
        try {
            if (selectedTask) {
                await updateProjectTask(selectedTask.id, data);
                enqueueSnackbar('Tarefa atualizada com sucesso', { variant: 'success' });
            } else {
                await createProjectTask(project.id, data);
                enqueueSnackbar('Tarefa criada com sucesso', { variant: 'success' });
            }
            setModalOpen(false);
            fetchTasks();
        } catch (error) {
            console.error('Erro ao salvar tarefa:', error);
            enqueueSnackbar('Erro ao salvar tarefa', { variant: 'error' });
        }
    };

    // Calcular estatisticas
    const stats = useMemo(() => ({
        total: tasks.length,
        backlog: tasks.filter(t => t.status === 'BACKLOG').length,
        todo: tasks.filter(t => t.status === 'TODO').length,
        inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
        done: tasks.filter(t => t.status === 'DONE').length,
    }), [tasks]);

    // Lista unica de responsaveis
    const assignees = useMemo(() => {
        const uniqueAssignees = new Map();
        tasks.forEach(task => {
            const assignee = task.assignedTo || task.assignee;
            if (assignee && assignee.id) {
                uniqueAssignees.set(assignee.id, assignee);
            }
        });
        return Array.from(uniqueAssignees.values());
    }, [tasks]);

    // Filtrar tarefas
    const filteredTasks = useMemo(() => {
        return tasks.filter(task => {
            if (statusFilter !== 'ALL' && task.status !== statusFilter) return false;
            if (priorityFilter !== 'ALL' && task.priority?.toUpperCase() !== priorityFilter) return false;
            if (assigneeFilter !== 'ALL') {
                const assignee = task.assignedTo || task.assignee;
                if (!assignee || assignee.id?.toString() !== assigneeFilter) return false;
            }
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const title = (task.title || task.name || '').toLowerCase();
                const description = (task.description || '').toLowerCase();
                if (!title.includes(query) && !description.includes(query)) return false;
            }
            return true;
        });
    }, [tasks, statusFilter, priorityFilter, assigneeFilter, searchQuery]);

    const dense = true;

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
                <CircularProgress sx={{ color: '#2563eb' }} />
            </Box>
        );
    }

    return (
        <Box>
            {/* Tasks Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <span className="material-icons-round" style={{ fontSize: '24px', color: '#2563eb' }}>assignment</span>
                    <Typography sx={{ fontSize: '20px', fontWeight: 600, color: textPrimary }}>
                        Tarefas do Projeto
                    </Typography>
                    <Box
                        sx={{
                            bgcolor: 'rgba(37, 99, 235, 0.15)',
                            color: '#2563eb',
                            padding: '4px 12px',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: 600,
                        }}
                    >
                        {stats.total} {stats.total === 1 ? 'tarefa' : 'tarefas'}
                    </Box>
                </Box>
                <Button
                    onClick={handleOpenCreateTask}
                    startIcon={<Add />}
                    sx={{
                        background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                        color: 'white',
                        borderRadius: '8px',
                        padding: '12px 20px',
                        fontSize: '14px',
                        fontWeight: 600,
                        textTransform: 'none',
                        boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                        '&:hover': {
                            transform: 'translateY(-2px)',
                            boxShadow: '0 6px 20px rgba(37, 99, 235, 0.4)',
                        },
                    }}
                >
                    Nova Tarefa
                </Button>
            </Box>

            <ProjectTabKpiStrip columnCount={5}>
                <StatsCard dense={dense} title="Total" value={stats.total} iconName="assignment" hexColor="#2563eb" />
                <StatsCard dense={dense} title="Backlog" value={stats.backlog} iconName="inventory_2" hexColor="#64748b" />
                <StatsCard dense={dense} title="A fazer" value={stats.todo} iconName="pending_actions" hexColor="#0ea5e9" />
                <StatsCard dense={dense} title="Em prog." value={stats.inProgress} iconName="autorenew" hexColor="#f59e0b" />
                <StatsCard dense={dense} title="Concluídas" value={stats.done} iconName="check_circle" hexColor="#10b981" />
            </ProjectTabKpiStrip>

            {/* View Tabs */}
            <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
                {[
                    { id: 'LIST', label: 'Lista', icon: 'list' },
                    { id: 'KANBAN', label: 'Kanban', icon: 'view_kanban' },
                ].map((tab) => (
                    <Button
                        key={tab.id}
                        onClick={() => setViewMode(tab.id)}
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            padding: '10px 18px',
                            background: viewMode === tab.id ? 'rgba(37, 99, 235, 0.15)' : surfaceBg,
                            border: `1px solid ${viewMode === tab.id ? 'rgba(37, 99, 235, 0.3)' : borderSubtle}`,
                            borderRadius: '8px',
                            color: viewMode === tab.id ? '#2563eb' : textMuted,
                            fontSize: '13px',
                            fontWeight: 500,
                            textTransform: 'none',
                            '&:hover': {
                                color: viewMode === tab.id ? '#2563eb' : textPrimary,
                                borderColor: 'rgba(37, 99, 235, 0.3)',
                            },
                        }}
                        startIcon={<span className="material-icons-round" style={{ fontSize: '18px' }}>{tab.icon}</span>}
                    >
                        {tab.label}
                    </Button>
                ))}
            </Box>

            {/* Filters Bar */}
            <Box
                sx={{
                    background: cardBg,
                    backdropFilter: isDark ? 'blur(10px)' : 'none',
                    border: cardBorder,
                    boxShadow: cardShadow,
                    borderRadius: '8px',
                    padding: '16px 20px',
                    mb: 3,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    flexWrap: 'wrap',
                }}
            >
                {/* Status Filter */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography sx={{ fontSize: '12px', color: textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Status:
                    </Typography>
                    <FormControl size="small">
                        <Select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            sx={{
                                bgcolor: surfaceBg,
                                border: '1px solid rgba(255, 255, 255, 0.06)',
                                borderRadius: '8px',
                                fontSize: '13px',
                                color: textPrimary,
                                minWidth: '120px',
                                '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                                '&:hover': { borderColor: 'rgba(37, 99, 235, 0.3)' },
                                '& .MuiSelect-icon': { color: '#94a3b8' },
                            }}
                        >
                            <MenuItem value="ALL">Todos</MenuItem>
                            <MenuItem value="BACKLOG">Backlog</MenuItem>
                            <MenuItem value="TODO">A Fazer</MenuItem>
                            <MenuItem value="IN_PROGRESS">Em Progresso</MenuItem>
                            <MenuItem value="DONE">Concluido</MenuItem>
                        </Select>
                    </FormControl>
                </Box>

                {/* Priority Filter */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography sx={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Prioridade:
                    </Typography>
                    <FormControl size="small">
                        <Select
                            value={priorityFilter}
                            onChange={(e) => setPriorityFilter(e.target.value)}
                            sx={{
                                bgcolor: surfaceBg,
                                border: '1px solid rgba(255, 255, 255, 0.06)',
                                borderRadius: '8px',
                                fontSize: '13px',
                                color: textPrimary,
                                minWidth: '120px',
                                '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                                '&:hover': { borderColor: 'rgba(37, 99, 235, 0.3)' },
                                '& .MuiSelect-icon': { color: '#94a3b8' },
                            }}
                        >
                            <MenuItem value="ALL">Todas</MenuItem>
                            <MenuItem value="HIGH">Alta</MenuItem>
                            <MenuItem value="MEDIUM">Media</MenuItem>
                            <MenuItem value="LOW">Baixa</MenuItem>
                        </Select>
                    </FormControl>
                </Box>

                {/* Assignee Filter */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography sx={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Responsavel:
                    </Typography>
                    <FormControl size="small">
                        <Select
                            value={assigneeFilter}
                            onChange={(e) => setAssigneeFilter(e.target.value)}
                            sx={{
                                bgcolor: surfaceBg,
                                border: '1px solid rgba(255, 255, 255, 0.06)',
                                borderRadius: '8px',
                                fontSize: '13px',
                                color: textPrimary,
                                minWidth: '140px',
                                '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                                '&:hover': { borderColor: 'rgba(37, 99, 235, 0.3)' },
                                '& .MuiSelect-icon': { color: '#94a3b8' },
                            }}
                        >
                            <MenuItem value="ALL">Todos</MenuItem>
                            {assignees.map((assignee) => (
                                <MenuItem key={assignee.id} value={assignee.id.toString()}>
                                    {assignee.name || assignee.email}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>

                {/* Search */}
                <TextField
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar tarefas..."
                    size="small"
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <Search sx={{ fontSize: '18px', color: '#64748b' }} />
                            </InputAdornment>
                        ),
                    }}
                    sx={{
                        flex: 1,
                        minWidth: '200px',
                        '& .MuiOutlinedInput-root': {
                            bgcolor: surfaceBg,
                            border: '1px solid rgba(255, 255, 255, 0.06)',
                            borderRadius: '8px',
                            fontSize: '13px',
                            color: textPrimary,
                            '& fieldset': { border: 'none' },
                            '&:hover': { borderColor: 'rgba(37, 99, 235, 0.3)' },
                            '&.Mui-focused': { borderColor: '#2563eb' },
                        },
                        '& input::placeholder': {
                            color: '#64748b',
                            opacity: 1,
                        },
                    }}
                />
            </Box>

            {/* Content based on viewMode */}
            {viewMode === 'LIST' ? (
                <ProjectTaskListTable
                    tasks={filteredTasks}
                    onTaskClick={handleTaskClick}
                    onTaskDelete={handleTaskDelete}
                    onTaskToggle={handleTaskToggle}
                    theme={{
                        isDark,
                        containerBg: cardBg,
                        containerBorder: cardBorder,
                        cardShadow,
                        textPrimary,
                        textSecondary,
                        textMuted,
                        surfaceBg,
                        checkboxBorder: isDark ? '2px solid rgba(255, 255, 255, 0.06)' : '2px solid rgba(0, 0, 0, 0.12)',
                        menuBg: isDark ? '#1c2632' : '#ffffff',
                        menuBorder: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(0, 0, 0, 0.08)',
                        menuText: isDark ? '#f1f5f9' : '#0f172a',
                    }}
                />
            ) : (
                <DarkTaskKanban
                    tasks={filteredTasks}
                    onTaskClick={handleTaskClick}
                    onTaskMove={handleTaskMove}
                    onOpenCreateTask={handleOpenCreateTask}
                />
            )}

            {/* Task Modal */}
            <ProjectTaskModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onSave={handleSaveTask}
                task={selectedTask}
                projectId={project?.id}
                allTasks={tasks}
            />
        </Box>
    );
};

export default DarkTasksTab;











