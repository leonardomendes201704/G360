import { useState, useEffect, useContext } from 'react';
import { ThemeContext } from '../../contexts/ThemeContext';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { format, isAfter, startOfDay } from 'date-fns';
import { Menu, MenuItem, ListItemIcon, ListItemText, Box, Paper, Typography, Tooltip, IconButton } from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, MoreVert as MoreIcon } from '@mui/icons-material';

const columnsConfig = {
  TODO: { id: 'TODO', title: 'A Fazer', className: 'todo' },
  ON_HOLD: { id: 'ON_HOLD', title: 'Em Pausa', className: 'paused' },
  IN_PROGRESS: { id: 'IN_PROGRESS', title: 'Em Progresso', className: 'doing' },
  DONE: { id: 'DONE', title: 'Concluído', className: 'done' }
};

const KanbanBoard = ({ tasks = [], onTaskMove, onTaskClick, onTaskDelete }) => {
  const [boardData, setBoardData] = useState({});
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuTask, setMenuTask] = useState(null);
  const [doneCollapsed, setDoneCollapsed] = useState(false);
  const [doneWindow, setDoneWindow] = useState(7); // dias: 7, 30, 0 (todas)
  const [doneLimit, setDoneLimit] = useState(10);

  // Theme context
  const { mode } = useContext(ThemeContext);
  const isDark = mode === 'dark';

  // Theme-aware colors
  const columnBg = isDark ? 'rgba(22, 29, 38, 0.6)' : '#f1f5f9';
  const cardBg = isDark ? 'rgba(30, 41, 59, 0.85)' : 'rgba(255, 255, 255, 0.95)';
  const cardBorder = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
  const cardShadow = isDark ? '0 4px 16px rgba(0, 0, 0, 0.3)' : '0 4px 12px rgba(0, 0, 0, 0.06)';
  const cardHoverShadow = isDark ? '0 8px 24px rgba(37, 99, 235, 0.2)' : '0 8px 24px rgba(37, 99, 235, 0.12)';
  const textPrimary = isDark ? '#f1f5f9' : '#0f172a';
  const textSecondary = isDark ? '#94a3b8' : '#64748b';
  const badgeBg = isDark ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0';
  const badgeText = isDark ? '#94a3b8' : '#64748b';
  const addBtnHover = isDark ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0';

  // Column configuration with icons and colors
  const columnConfig = {
    TODO: { icon: 'pending_actions', color: '#2563eb', gradient: 'linear-gradient(135deg, rgba(37, 99, 235, 0.15) 0%, transparent 100%)' },
    ON_HOLD: { icon: 'pause_circle', color: '#f59e0b', gradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, transparent 100%)' },
    IN_PROGRESS: { icon: 'autorenew', color: '#3b82f6', gradient: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, transparent 100%)' },
    DONE: { icon: 'check_circle', color: '#22c55e', gradient: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, transparent 100%)' }
  };

  useEffect(() => {
    setDoneLimit(10);
  }, [doneWindow]);

  useEffect(() => {
    const newBoard = {
      TODO: { ...columnsConfig.TODO, items: [] },
      ON_HOLD: { ...columnsConfig.ON_HOLD, items: [] },
      IN_PROGRESS: { ...columnsConfig.IN_PROGRESS, items: [] },
      DONE: { ...columnsConfig.DONE, items: [] }
    };

    tasks.forEach(task => {
      // Migrar REVIEW antigo para ON_HOLD
      let taskStatus = task.status;
      if (taskStatus === 'REVIEW') {
        taskStatus = 'ON_HOLD';
      }
      // Fallback para status padrão caso venha nulo ou inválido
      const status = newBoard[taskStatus] ? taskStatus : 'TODO';
      newBoard[status].items.push(task);
    });
    setBoardData(newBoard);
  }, [tasks]);

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const { source, destination } = result;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const sourceColumn = boardData[source.droppableId];
    const destColumn = boardData[destination.droppableId];
    const sourceItems = [...sourceColumn.items];
    const destItems = [...destColumn.items];

    const [removed] = sourceItems.splice(source.index, 1);
    const updatedTask = { ...removed, status: destination.droppableId };
    destItems.splice(destination.index, 0, updatedTask);

    setBoardData({
      ...boardData,
      [source.droppableId]: { ...sourceColumn, items: sourceItems },
      [destination.droppableId]: { ...destColumn, items: destItems }
    });

    if (onTaskMove) onTaskMove(updatedTask.id, destination.droppableId);
  };

  const handleMenuOpen = (event, task) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setMenuTask(task);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuTask(null);
  };

  // --- LÓGICA DE DATA UNIFICADA ---
  const getTaskDeadline = (task) => {
    return task.dueDate || task.endDate;
  };

  const getCompletedAt = (task) => {
    return task.completedAt || task.updatedAt || task.endDate || task.dueDate || task.createdAt;
  };

  const isOverdue = (task) => {
    const deadline = getTaskDeadline(task);
    if (!deadline) return false;
    if (task.status === 'DONE' || task.status === 'COMPLETED') return false;

    // Compara o início do dia de hoje com a data da tarefa
    return isAfter(startOfDay(new Date()), startOfDay(new Date(deadline)));
  };

  const getPriorityLabel = (p) => {
    const map = { HIGH: 'Alta', MEDIUM: 'Média', LOW: 'Baixa', CRITICAL: 'Crítica' };
    return map[p] || p;
  };

  // Helper para checklist stats (trazido do TaskKanban para compatibilidade se futuro)
  const getChecklistStats = (checklist) => {
    if (!checklist || !Array.isArray(checklist) || checklist.length === 0) return null;
    const total = checklist.length;
    const done = checklist.filter(i => i.done).length;
    const percent = Math.round((done / total) * 100);
    return { total, done, percent };
  };

  const doneTasks = boardData.DONE?.items || [];
  const doneFiltered = doneWindow > 0
    ? doneTasks.filter(task => {
      const completedAt = getCompletedAt(task);
      if (!completedAt) return false;
      const cutoff = Date.now() - (doneWindow * 24 * 60 * 60 * 1000);
      return new Date(completedAt).getTime() >= cutoff;
    })
    : doneTasks;
  const doneVisible = doneCollapsed ? [] : doneFiltered.slice(0, doneLimit);

  return (
    <>
      <DragDropContext onDragEnd={onDragEnd}>
        <Box sx={{ display: 'flex', gap: 2, width: '100%', alignItems: 'flex-start', minHeight: 'calc(100vh - 300px)' }}>
          {Object.entries(boardData).map(([columnId, column]) => {
            const isDoneColumn = columnId === 'DONE';
            const columnItems = isDoneColumn ? doneVisible : column.items;
            const totalDone = isDoneColumn ? doneTasks.length : column.items.length;
            const filteredDone = isDoneColumn ? doneFiltered.length : column.items.length;

            return (
              <Paper
                key={columnId}
                elevation={0}
                className="kanban-column"
                sx={{
                  flex: 1,
                  minWidth: 0,
                  bgcolor: columnBg,
                  backdropFilter: isDark ? 'blur(10px)' : 'none',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'transparent'}`,
                  borderRadius: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  maxHeight: 'calc(100vh - 250px)',
                  overflow: 'hidden',
                  transition: 'all 0.2s'
                }}
              >
                {/* HEADER COLUNA PREMIUM */}
                <Box sx={{
                  background: columnConfig[columnId]?.gradient,
                  borderBottom: `2px solid ${columnConfig[columnId]?.color}`,
                  p: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{
                      width: 32,
                      height: 32,
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: `${columnConfig[columnId]?.color}20`,
                      color: columnConfig[columnId]?.color
                    }}>
                      <span className="material-icons-round" style={{ fontSize: 18 }}>
                        {columnConfig[columnId]?.icon}
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
                      borderRadius: 2,
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: badgeText
                    }}>
                      {totalDone}
                    </Box>
                  </Box>
                  <Box
                    component="button"
                    onClick={() => onTaskClick && onTaskClick(null)}
                    sx={{
                      border: 'none',
                      bgcolor: 'transparent',
                      cursor: 'pointer',
                      color: textSecondary,
                      p: 0.75,
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s',
                      '&:hover': {
                        bgcolor: addBtnHover,
                        color: columnConfig[columnId]?.color,
                        transform: 'scale(1.1)'
                      }
                    }}
                  >
                    <span className="material-icons-round" style={{ fontSize: 20 }}>add</span>
                  </Box>
                </Box>

                {isDoneColumn && (
                  <Box sx={{
                    mx: 2,
                    mb: 1,
                    mt: 2,
                    p: 1.5,
                    bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                    borderRadius: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {[{ label: '7d', value: 7 }, { label: '30d', value: 30 }, { label: 'Todas', value: 0 }].map(option => (
                          <Box
                            key={option.value}
                            component="button"
                            onClick={() => setDoneWindow(option.value)}
                            sx={{
                              border: doneWindow === option.value ? '1px solid #2563eb' : `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`,
                              bgcolor: doneWindow === option.value ? 'rgba(37, 99, 235, 0.12)' : 'transparent',
                              color: doneWindow === option.value ? '#2563eb' : textSecondary,
                              px: 1.25,
                              py: 0.25,
                              borderRadius: 1.5,
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                          >
                            {option.label}
                          </Box>
                        ))}
                      </Box>
                      <Box
                        component="button"
                        onClick={() => setDoneCollapsed(prev => !prev)}
                        sx={{
                          border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`,
                          bgcolor: 'transparent',
                          color: textSecondary,
                          px: 1.25,
                          py: 0.25,
                          borderRadius: 1.5,
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          '&:hover': { bgcolor: addBtnHover }
                        }}
                      >
                        {doneCollapsed ? 'Mostrar' : 'Ocultar'}
                      </Box>
                    </Box>
                    {!doneCollapsed && (
                      <Typography variant="caption" color="text.secondary">
                        Mostrando {doneVisible.length} de {filteredDone}
                      </Typography>
                    )}
                  </Box>
                )}

                <Droppable droppableId={columnId}>
                  {(provided, droppableSnapshot) => (
                    <Box
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      sx={{
                        flex: 1,
                        overflowY: 'auto',
                        p: 2,
                        minHeight: 100,
                        bgcolor: droppableSnapshot.isDraggingOver
                          ? (isDark ? 'rgba(37, 99, 235, 0.1)' : 'rgba(37, 99, 235, 0.05)')
                          : 'transparent',
                        transition: 'background-color 0.2s',
                        borderRadius: '0 0 16px 16px'
                      }}
                    >
                      {/* Empty State */}
                      {columnItems.length === 0 && !droppableSnapshot.isDraggingOver && (
                        <Box sx={{
                          textAlign: 'center',
                          py: 6,
                          color: textSecondary,
                          opacity: 0.5
                        }}>
                          <span className="material-icons-round" style={{ fontSize: 48, opacity: 0.4 }}>
                            {columnId === 'DONE' ? 'celebration' : 'inbox'}
                          </span>
                          <Typography variant="body2" mt={1.5} fontWeight={500}>
                            {columnId === 'DONE' ? 'Nenhuma tarefa concluída' : 'Nenhuma tarefa'}
                          </Typography>
                          <Typography variant="caption" sx={{ color: textSecondary, opacity: 0.7 }}>
                            {columnId === 'TODO' ? 'Arraste tarefas aqui' : 'Mova tarefas para cá'}
                          </Typography>
                        </Box>
                      )}
                      {columnItems.map((item, index) => (
                        <Draggable key={item.id} draggableId={item.id} index={index}>
                          {(provided, snapshot) => {
                            const stats = getChecklistStats(item.checklist);
                            const deadline = getTaskDeadline(item);
                            const overdue = isOverdue(item);

                            return (
                              <Paper
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                onClick={() => onTaskClick && onTaskClick(item)}
                                elevation={0}
                                sx={{
                                  mb: 2,
                                  p: 2,
                                  borderRadius: '16px',
                                  bgcolor: cardBg,
                                  backdropFilter: 'blur(8px)',
                                  border: `1px solid ${snapshot.isDragging ? '#2563eb' : cardBorder}`,
                                  boxShadow: snapshot.isDragging
                                    ? '0 12px 32px rgba(37, 99, 235, 0.25)'
                                    : cardShadow,
                                  cursor: snapshot.isDragging ? 'grabbing' : 'grab',
                                  userSelect: 'none',
                                  transition: 'all 0.2s ease',
                                  transform: snapshot.isDragging ? 'rotate(3deg)' : 'none',
                                  '&:hover': {
                                    borderColor: isDark ? 'rgba(37, 99, 235, 0.5)' : 'rgba(37, 99, 235, 0.3)',
                                    boxShadow: cardHoverShadow,
                                    transform: 'translateY(-2px)'
                                  },
                                  position: 'relative'
                                }}
                              >
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                    {/* Prioridade */}
                                    <Box sx={{
                                      px: 1, py: 0.2, borderRadius: 1, fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
                                      bgcolor: item.priority === 'CRITICAL' ? '#fee2e2' : item.priority === 'HIGH' ? '#ffedd5' : item.priority === 'MEDIUM' ? '#e0f2fe' : '#f1f5f9',
                                      color: item.priority === 'CRITICAL' ? '#991b1b' : item.priority === 'HIGH' ? '#9a3412' : item.priority === 'MEDIUM' ? '#075985' : '#64748b'
                                    }}>
                                      {getPriorityLabel(item.priority)}
                                    </Box>
                                    {/* Story Points (específico de Projetos) */}
                                    {item.storyPoints && (
                                      <Box sx={{
                                        px: 1, py: 0.2, borderRadius: 1, fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
                                        bgcolor: 'rgba(37, 99, 235, 0.1)', color: '#2563eb'
                                      }}>
                                        {item.storyPoints} PTS
                                      </Box>
                                    )}
                                  </Box>
                                  <IconButton
                                    size="small"
                                    onClick={(e) => handleMenuOpen(e, item)}
                                    sx={{
                                      color: textSecondary,
                                      p: 0,
                                      '&:hover': { color: textPrimary }
                                    }}
                                  >
                                    <MoreIcon fontSize="small" />
                                  </IconButton>
                                </Box>

                                <Typography variant="subtitle2" fontWeight="700" color="text.primary" sx={{ mb: 1, lineHeight: 1.3 }}>
                                  {item.title}
                                </Typography>

                                {stats && (
                                  <Box sx={{ mb: 2 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                                      <Typography variant="caption" color="text.secondary" fontWeight="600" fontSize="0.7rem">Checklist</Typography>
                                      <Typography variant="caption" color="text.primary" fontWeight="700" fontSize="0.7rem">{stats.done}/{stats.total}</Typography>
                                    </Box>
                                    <Box sx={{ width: '100%', height: 4, bgcolor: isDark ? 'rgba(255,255,255,0.1)' : '#f1f5f9', borderRadius: 2, overflow: 'hidden' }}>
                                      <Box sx={{ width: `${stats.percent}%`, height: '100%', bgcolor: stats.percent === 100 ? '#22c55e' : '#3b82f6', transition: 'width 0.3s ease' }} />
                                    </Box>
                                  </Box>
                                )}

                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 'auto' }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    {item.assignee ? (
                                      <Tooltip title={`Responsável: ${item.assignee.name}`}>
                                        <Box sx={{
                                          width: 24, height: 24, borderRadius: '50%',
                                          bgcolor: isDark ? 'rgba(37, 99, 235, 0.2)' : '#e0e7ff',
                                          color: isDark ? '#a5b4fc' : '#1e40af',
                                          fontSize: '0.75rem', fontWeight: 'bold',
                                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}>
                                          {item.assignee.name.charAt(0)}
                                        </Box>
                                      </Tooltip>
                                    ) : (
                                      <Tooltip title="Não atribuído">
                                        <Box sx={{
                                          width: 24, height: 24, borderRadius: '50%',
                                          bgcolor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#f1f5f9',
                                          color: textSecondary,
                                          fontSize: '0.75rem', fontWeight: 'bold',
                                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}>
                                          ?
                                        </Box>
                                      </Tooltip>
                                    )}

                                    {item.assignee && (
                                      <Typography variant="caption" color="text.secondary" fontWeight="500">
                                        {item.assignee.name.split(' ')[0]}
                                      </Typography>
                                    )}
                                  </Box>

                                  {(deadline || item.status === 'DONE') && (
                                    <Box sx={{
                                      px: 1, py: 0.3, borderRadius: 1.5,
                                      bgcolor: item.status === 'DONE'
                                        ? (isDark ? 'rgba(34, 197, 94, 0.15)' : '#dcfce7')
                                        : overdue
                                          ? (isDark ? 'rgba(239, 68, 68, 0.15)' : '#fee2e2')
                                          : badgeBg,
                                      color: item.status === 'DONE'
                                        ? (isDark ? '#4ade80' : '#166534')
                                        : overdue
                                          ? (isDark ? '#f87171' : '#991b1b')
                                          : textSecondary,
                                      fontSize: '0.7rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5
                                    }}>
                                      {item.status === 'DONE' ? 'Entregue' : format(new Date(deadline), 'dd/MM')}
                                    </Box>
                                  )}
                                </Box>
                              </Paper>
                            );
                          }}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </Box>
                  )}
                </Droppable>

                {isDoneColumn && !doneCollapsed && doneFiltered.length > doneVisible.length && (
                  <Box sx={{ mt: 1 }}>
                    <Box
                      component="button"
                      onClick={() => setDoneLimit(prev => prev + 10)}
                      sx={{
                        width: '100%',
                        border: '1px dashed #cbd5e1',
                        bgcolor: 'transparent',
                        color: '#64748b',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        borderRadius: 2,
                        py: 0.75,
                        cursor: 'pointer',
                        '&:hover': { color: '#2563eb', borderColor: '#2563eb' }
                      }}
                    >
                      Ver mais
                    </Box>
                  </Box>
                )}
              </Paper>
            )
          })}
        </Box>
      </DragDropContext>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={() => { onTaskClick && onTaskClick(menuTask); handleMenuClose(); }}>
          <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Editar</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { onTaskDelete && onTaskDelete(menuTask.id); handleMenuClose(); }}>
          <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
          <ListItemText sx={{ color: 'error.main' }}>Excluir</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};

export default KanbanBoard;