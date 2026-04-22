import { useState, useContext, useEffect, useMemo } from 'react';
import { Box, Typography, Button, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import { Add, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import {
    DndContext,
    PointerSensor,
    useSensor,
    useSensors,
    useDroppable,
    DragOverlay,
    pointerWithin,
    rectIntersection,
    closestCorners,
} from '@dnd-kit/core';
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

const DROPPABLE_SUFFIX = '-droppable';

/**
 * Vários alvos: cartões (sortable) e áreas de coluna (`*-droppable`).
 * `closestCenter` falhava trocas entre colunas; priorizar ponteiro e interseção de retângulos.
 */
const kanbanCollisionDetection = (args) => {
    const within = pointerWithin(args);
    if (within && within.length > 0) return within;
    const inter = rectIntersection(args);
    if (inter && inter.length > 0) return inter;
    return closestCorners(args);
};

const DarkTaskKanban = ({
    tasks = [],
    onTaskClick,
    onTaskMove,
    onOpenCreateTask,
    /** Coluna Backlog (paridade API/Kanban com tarefas de projeto e tarefas gerais — TAR-01). */
    showBacklogColumn = false,
    /** Tarefas gerais: 5 colunas (inclui Canceladas) + menu / timer */
    showCancelledColumn = false,
    activeTimerTaskId = null,
    onTimerToggle,
    currentUserId,
    onTaskDelete,
}) => {
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

    const columnConfig = useMemo(() => {
        const cfg = {};
        if (showBacklogColumn) {
            cfg.BACKLOG = {
                id: 'BACKLOG',
                title: 'Backlog',
                icon: 'inventory_2',
                color: '#64748b',
                gradient: 'linear-gradient(135deg, rgba(100, 116, 139, 0.22) 0%, transparent 100%)',
            };
        }
        Object.assign(cfg, {
            TODO: { id: 'TODO', title: 'A Fazer', icon: 'pending_actions', color: '#2563eb', gradient: 'linear-gradient(135deg, rgba(37, 99, 235, 0.15) 0%, transparent 100%)' },
            ON_HOLD: { id: 'ON_HOLD', title: 'Em Pausa', icon: 'pause_circle', color: '#f59e0b', gradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, transparent 100%)' },
            IN_PROGRESS: { id: 'IN_PROGRESS', title: 'Em Progresso', icon: 'autorenew', color: '#3b82f6', gradient: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, transparent 100%)' },
            DONE: { id: 'DONE', title: 'Concluído', icon: 'check_circle', color: '#22c55e', gradient: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, transparent 100%)' },
        });
        if (showCancelledColumn) {
            cfg.CANCELLED = { id: 'CANCELLED', title: 'Canceladas', icon: 'block', color: '#94a3b8', gradient: 'linear-gradient(135deg, rgba(148, 163, 184, 0.2) 0%, transparent 100%)' };
        }
        return cfg;
    }, [showBacklogColumn, showCancelledColumn]);

    const columnOrder = useMemo(() => {
        const core = ['TODO', 'ON_HOLD', 'IN_PROGRESS', 'DONE'];
        const start = showBacklogColumn ? ['BACKLOG'] : [];
        const end = showCancelledColumn ? ['CANCELLED'] : [];
        return [...start, ...core, ...end];
    }, [showBacklogColumn, showCancelledColumn]);

    const columns = columnOrder.map((id) => columnConfig[id]);

    const kanbanColCount = 4 + (showBacklogColumn ? 1 : 0) + (showCancelledColumn ? 1 : 0);

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

    // Normalizar status de tarefas (migrar valores antigos e corrigir inválidos)
    const normalizedTasks = useMemo(() => {
        const validStatuses = columnOrder;
        return tasks.map((task) => {
            let normalizedStatus = task.status;

            if (!showCancelledColumn && normalizedStatus === 'CANCELLED') {
                normalizedStatus = 'TODO';
            }

            if (!showBacklogColumn && normalizedStatus === 'BACKLOG') {
                normalizedStatus = 'TODO';
            }
            if (normalizedStatus === 'REVIEW') {
                normalizedStatus = 'ON_HOLD';
            }

            if (!validStatuses.includes(normalizedStatus)) {
                console.error(`[DarkTaskKanban] Tarefa "${task.title}" com status inválido '${task.status}', usando 'TODO' como fallback`);
                normalizedStatus = 'TODO';
            }

            return { ...task, status: normalizedStatus };
        });
    }, [tasks, columnOrder, showBacklogColumn, showCancelledColumn]);

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
        const overId = String(over.id);

        let newStatus;
        // NUNCA usar split('-')[0] — "IN_PROGRESS-droppable" virava "IN" e a API rejeitava; o card “voltava”.
        if (overId.endsWith(DROPPABLE_SUFFIX)) {
            newStatus = overId.slice(0, -DROPPABLE_SUFFIX.length);
        } else {
            const targetTask = normalizedTasks.find(t => t.id === over.id);
            if (targetTask) {
                newStatus = targetTask.status;
            } else {
                return;
            }
        }

        if (!columnOrder.includes(newStatus)) {
            return;
        }

        const task = normalizedTasks.find(t => t.id === taskId);
        if (!task) {
            return;
        }

        if (task.status === newStatus) {
            return;
        }

        if (import.meta.env.DEV) {
            // eslint-disable-next-line no-console
            console.info('[DarkTaskKanban] drop → API', {
                taskId,
                fromStatus: task.status,
                newStatus,
                overId,
                overIsDroppable: overId.endsWith(DROPPABLE_SUFFIX),
            });
        }

        onTaskMove(taskId, newStatus);
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={kanbanCollisionDetection}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                        xs: '1fr',
                        sm: kanbanColCount >= 5 ? 'repeat(2, 1fr)' : '1fr',
                        md: kanbanColCount >= 5 ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)',
                        lg: `repeat(${kanbanColCount}, 1fr)`,
                    },
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
                                border: columnBorder,
                                /* Sem backdropFilter: em WebKit cria novo containing block e o DragOverlay
                                   do @dnd-kit desloca o “ghost” em relação ao cursor. */
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
                                {onOpenCreateTask ? (
                                <Box
                                    component="button"
                                    type="button"
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
                                ) : null}
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
                                                activeTimerTaskId={activeTimerTaskId}
                                                onTimerToggle={onTimerToggle}
                                                currentUserId={currentUserId}
                                                onContextMenu={onTaskDelete ? handleMenuOpen : undefined}
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
                                                {column.id === 'TODO' || column.id === 'BACKLOG'
                                                    ? 'Arraste tarefas aqui'
                                                    : 'Mova tarefas para cá'}
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
            <DragOverlay dropAnimation={null} zIndex={10000}>
                {activeTask ? (
                    <Box sx={{ cursor: 'grabbing', maxWidth: 360 }}>
                        <DarkTaskCard task={activeTask} onClick={() => { }} />
                    </Box>
                ) : null}
            </DragOverlay>

            {onTaskDelete ? (
                <Menu
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={handleMenuClose}
                    PaperProps={{
                        sx: {
                            borderRadius: '8px',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                            border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`,
                            bgcolor: isDark ? '#1e293b' : '#ffffff',
                            minWidth: 160,
                        },
                    }}
                >
                    <MenuItem
                        onClick={(e) => {
                            e.stopPropagation();
                            if (menuTask) onTaskClick(menuTask);
                            handleMenuClose();
                        }}
                        sx={{ borderRadius: '8px', mx: 0.5 }}
                    >
                        <ListItemIcon>
                            <EditIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>Editar</ListItemText>
                    </MenuItem>
                    <MenuItem
                        onClick={(e) => {
                            e.stopPropagation();
                            if (menuTask) onTaskDelete(menuTask.id);
                            handleMenuClose();
                        }}
                        sx={{ borderRadius: '8px', mx: 0.5 }}
                    >
                        <ListItemIcon>
                            <DeleteIcon fontSize="small" color="error" />
                        </ListItemIcon>
                        <ListItemText sx={{ color: 'error.main' }}>Excluir</ListItemText>
                    </MenuItem>
                </Menu>
            ) : null}
        </DndContext>
    );
};

export default DarkTaskKanban;
