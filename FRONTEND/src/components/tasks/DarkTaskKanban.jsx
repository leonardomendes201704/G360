import { useState, useContext, useEffect } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Add } from '@mui/icons-material';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, useDroppable, DragOverlay } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import DarkTaskCard from './DarkTaskCard';
import DraggableTaskCard from './DraggableTaskCard';
import { ThemeContext } from '../../contexts/ThemeContext';

// Componente para área droppable de cada coluna (passa theme props via context)
const DroppableColumn = ({ id, children, isDark }) => {
    const { setNodeRef, isOver } = useDroppable({ id });

    const scrollbarTrack = isDark ? '#161d26' : '#f1f5f9';
    const scrollbarThumb = isDark ? '#1c2632' : '#cbd5e1';
    const scrollbarHover = isDark ? '#64748b' : '#94a3b8';

    return (
        <Box
            ref={setNodeRef}
            sx={{
                flex: 1,
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
                overflowY: 'auto',
                minHeight: '200px',
                background: isOver ? 'rgba(37, 99, 235, 0.05)' : 'transparent',
                borderRadius: '8px', // Adjusted radius for bottom
                transition: 'background 0.2s',
                '&::-webkit-scrollbar': {
                    width: '8px',
                },
                '&::-webkit-scrollbar-track': {
                    background: scrollbarTrack,
                },
                '&::-webkit-scrollbar-thumb': {
                    background: scrollbarThumb,
                    borderRadius: '8px',
                },
                '&::-webkit-scrollbar-thumb:hover': {
                    background: scrollbarHover,
                },
            }}
        >
            {children}
        </Box>
    );
};

const DarkTaskKanban = ({ tasks = [], onTaskClick, onTaskMove, onOpenCreateTask }) => {
    const { mode } = useContext(ThemeContext);
    const isDark = mode === 'dark';

    // Theme-aware styles
    const columnBg = isDark ? 'rgba(22, 29, 38, 0.6)' : '#f1f5f9'; // Matched TaskKanban
    const columnBorder = isDark ? '1px solid rgba(255, 255, 255, 0.06)' : 'transparent'; // Matched TaskKanban
    // const headerBorder = isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(0, 0, 0, 0.06)'; // Replaced by premium header border
    const textPrimary = isDark ? '#f1f5f9' : '#0f172a';
    const textSecondary = isDark ? '#64748b' : '#475569'; // Matched
    const textMuted = isDark ? '#94a3b8' : '#64748b';
    const badgeBg = isDark ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0'; // Matched TaskKanban
    const badgeText = isDark ? '#94a3b8' : '#64748b'; // Matched TaskKanban
    const emptyBoxBg = isDark ? '#1c2632' : '#f1f5f9';
    const emptyTextColor = isDark ? '#64748b' : '#94a3b8';
    const addButtonBorder = isDark ? '2px dashed rgba(255, 255, 255, 0.06)' : '2px dashed rgba(0, 0, 0, 0.12)';
    const addBtnHover = isDark ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0'; // Matched

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    // Premium Column Config (Matched TaskKanban)
    const columnConfig = {
        TODO: { id: 'TODO', title: 'A Fazer', icon: 'pending_actions', color: '#2563eb', gradient: 'linear-gradient(135deg, rgba(37, 99, 235, 0.15) 0%, transparent 100%)' },
        ON_HOLD: { id: 'ON_HOLD', title: 'Em Pausa', icon: 'pause_circle', color: '#f59e0b', gradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, transparent 100%)' },
        IN_PROGRESS: { id: 'IN_PROGRESS', title: 'Em Progresso', icon: 'autorenew', color: '#3b82f6', gradient: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, transparent 100%)' },
        DONE: { id: 'DONE', title: 'Concluído', icon: 'check_circle', color: '#22c55e', gradient: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, transparent 100%)' }
    };

    const columns = Object.values(columnConfig);

    // Normalizar status de tarefas (migrar valores antigos e corrigir inválidos)
    const normalizedTasks = tasks.map(task => {
        const validStatuses = ['TODO', 'ON_HOLD', 'IN_PROGRESS', 'DONE'];
        let normalizedStatus = task.status;

        // Migrar status antigos/removidos
        if (task.status === 'BACKLOG') {
            normalizedStatus = 'TODO';
        }
        // Migrar REVIEW para ON_HOLD
        if (task.status === 'REVIEW') {
            normalizedStatus = 'ON_HOLD';
        }

        // Tratar status inválidos
        if (!validStatuses.includes(normalizedStatus)) {
            console.error(`[DarkTaskKanban] Tarefa "${task.title}" com status inválido '${task.status}', usando 'TODO' como fallback`);
            normalizedStatus = 'TODO';
        }

        return { ...task, status: normalizedStatus };
    });

    const [activeTask, setActiveTask] = useState(null);
    const [doneCollapsed, setDoneCollapsed] = useState(false);
    const [doneWindow, setDoneWindow] = useState(7); // dias: 7, 30, 0 (todas)
    const [doneLimit, setDoneLimit] = useState(10);

    useEffect(() => {
        setDoneLimit(10);
    }, [doneWindow]);

    const getTasksByStatus = (status) => {
        return normalizedTasks.filter(task => task.status === status);
    };

    const getCompletedAt = (task) => {
        return task.completedAt || task.updatedAt || task.endDate || task.dueDate || task.createdAt;
    };

    const doneTasks = getTasksByStatus('DONE');
    const doneFiltered = doneWindow > 0
        ? doneTasks.filter(task => {
            const completedAt = getCompletedAt(task);
            if (!completedAt) return false;
            const cutoff = Date.now() - (doneWindow * 24 * 60 * 60 * 1000);
            return new Date(completedAt).getTime() >= cutoff;
        })
        : doneTasks;
    const doneVisible = doneCollapsed ? [] : doneFiltered.slice(0, doneLimit);

    const handleDragStart = (event) => {
        const { active } = event;
        const task = normalizedTasks.find(t => t.id === active.id);
        setActiveTask(task);
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;

        setActiveTask(null);

        if (!over) {
            return;
        }

        const taskId = active.id;
        let newStatus;

        // Se soltou sobre uma área droppable (termina com '-droppable')
        if (over.id.includes('-droppable')) {
            newStatus = over.id.split('-')[0];
        } else {
            // Se soltou sobre outro card, encontrar o status desse card
            const targetTask = normalizedTasks.find(t => t.id === over.id);
            if (targetTask) {
                newStatus = targetTask.status;
            } else {
                return;
            }
        }

        const task = normalizedTasks.find(t => t.id === taskId);
        if (!task) {
            return;
        }

        if (task.status === newStatus) {
            return;
        }

        onTaskMove(taskId, newStatus);
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', lg: 'repeat(4, 1fr)' }, // Added responsive grid
                    gap: 2.5,
                    mb: 4,
                }}
            >
                {columns.map((column) => {
                    const isDoneColumn = column.id === 'DONE';
                    const columnTasks = isDoneColumn ? doneVisible : getTasksByStatus(column.id);
                    const totalDone = isDoneColumn ? doneTasks.length : columnTasks.length;
                    const filteredDone = isDoneColumn ? doneFiltered.length : columnTasks.length;
                    const taskIds = columnTasks.map(t => t.id);

                    return (
                        <Box
                            key={column.id}
                            sx={{
                                background: columnBg,
                                border: columnBorder, // Updated border
                                backdropFilter: isDark ? 'blur(10px)' : 'none', // Added blur
                                borderRadius: '8px',
                                display: 'flex',
                                flexDirection: 'column',
                                minHeight: '500px',
                                boxShadow: isDark ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.08)',
                            }}
                        >
                            {/* Premium Column Header */}
                            <Box sx={{
                                background: column.gradient,
                                borderBottom: `2px solid ${column.color}`,
                                p: 2, // 16px
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                borderRadius: '8px' // Rounded top corners
                            }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <Box sx={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        bgcolor: `${column.color}20`,
                                        color: column.color
                                    }}>
                                        <span className="material-icons-round" style={{ fontSize: 18 }}>
                                            {column.icon}
                                        </span>
                                    </Box>
                                    <Typography
                                        variant="subtitle2"
                                        fontWeight="700"
                                        sx={{
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px',
                                            color: textPrimary
                                        }}
                                    >
                                        {column.title}
                                    </Typography>
                                    <Box sx={{
                                        bgcolor: badgeBg,
                                        px: 1.25,
                                        py: 0.25,
                                        borderRadius: '8px',
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        color: badgeText
                                    }}>
                                        {totalDone}
                                    </Box>
                                </Box>
                                <Box
                                    component="button"
                                    onClick={onOpenCreateTask}
                                    sx={{
                                        border: 'none',
                                        bgcolor: 'transparent',
                                        cursor: 'pointer',
                                        color: textSecondary,
                                        p: 0.75,
                                        borderRadius: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'all 0.2s',
                                        '&:hover': {
                                            bgcolor: addBtnHover,
                                            color: column.color,
                                            transform: 'scale(1.1)'
                                        }
                                    }}
                                >
                                    <Add sx={{ fontSize: 20 }} />
                                </Box>
                            </Box>

                            {/* "Done" Filters - Fixed Spacing */}
                            {isDoneColumn && (
                                <Box sx={{
                                    mx: 2, // 16px
                                    mb: 1, // 8px
                                    mt: 2, // 16px - INCREASED MARGIN (FIX)
                                    p: 1.5, // 12px
                                    bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 1
                                }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                                        <Box sx={{ display: 'flex', gap: 1 }}>
                                            {[{ label: '7d', value: 7 }, { label: '30d', value: 30 }, { label: 'Todas', value: 0 }].map(option => (
                                                <Button
                                                    key={option.value}
                                                    size="small"
                                                    onClick={() => setDoneWindow(option.value)}
                                                    sx={{
                                                        minWidth: 'auto',
                                                        px: 1.5,
                                                        py: 0.25, // Adjusted padding
                                                        fontSize: '0.7rem', // Smaller text
                                                        fontWeight: 700,
                                                        textTransform: 'none',
                                                        borderRadius: '8px', // Smaller radius
                                                        color: doneWindow === option.value ? '#2563eb' : textSecondary,
                                                        border: doneWindow === option.value
                                                            ? '1px solid #2563eb'
                                                            : `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`,
                                                        bgcolor: doneWindow === option.value ? 'rgba(37, 99, 235, 0.12)' : 'transparent',
                                                        '&:hover': {
                                                            bgcolor: doneWindow === option.value ? 'rgba(37, 99, 235, 0.12)' : 'rgba(37, 99, 235, 0.05)'
                                                        }
                                                    }}
                                                >
                                                    {option.label}
                                                </Button>
                                            ))}
                                        </Box>
                                        <Button
                                            size="small"
                                            onClick={() => setDoneCollapsed((prev) => !prev)}
                                            sx={{
                                                minWidth: 'auto',
                                                px: 1.5,
                                                py: 0.25,
                                                fontSize: '0.7rem',
                                                fontWeight: 700,
                                                textTransform: 'none',
                                                color: textSecondary,
                                                border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`,
                                                borderRadius: '8px',
                                                '&:hover': { bgcolor: addBtnHover }
                                            }}
                                        >
                                            {doneCollapsed ? 'Mostrar' : 'Ocultar'}
                                        </Button>
                                    </Box>
                                    {!doneCollapsed && (
                                        <Typography variant="caption" sx={{ color: textSecondary, fontSize: '0.7rem' }}>
                                            Mostrando {doneVisible.length} de {filteredDone}
                                        </Typography>
                                    )}
                                </Box>
                            )}

                            {/* Column Content - Droppable Area */}
                            <SortableContext
                                items={taskIds}
                                strategy={verticalListSortingStrategy}
                            >
                                <DroppableColumn id={`${column.id}-droppable`} isDark={isDark}>
                                    {columnTasks.length > 0 ? (
                                        columnTasks.map((task, index) => (
                                            <DraggableTaskCard
                                                key={task.id}
                                                task={task}
                                                taskIndex={normalizedTasks.indexOf(task)}
                                                onClick={onTaskClick}
                                            />
                                        ))
                                    ) : (
                                        <Box
                                            sx={{
                                                flex: 1,
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                padding: '32px',
                                                textAlign: 'center',
                                                opacity: 0.5
                                            }}
                                        >
                                            <span className="material-icons-round" style={{ fontSize: 48, opacity: 0.4, color: textSecondary }}>
                                                {column.id === 'DONE' ? 'celebration' : 'inbox'}
                                            </span>
                                            <Typography variant="body2" mt={1.5} fontWeight={500} color={textSecondary}>
                                                {column.id === 'DONE' ? 'Nenhuma tarefa concluída' : 'Nenhuma tarefa'}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: textSecondary, opacity: 0.7 }}>
                                                {column.id === 'TODO' ? 'Arraste tarefas aqui' : 'Mova tarefas para cá'}
                                            </Typography>
                                        </Box>
                                    )}

                                    {isDoneColumn && !doneCollapsed && doneFiltered.length > doneVisible.length && (
                                        <Button
                                            onClick={() => setDoneLimit((prev) => prev + 10)}
                                            sx={{
                                                mt: 1,
                                                width: '100%',
                                                background: 'transparent',
                                                border: '1px dashed #cbd5e1',
                                                borderRadius: '8px',
                                                color: '#64748b',
                                                fontSize: '0.75rem',
                                                fontWeight: 700,
                                                textTransform: 'none',
                                                '&:hover': {
                                                    borderColor: '#2563eb',
                                                    color: '#2563eb',
                                                    background: 'transparent'
                                                }
                                            }}
                                        >
                                            Ver mais
                                        </Button>
                                    )}

                                    {/* Add Task Button */}
                                    {/* Only show 'Add Task' button in respective columns if needed, or keeping generic at bottom for all?
                                        TaskKanban doesn't seem to have a bottom "Add Task" button per column, only header '+'
                                        Keeping it for consistency with previous DarkTaskKanban layout but styling it properly */}
                                    {/* Actually, the premium design usually relies on the header '+' button.
                                        But DarkTaskKanban had a large 'Add Task' button at the bottom.
                                        I will remove it to align with TaskKanban (General Tasks) which typically does NOT have a bottom button,
                                        or if it does, it should match the style.
                                        TaskKanban.jsx has an empty state that says "Arraste tarefas aqui".
                                        I will keep the logic close to TaskKanban.
                                     */}
                                </DroppableColumn>
                            </SortableContext>
                        </Box>
                    );
                })}
            </Box>
            <DragOverlay>
                {activeTask ? (
                    <Box sx={{ transform: 'rotate(3deg)', cursor: 'grabbing' }}>
                        <DarkTaskCard task={activeTask} onClick={() => { }} />
                    </Box>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
};

export default DarkTaskKanban;
