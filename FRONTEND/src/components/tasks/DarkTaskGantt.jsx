import { useState, useMemo, useCallback } from 'react';
import { Box, Typography, Tooltip, IconButton, FormControl, Select, MenuItem } from '@mui/material';
import { ZoomIn, ZoomOut, Today, ExpandMore, ExpandLess } from '@mui/icons-material';
import { Gantt, ViewMode } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css';

// Cores por status
const STATUS_COLORS = {
    BACKLOG: { bar: '#64748b', progress: '#475569' },
    TODO: { bar: '#0ea5e9', progress: '#0284c7' },
    IN_PROGRESS: { bar: '#f59e0b', progress: '#d97706' },
    REVIEW: { bar: '#a855f7', progress: '#7c3aed' },
    DONE: { bar: '#10b981', progress: '#059669' },
    ARCHIVED: { bar: '#475569', progress: '#334155' },
};

// Cores por prioridade
const PRIORITY_COLORS = {
    HIGH: '#ef4444',
    MEDIUM: '#f59e0b',
    LOW: '#10b981',
};

/**
 * Componente de Gráfico de Gantt com tema dark premium
 */
const DarkTaskGantt = ({
    tasks = [],
    onTaskClick,
    onTaskDateChange,
    onProgressChange,
    readOnly = false,
}) => {
    const [viewMode, setViewMode] = useState(ViewMode.Week);
    const [isExpanded, setIsExpanded] = useState(true);
    const [columnWidth, setColumnWidth] = useState(65);

    // Transformar tasks do backend para formato do Gantt
    const ganttTasks = useMemo(() => {
        if (!tasks.length) return [];

        const now = new Date();
        const defaultStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const defaultEnd = new Date(defaultStart);
        defaultEnd.setDate(defaultEnd.getDate() + 7);

        return tasks
            .filter(task => task.startDate || task.endDate) // Apenas tarefas com datas
            .map(task => {
                const start = task.startDate ? new Date(task.startDate) : defaultStart;
                const end = task.endDate ? new Date(task.endDate) : defaultEnd;
                const statusColor = STATUS_COLORS[task.status] || STATUS_COLORS.TODO;

                return {
                    id: task.id,
                    name: task.title,
                    start,
                    end,
                    progress: task.progress || 0,
                    type: 'task',
                    dependencies: task.dependencies || [],
                    styles: {
                        backgroundColor: statusColor.bar,
                        backgroundSelectedColor: statusColor.bar,
                        progressColor: statusColor.progress,
                        progressSelectedColor: statusColor.progress,
                    },
                    // Dados extras para tooltip
                    _original: task,
                };
            });
    }, [tasks]);

    // Tarefas sem datas (não aparecem no Gantt)
    const tasksWithoutDates = useMemo(() => {
        return tasks.filter(task => !task.startDate && !task.endDate);
    }, [tasks]);

    // Handler de clique na tarefa
    const handleTaskClick = useCallback((task) => {
        if (onTaskClick && task._original) {
            onTaskClick(task._original);
        }
    }, [onTaskClick]);

    // Handler de mudança de data (drag & drop)
    const handleDateChange = useCallback((task) => {
        if (onTaskDateChange) {
            onTaskDateChange(task.id, {
                startDate: task.start.toISOString(),
                endDate: task.end.toISOString(),
            });
        }
    }, [onTaskDateChange]);

    // Handler de mudança de progresso
    const handleProgressChange = useCallback((task) => {
        if (onProgressChange) {
            onProgressChange(task.id, task.progress);
        }
    }, [onProgressChange]);

    // Zoom controls
    const handleZoomIn = () => {
        setColumnWidth(prev => Math.min(prev + 20, 200));
    };

    const handleZoomOut = () => {
        setColumnWidth(prev => Math.max(prev - 20, 30));
    };

    const handleToday = () => {
        // Scroll to today - biblioteca não tem método nativo, mas podemos resetar view
        setViewMode(ViewMode.Day);
        setTimeout(() => setViewMode(ViewMode.Week), 100);
    };

    // Tooltip customizado
    const TooltipContent = ({ task }) => {
        const original = task._original;
        if (!original) return null;

        const assignee = original.assignee || original.assignedTo;
        const priorityColor = PRIORITY_COLORS[original.priority] || PRIORITY_COLORS.MEDIUM;

        return (
            <Box sx={{
                p: 1.5,
                minWidth: 200,
                background: 'rgba(15, 23, 42, 0.98)',
                borderRadius: '8px',
                border: '1px solid rgba(37, 99, 235, 0.3)',
            }}>
                <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#f1f5f9', mb: 1 }}>
                    {original.title}
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>Status:</span>
                        <Box sx={{
                            px: 1,
                            py: 0.25,
                            borderRadius: '8px',
                            bgcolor: `${STATUS_COLORS[original.status]?.bar}20`,
                            color: STATUS_COLORS[original.status]?.bar,
                            fontSize: '11px',
                            fontWeight: 500,
                        }}>
                            {original.status}
                        </Box>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>Prioridade:</span>
                        <Box sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '8px',
                            bgcolor: priorityColor,
                        }} />
                        <span style={{ fontSize: '11px', color: '#f1f5f9' }}>{original.priority}</span>
                    </Box>
                    {assignee && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Responsável:</span>
                            <span style={{ fontSize: '11px', color: '#f1f5f9' }}>{assignee.name || assignee.email}</span>
                        </Box>
                    )}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>Progresso:</span>
                        <span style={{ fontSize: '11px', color: '#2563eb', fontWeight: 600 }}>{task.progress}%</span>
                    </Box>
                </Box>
            </Box>
        );
    };

    // Se não há tarefas com datas, mostrar mensagem
    if (!ganttTasks.length) {
        return (
            <Box sx={{
                background: 'rgba(22, 29, 38, 0.5)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '8px',
                p: 4,
                textAlign: 'center',
            }}>
                <span className="material-icons-round" style={{ fontSize: '48px', color: '#64748b', mb: 2 }}>
                    event_busy
                </span>
                <Typography sx={{ color: '#94a3b8', fontSize: '15px', mt: 2 }}>
                    Nenhuma tarefa com datas definidas.
                </Typography>
                <Typography sx={{ color: '#64748b', fontSize: '13px', mt: 1 }}>
                    Defina datas de início e fim nas tarefas para visualizá-las no Gantt.
                </Typography>
                {tasksWithoutDates.length > 0 && (
                    <Typography sx={{ color: '#2563eb', fontSize: '13px', mt: 2 }}>
                        {tasksWithoutDates.length} {tasksWithoutDates.length === 1 ? 'tarefa' : 'tarefas'} sem datas definidas
                    </Typography>
                )}
            </Box>
        );
    }

    return (
        <Box sx={{
            background: 'rgba(22, 29, 38, 0.5)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '8px',
            overflow: 'hidden',
        }}>
            {/* Toolbar */}
            <Box sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                p: 2,
                borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {/* View Mode Selector */}
                    <FormControl size="small">
                        <Select
                            value={viewMode}
                            onChange={(e) => setViewMode(e.target.value)}
                            sx={{
                                bgcolor: '#1c2632',
                                border: '1px solid rgba(255, 255, 255, 0.06)',
                                borderRadius: '8px',
                                fontSize: '13px',
                                color: '#f1f5f9',
                                minWidth: '100px',
                                '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                                '&:hover': { borderColor: 'rgba(37, 99, 235, 0.3)' },
                                '& .MuiSelect-icon': { color: '#94a3b8' },
                            }}
                        >
                            <MenuItem value={ViewMode.Day}>Dia</MenuItem>
                            <MenuItem value={ViewMode.Week}>Semana</MenuItem>
                            <MenuItem value={ViewMode.Month}>Mês</MenuItem>
                            <MenuItem value={ViewMode.QuarterYear}>Trimestre</MenuItem>
                        </Select>
                    </FormControl>

                    {/* Zoom Controls */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Tooltip title="Diminuir zoom">
                            <IconButton onClick={handleZoomOut} size="small" sx={{ color: '#94a3b8', '&:hover': { color: '#f1f5f9' } }}>
                                <ZoomOut fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Aumentar zoom">
                            <IconButton onClick={handleZoomIn} size="small" sx={{ color: '#94a3b8', '&:hover': { color: '#f1f5f9' } }}>
                                <ZoomIn fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Ir para hoje">
                            <IconButton onClick={handleToday} size="small" sx={{ color: '#94a3b8', '&:hover': { color: '#f1f5f9' } }}>
                                <Today fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography sx={{ fontSize: '13px', color: '#64748b' }}>
                        {ganttTasks.length} {ganttTasks.length === 1 ? 'tarefa' : 'tarefas'}
                    </Typography>
                    {tasksWithoutDates.length > 0 && (
                        <Tooltip title={`${tasksWithoutDates.length} tarefas sem datas`}>
                            <Box sx={{
                                px: 1,
                                py: 0.25,
                                borderRadius: '8px',
                                bgcolor: 'rgba(245, 158, 11, 0.15)',
                                color: '#f59e0b',
                                fontSize: '11px',
                            }}>
                                +{tasksWithoutDates.length}
                            </Box>
                        </Tooltip>
                    )}
                    <IconButton
                        onClick={() => setIsExpanded(!isExpanded)}
                        size="small"
                        sx={{ color: '#94a3b8', '&:hover': { color: '#f1f5f9' } }}
                    >
                        {isExpanded ? <ExpandLess /> : <ExpandMore />}
                    </IconButton>
                </Box>
            </Box>

            {/* Gantt Chart */}
            {isExpanded && (
                <Box sx={{
                    '& .gantt-container': {
                        background: 'transparent !important',
                    },
                    '& .gantt': {
                        background: 'transparent !important',
                    },
                    '& .calendar': {
                        background: '#1c2632 !important',
                        color: '#94a3b8 !important',
                    },
                    '& .calendar-header': {
                        color: '#f1f5f9 !important',
                        fontWeight: 600,
                    },
                    '& .grid-row': {
                        background: 'transparent !important',
                        '&:nth-of-type(even)': {
                            background: 'rgba(255, 255, 255, 0.02) !important',
                        },
                    },
                    '& .grid-row-line': {
                        stroke: 'rgba(255, 255, 255, 0.06) !important',
                    },
                    '& .grid-tick': {
                        stroke: 'rgba(255, 255, 255, 0.03) !important',
                    },
                    '& .task-list-header': {
                        background: '#1c2632 !important',
                        color: '#f1f5f9 !important',
                    },
                    '& .task-list-cell': {
                        background: 'transparent !important',
                        color: '#f1f5f9 !important',
                        borderColor: 'rgba(255, 255, 255, 0.06) !important',
                    },
                    '& .bar-wrapper': {
                        cursor: 'pointer',
                    },
                    '& .bar-label': {
                        fill: '#fff !important',
                        fontWeight: 500,
                    },
                    '& .arrow': {
                        fill: '#2563eb !important',
                        stroke: '#2563eb !important',
                    },
                    '& .today-highlight': {
                        fill: 'rgba(37, 99, 235, 0.1) !important',
                    },
                    // Remove scrollbar styling que conflita
                    '& ::-webkit-scrollbar': {
                        width: '8px',
                        height: '8px',
                    },
                    '& ::-webkit-scrollbar-track': {
                        background: 'rgba(255, 255, 255, 0.02)',
                    },
                    '& ::-webkit-scrollbar-thumb': {
                        background: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                    },
                }}>
                    <Gantt
                        tasks={ganttTasks}
                        viewMode={viewMode}
                        columnWidth={columnWidth}
                        listCellWidth=""
                        rowHeight={42}
                        headerHeight={50}
                        barCornerRadius={6}
                        barFill={75}
                        handleWidth={8}
                        todayColor="rgba(37, 99, 235, 0.08)"
                        onClick={handleTaskClick}
                        onDateChange={readOnly ? undefined : handleDateChange}
                        onProgressChange={readOnly ? undefined : handleProgressChange}
                        TooltipContent={TooltipContent}
                        locale="pt-BR"
                    />
                </Box>
            )}

            {/* Legend */}
            <Box sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 3,
                p: 2,
                borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            }}>
                <Typography sx={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Legenda:
                </Typography>
                {Object.entries(STATUS_COLORS).map(([status, colors]) => (
                    <Box key={status} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Box sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '8px',
                            bgcolor: colors.bar,
                        }} />
                        <Typography sx={{ fontSize: '11px', color: '#94a3b8' }}>
                            {status === 'BACKLOG' ? 'Backlog' :
                                status === 'TODO' ? 'A Fazer' :
                                    status === 'IN_PROGRESS' ? 'Em Progresso' :
                                        status === 'DONE' ? 'Concluído' : status}
                        </Typography>
                    </Box>
                ))}
            </Box>
        </Box>
    );
};

export default DarkTaskGantt;
