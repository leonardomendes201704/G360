import { useState, useEffect, useContext } from 'react';
import { ThemeContext } from '../../contexts/ThemeContext';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { format, startOfDay } from 'date-fns';
import { Menu, MenuItem, ListItemIcon, ListItemText, Box, Paper, Typography, Tooltip } from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';

/* ── Column config with reference-image–inspired colors ── */
const columnsConfig = {
  TODO: { id: 'TODO', title: 'Pendentes', className: 'todo' },
  ON_HOLD: { id: 'ON_HOLD', title: 'Em Pausa', className: 'paused' },
  IN_PROGRESS: { id: 'IN_PROGRESS', title: 'Em Andamento', className: 'doing' },
  DONE: { id: 'DONE', title: 'Concluídas', className: 'done' },
  CANCELLED: { id: 'CANCELLED', title: 'Canceladas', className: 'cancelled' }
};

const columnTheme = {
  TODO: { icon: 'schedule', color: '#f59e0b', headerIcon: '⏳', bgTint: 'rgba(245, 158, 11, 0.08)' },
  ON_HOLD: { icon: 'pause_circle', color: '#f97316', headerIcon: '⏸️', bgTint: 'rgba(249, 115, 22, 0.08)' },
  IN_PROGRESS: { icon: 'autorenew', color: '#ec4899', headerIcon: '⚙️', bgTint: 'rgba(236, 72, 153, 0.08)' },
  DONE: { icon: 'check_circle', color: '#22c55e', headerIcon: '✅', bgTint: 'rgba(34, 197, 94, 0.08)' },
  CANCELLED: { icon: 'block', color: '#94a3b8', headerIcon: '🚫', bgTint: 'rgba(148, 163, 184, 0.08)' }
};

/** Densidade ~67% (passos cumulativos de ~5% sobre layout base compacto) */
const K = {
  boardGap: 1.25,
  colMaxH: 'calc(100vh - 200px)',
  headerPx: 1.25,
  headerPy: 0.875,
  iconBox: 20,
  iconMat: 12,
  titleFs: '0.62rem',
  badge: 16,
  badgeFs: '0.53125rem',
  addBtn: 22,
  dropPx: 1,
  dropPy: 0.75,
  dropMinH: 56,
  cardMb: 0.75,
  cardPad: '8px 10px',
  cardTitleFs: '0.62rem',
  cardDescFs: '0.57rem',
  chipFs: '0.5rem',
  chipIcon: 9,
  openBtn: 20,
  emptyIcon: 27,
  footerTagFs: '0.53125rem',
  loadMoreFs: '0.62rem',
};

const TaskKanban = ({ tasks = [], onTaskMove, onTaskClick, onTaskDelete, activeTimerTaskId, onTimerToggle, currentUserId }) => {
  const [boardData, setBoardData] = useState({});
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuTask, setMenuTask] = useState(null);
  const [doneCollapsed, setDoneCollapsed] = useState(false);
  const [doneWindow, setDoneWindow] = useState(7);
  const [doneLimit, setDoneLimit] = useState(10);

  const { mode } = useContext(ThemeContext);
  const isDark = mode === 'dark';

  /* ── Theme-aware tokens ── */
  const pageBg = isDark ? '#0f1419' : '#f0f4f8';
  const colBg = isDark ? 'rgba(22, 29, 38, 0.55)' : '#ffffff';
  const colBorder = isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #e2e8f0';
  const cardBg = isDark ? 'rgba(30, 41, 59, 0.9)' : '#ffffff';
  const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : '#e8ecf1';
  const cardShadow = isDark ? '0 2px 8px rgba(0,0,0,0.25)' : '0 2px 8px rgba(0,0,0,0.06)';
  const cardHover = isDark ? '0 6px 20px rgba(0,0,0,0.35)' : '0 6px 20px rgba(0,0,0,0.1)';
  const textPrimary = isDark ? '#f1f5f9' : '#1e293b';
  const textSecondary = isDark ? '#94a3b8' : '#64748b';
  const textMuted = isDark ? '#64748b' : '#94a3b8';
  const headerBg = isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc';
  const headerBorder = isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0';
  const iconBtnHover = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';

  /* ── Effects ── */
  useEffect(() => { setDoneLimit(10); }, [doneWindow]);

  useEffect(() => {
    const newBoard = {
      TODO: { ...columnsConfig.TODO, items: [] },
      ON_HOLD: { ...columnsConfig.ON_HOLD, items: [] },
      IN_PROGRESS: { ...columnsConfig.IN_PROGRESS, items: [] },
      DONE: { ...columnsConfig.DONE, items: [] },
      CANCELLED: { ...columnsConfig.CANCELLED, items: [] }
    };
    tasks.forEach(task => {
      let taskStatus = task.status;
      if (taskStatus === 'REVIEW') taskStatus = 'ON_HOLD';
      const status = newBoard[taskStatus] ? taskStatus : 'TODO';
      newBoard[status].items.push(task);
    });
    setBoardData(newBoard);
  }, [tasks]);

  /* ── Drag & Drop ── */
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

  /* ── Context menu ── */
  const handleMenuOpen = (event, task) => { event.stopPropagation(); setAnchorEl(event.currentTarget); setMenuTask(task); };
  const handleMenuClose = () => { setAnchorEl(null); setMenuTask(null); };

  /* ── Date helpers ── */
  const getTaskDeadline = (task) => task.dueDate || task.endDate;
  const getCompletedAt = (task) => task.completedAt || task.updatedAt || task.endDate || task.dueDate || task.createdAt;

  const isOverdue = (task) => {
    const deadline = getTaskDeadline(task);
    if (!deadline) return false;
    if (task.status === 'DONE' || task.status === 'COMPLETED' || task.status === 'CANCELLED') return false;
    return startOfDay(new Date(deadline)) < startOfDay(new Date());
  };

  const getPriorityLabel = (p) => ({ HIGH: 'Alta', MEDIUM: 'Média', LOW: 'Baixa', CRITICAL: 'Crítica' }[p] || p);

  const getChecklistStats = (task) => {
    const checklist = task.checklist;
    if (checklist && Array.isArray(checklist) && checklist.length > 0) {
      const total = checklist.length;
      const done = checklist.filter(i => i.done || i.completed).length;
      return { type: 'checklist', total, done, percent: Math.round((done / total) * 100) };
    } else if (task.progress !== undefined && task.progress !== null) {
      return { type: 'progress', percent: Number(task.progress) };
    }
    return null;
  };

  /* ── Done column filtering ── */
  const doneTasks = boardData.DONE?.items || [];
  const doneFiltered = doneWindow > 0
    ? doneTasks.filter(task => {
      const completedAt = getCompletedAt(task);
      if (!completedAt) return false;
      return new Date(completedAt).getTime() >= Date.now() - (doneWindow * 86400000);
    })
    : doneTasks;
  const doneVisible = doneCollapsed ? [] : doneFiltered.slice(0, doneLimit);

  /* ── Render ── */
  return (
    <>
      <DragDropContext onDragEnd={onDragEnd}>
        <Box sx={{
          display: 'flex',
          gap: K.boardGap,
          width: '100%',
          alignItems: 'flex-start',
          minHeight: 'calc(100vh - 236px)'
        }}>
          {Object.entries(boardData).map(([columnId, column]) => {
            const isDoneColumn = columnId === 'DONE';
            const columnItems = isDoneColumn ? doneVisible : column.items;
            const totalDone = isDoneColumn ? doneTasks.length : column.items.length;
            const filteredDone = isDoneColumn ? doneFiltered.length : column.items.length;
            const theme = columnTheme[columnId];

            return (
              <Paper
                key={columnId}
                elevation={0}
                sx={{
                  flex: 1,
                  minWidth: 0,
                  bgcolor: colBg,
                  border: colBorder,
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  maxHeight: K.colMaxH,
                  overflow: 'hidden',
                  transition: 'all 0.25s ease'
                }}
              >
                {/* ═══ COLUMN HEADER — inspired by reference image ═══ */}
                <Box sx={{
                  px: K.headerPx,
                  py: K.headerPy,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  bgcolor: headerBg,
                  borderBottom: `1px solid ${headerBorder}`
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {/* Status icon */}
                    <Box sx={{
                      width: K.iconBox,
                      height: K.iconBox,
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: `${theme.color}18`,
                      color: theme.color
                    }}>
                      <span className="material-icons-round" style={{ fontSize: K.iconMat }}>
                        {theme.icon}
                      </span>
                    </Box>
                    <Typography sx={{
                      fontSize: K.titleFs,
                      fontWeight: 700,
                      color: textPrimary,
                      letterSpacing: '0.2px'
                    }}>
                      {column.title}
                    </Typography>
                    {/* Count badge */}
                    <Box sx={{
                      minWidth: K.badge,
                      height: K.badge,
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: `${theme.color}15`,
                      color: theme.color,
                      fontSize: K.badgeFs,
                      fontWeight: 700,
                      px: 0.5
                    }}>
                      {totalDone}
                    </Box>
                  </Box>
                  {/* Add button */}
                  <Tooltip title="Nova tarefa" arrow placement="top">
                    <Box
                      component="button"
                      onClick={() => onTaskClick(null)}
                      sx={{
                        width: K.addBtn,
                        height: K.addBtn,
                        border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.12)' : '#d1d5db'}`,
                        borderRadius: '8px',
                        bgcolor: 'transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: textMuted,
                        transition: 'all 0.2s',
                        '&:hover': {
                          borderColor: theme.color,
                          color: theme.color,
                          bgcolor: `${theme.color}10`,
                          transform: 'scale(1.1)'
                        }
                      }}
                    >
                      <span className="material-icons-round" style={{ fontSize: K.iconMat }}>add</span>
                    </Box>
                  </Tooltip>
                </Box>

                {/* ═══ DONE COLUMN FILTERS ═══ */}
                {isDoneColumn && (
                  <Box sx={{
                    mx: 1.125, mt: 0.875, mb: 0.125, p: 0.875,
                    bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                    borderRadius: '6px',
                    display: 'flex', flexDirection: 'column', gap: 0.375
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                      <Box sx={{ display: 'flex', gap: 0.75 }}>
                        {[{ label: '7d', value: 7 }, { label: '30d', value: 30 }, { label: 'Todas', value: 0 }].map(option => (
                          <Box
                            key={option.value}
                            component="button"
                            onClick={() => setDoneWindow(option.value)}
                            sx={{
                              border: doneWindow === option.value ? `1.5px solid ${theme.color}` : `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`,
                              bgcolor: doneWindow === option.value ? `${theme.color}12` : 'transparent',
                              color: doneWindow === option.value ? theme.color : textSecondary,
                              px: 0.875, py: 0.125,
                              borderRadius: '6px',
                              fontSize: K.chipFs, fontWeight: 700,
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
                          bgcolor: 'transparent', color: textSecondary,
                          px: 0.875, py: 0.125, borderRadius: '6px',
                          fontSize: K.chipFs, fontWeight: 700,
                          cursor: 'pointer', transition: 'all 0.2s',
                          '&:hover': { bgcolor: iconBtnHover }
                        }}
                      >
                        {doneCollapsed ? 'Mostrar' : 'Ocultar'}
                      </Box>
                    </Box>
                    {!doneCollapsed && (
                      <Typography variant="caption" sx={{ color: textMuted, fontSize: K.chipFs }}>
                        Mostrando {doneVisible.length} de {filteredDone}
                      </Typography>
                    )}
                  </Box>
                )}

                {/* ═══ DROPPABLE AREA ═══ */}
                <Droppable droppableId={columnId}>
                  {(provided, droppableSnapshot) => (
                    <Box
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      sx={{
                        flex: 1,
                        overflowY: 'auto',
                        px: K.dropPx,
                        py: K.dropPy,
                        minHeight: K.dropMinH,
                        bgcolor: droppableSnapshot.isDraggingOver
                          ? (isDark ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.04)')
                          : 'transparent',
                        transition: 'background-color 0.2s',
                        borderRadius: '8px',
                        /* Custom scrollbar */
                        '&::-webkit-scrollbar': { width: 6 },
                        '&::-webkit-scrollbar-track': { background: 'transparent' },
                        '&::-webkit-scrollbar-thumb': {
                          background: isDark ? 'rgba(255,255,255,0.1)' : '#d1d5db',
                          borderRadius: '8px'}
                      }}
                    >
                      {/* Empty State */}
                      {columnItems.length === 0 && !droppableSnapshot.isDraggingOver && (
                        <Box sx={{ textAlign: 'center', py: 2.25, opacity: 0.45 }}>
                          <span className="material-icons-round" style={{ fontSize: K.emptyIcon, color: textMuted }}>
                            {columnId === 'DONE' ? 'celebration' : 'inbox'}
                          </span>
                          <Typography variant="caption" display="block" mt={0.5} fontWeight={600} sx={{ fontSize: K.cardDescFs }} color={textMuted}>
                            {columnId === 'DONE' ? 'Nenhuma concluída' : 'Nenhuma tarefa'}
                          </Typography>
                          <Typography variant="caption" sx={{ color: textMuted, opacity: 0.7, fontSize: K.chipFs }}>
                            Arraste tarefas para cá
                          </Typography>
                        </Box>
                      )}

                      {/* ═══ TASK CARDS — matching DraggableTaskCard style ═══ */}
                      {columnItems.map((item, index) => (
                        <Draggable key={item.id} draggableId={item.id} index={index}>
                          {(provided, snapshot) => {
                            const stats = getChecklistStats(item);
                            const deadline = getTaskDeadline(item);
                            const overdue = isOverdue(item);
                            const assignee = item.assignee;
                            const colColor = theme.color;
                            const statusBg = colColor;

                            const getPriorityStyle = (priority) => {
                              switch (priority?.toUpperCase()) {
                                case 'CRITICAL': return { bg: '#ef4444', label: 'Crítica', icon: 'error' };
                                case 'HIGH': return { bg: '#f43f5e', label: 'Alta', icon: 'arrow_upward' };
                                case 'MEDIUM': return { bg: '#f59e0b', label: 'Média', icon: 'remove' };
                                case 'LOW': return { bg: '#10b981', label: 'Baixa', icon: 'arrow_downward' };
                                default: return { bg: '#64748b', label: priority, icon: 'remove' };
                              }
                            };

                            const getTagColor = (tag) => {
                              const t = tag?.toLowerCase() || '';
                              if (t.includes('frontend') || t.includes('ui')) return { bg: 'rgba(6,182,212,0.15)', color: '#06b6d4' };
                              if (t.includes('backend') || t.includes('api') || t.includes('devops')) return { bg: 'rgba(59,130,246,0.15)', color: '#3b82f6' };
                              if (t.includes('design') || t.includes('ux')) return { bg: 'rgba(244,63,94,0.15)', color: '#f43f5e' };
                              if (t.includes('doc')) return { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' };
                              if (t.includes('bug') || t.includes('fix')) return { bg: 'rgba(244,63,94,0.15)', color: '#f43f5e' };
                              return { bg: 'rgba(37,99,235,0.15)', color: '#2563eb' };
                            };

                            const getDueStatus = (dueDate) => {
                              if (!dueDate) return null;
                              const date = startOfDay(new Date(dueDate));
                              const today = startOfDay(new Date());
                              if (date < today) return { color: '#f43f5e', label: 'Atrasada', icon: 'warning' };
                              if (date <= new Date(today.getTime() + 3 * 86400000)) return { color: '#f59e0b', label: format(date, 'dd MMM'), icon: 'schedule' };
                              return { color: textMuted, label: format(date, 'dd MMM'), icon: 'event' };
                            };

                            const priorityStyle = getPriorityStyle(item.priority);
                            const dueStatus = item.status === 'DONE' ? null : getDueStatus(deadline);
                            const progressBg = isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0';

                            return (
                              <Paper
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                elevation={0}
                                className="animate-card-enter"
                                sx={{
                                  mb: K.cardMb,
                                  background: cardBg,
                                  border: `1px solid ${snapshot.isDragging ? '#2563eb' : cardBorder}`,
                                  borderRadius: '6px',
                                  borderLeft: `2px solid ${statusBg}`,
                                  padding: K.cardPad,
                                  cursor: snapshot.isDragging ? 'grabbing' : 'grab',
                                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                  position: 'relative',
                                  userSelect: 'none',
                                  transform: snapshot.isDragging ? 'rotate(2deg)' : 'none',
                                  boxShadow: snapshot.isDragging ? '0 12px 32px rgba(37,99,235,0.25)' : cardShadow,
                                  '&:hover': {
                                    borderColor: 'rgba(37, 99, 235, 0.3)',
                                    borderLeftColor: statusBg,
                                    transform: snapshot.isDragging ? 'none' : 'translateY(-2px)',
                                    boxShadow: cardHover,
                                    '& .card-open-btn': { opacity: 1, transform: 'scale(1)' },
                                  },
                                }}
                              >
                                {/* Header: Title + Open Button */}
                                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 0.75, mb: 0.5 }}>
                                  <Typography sx={{ fontSize: K.cardTitleFs, fontWeight: 600, color: textPrimary, lineHeight: 1.35, flex: 1 }}>
                                    {item.title || item.name}
                                  </Typography>
                                  <Box
                                    className="card-open-btn"
                                    onClick={(e) => { e.stopPropagation(); onTaskClick(item); }}
                                    sx={{
                                      width: K.openBtn, height: K.openBtn, borderRadius: '6px',
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      cursor: 'pointer', transition: 'all 0.2s',
                                      opacity: 0, transform: 'scale(0.8)',
                                      background: 'rgba(37, 99, 235, 0.1)', flexShrink: 0,
                                      '&:hover': { background: 'rgba(37, 99, 235, 0.2)' },
                                    }}
                                    title="Abrir tarefa"
                                  >
                                    <span className="material-icons-round" style={{ fontSize: K.iconMat, color: '#2563eb' }}>open_in_new</span>
                                  </Box>
                                </Box>

                                {/* Description */}
                                {item.description && (
                                  <Typography sx={{
                                    fontSize: K.cardDescFs, color: textSecondary, mb: 0.75, lineHeight: 1.45,
                                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                                  }}>
                                    {item.description}
                                  </Typography>
                                )}

                                {/* Badges: Priority + Tags */}
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.375, mb: 0.75 }}>
                                  {item.priority && (
                                    <Box sx={{
                                      display: 'inline-flex', alignItems: 'center', gap: 0.25,
                                      px: 0.75, py: 0.125, borderRadius: '6px',
                                      background: `${priorityStyle.bg}18`, border: `1px solid ${priorityStyle.bg}35`,
                                    }}>
                                      <span className="material-icons-round" style={{ fontSize: K.chipIcon, color: priorityStyle.bg }}>{priorityStyle.icon}</span>
                                      <Typography sx={{ fontSize: K.chipFs, fontWeight: 600, color: priorityStyle.bg, lineHeight: 1.2 }}>{priorityStyle.label}</Typography>
                                    </Box>
                                  )}
                                  {item.tags && item.tags.length > 0 && item.tags.slice(0, 2).map((tag, idx) => {
                                    const tagStyle = getTagColor(tag);
                                    return (
                                      <Box key={idx} sx={{
                                        display: 'inline-flex', alignItems: 'center',
                                        px: 0.75, py: 0.125, borderRadius: '6px', background: tagStyle.bg,
                                      }}>
                                        <Typography sx={{ fontSize: K.chipFs, fontWeight: 600, color: tagStyle.color, lineHeight: 1.2 }}>{tag}</Typography>
                                      </Box>
                                    );
                                  })}
                                </Box>

                                {/* Progress Bar */}
                                {stats && (
                                  <Box sx={{ mb: 0.75 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.25 }}>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                                        <span className="material-icons-round" style={{ fontSize: K.chipIcon, color: textSecondary }}>
                                          {stats.type === 'checklist' ? 'checklist' : 'trending_up'}
                                        </span>
                                        <Typography sx={{ fontSize: K.chipFs, color: textSecondary }}>
                                          {stats.type === 'checklist' ? `${stats.done}/${stats.total}` : 'Progresso'}
                                        </Typography>
                                      </Box>
                                      <Typography sx={{ fontSize: K.chipFs, fontWeight: 600, color: stats.percent === 100 ? '#22c55e' : '#2563eb' }}>
                                        {stats.percent}%
                                      </Typography>
                                    </Box>
                                    <Box sx={{ height: '2px', borderRadius: '4px', bgcolor: progressBg, overflow: 'hidden' }}>
                                      <Box sx={{
                                        width: `${stats.percent}%`, height: '100%',
                                        background: stats.percent === 100
                                          ? 'linear-gradient(90deg, #22c55e 0%, #10b981 100%)'
                                          : 'linear-gradient(90deg, #2563eb 0%, #3b82f6 100%)',
                                        transition: 'width 0.3s ease',
                                      }} />
                                    </Box>
                                  </Box>
                                )}

                                {/* Footer: Assignee row */}
                                <Box sx={{
                                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                  flexWrap: 'wrap', gap: 0.5,
                                  pt: 0.75, borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                                }}>
                                  {/* Assignee */}
                                  {assignee ? (
                                    <Box sx={{
                                      display: 'flex', alignItems: 'center', gap: 0.25,
                                      bgcolor: isDark ? 'rgba(37,99,235,0.1)' : '#eff6ff',
                                      px: 0.5, py: 0.125, borderRadius: '6px',
                                      border: `1px solid ${isDark ? 'rgba(37,99,235,0.2)' : '#bfdbfe'}`,
                                      minWidth: 0,
                                    }}>
                                      <span className="material-icons-round" style={{ fontSize: K.chipIcon, color: '#3b82f6', flexShrink: 0 }}>person</span>
                                      <Typography sx={{ fontSize: K.chipFs, fontWeight: 600, color: isDark ? '#60a5fa' : '#2563eb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100px', lineHeight: 1.2 }}>
                                        {(() => {
                                          const name = assignee.name || assignee.email || 'N/A';
                                          const parts = name.trim().split(/\s+/);
                                          return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0];
                                        })()}
                                      </Typography>
                                    </Box>
                                  ) : (
                                    <Typography sx={{ fontSize: K.chipFs, color: textSecondary, fontStyle: 'italic' }}>Não atribuído</Typography>
                                  )}

                                  {/* Right side: Timer + Due Date */}
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 'auto' }}>
                                    {/* Timer Play Button — unique to general tasks */}
                                    {assignee?.id === currentUserId && onTimerToggle && (
                                      <Tooltip title={activeTimerTaskId === item.id ? 'Parar timer' : 'Iniciar timer'} arrow>
                                        <Box
                                          component="button"
                                          onClick={(e) => { e.stopPropagation(); onTimerToggle(item); }}
                                          sx={{
                                            border: 'none',
                                            bgcolor: activeTimerTaskId === item.id ? 'rgba(16,185,129,0.15)' : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
                                            cursor: 'pointer', p: 0.4, borderRadius: '8px',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: activeTimerTaskId === item.id ? '#10b981' : textMuted,
                                            transition: 'all 0.2s',
                                            flexShrink: 0,
                                            animation: activeTimerTaskId === item.id ? 'timerPulse 1.5s ease-in-out infinite' : 'none',
                                            '@keyframes timerPulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.6 } },
                                            '&:hover': {
                                              bgcolor: activeTimerTaskId === item.id ? 'rgba(239,68,68,0.15)' : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'),
                                              color: activeTimerTaskId === item.id ? '#ef4444' : '#2563eb'
                                            }
                                          }}
                                        >
                                          <span className="material-icons-round" style={{ fontSize: K.chipIcon + 1 }}>
                                            {activeTimerTaskId === item.id ? 'stop' : 'play_arrow'}
                                          </span>
                                        </Box>
                                      </Tooltip>
                                    )}

                                    {/* Due Date */}
                                    {item.status === 'DONE' ? (
                                      <Box sx={{
                                        display: 'flex', alignItems: 'center', gap: 0.3,
                                        px: 0.6, py: 0.2, borderRadius: '8px',
                                        background: 'rgba(34, 197, 94, 0.15)',
                                      }}>
                                        <span className="material-icons-round" style={{ fontSize: K.chipIcon, color: '#4ade80' }}>check_circle</span>
                                        <Typography sx={{ fontSize: K.footerTagFs, fontWeight: 600, color: '#4ade80', textTransform: 'uppercase' }}>Entregue</Typography>
                                      </Box>
                                    ) : dueStatus && (
                                      <Box sx={{
                                        display: 'flex', alignItems: 'center', gap: 0.3,
                                        px: 0.6, py: 0.2, borderRadius: '8px',
                                        background: `${dueStatus.color}15`,
                                      }}>
                                        <span className="material-icons-round" style={{ fontSize: K.chipIcon, color: dueStatus.color }}>{dueStatus.icon}</span>
                                        <Typography sx={{ fontSize: K.footerTagFs, fontWeight: 500, color: dueStatus.color }}>{dueStatus.label}</Typography>
                                      </Box>
                                    )}
                                  </Box>
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

                {/* Load more for Done column */}
                {isDoneColumn && !doneCollapsed && doneFiltered.length > doneVisible.length && (
                  <Box sx={{ px: K.dropPx, pb: 1.125 }}>
                    <Box
                      component="button"
                      onClick={() => setDoneLimit(prev => prev + 10)}
                      sx={{
                        width: '100%',
                        border: `1.5px dashed ${isDark ? 'rgba(255,255,255,0.12)' : '#cbd5e1'}`,
                        bgcolor: 'transparent',
                        color: textMuted,
                        fontSize: K.loadMoreFs, fontWeight: 700,
                        borderRadius: '6px', py: 0.4,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': { color: theme.color, borderColor: theme.color }
                      }}
                    >
                      Ver mais ({doneFiltered.length - doneVisible.length} restantes)
                    </Box>
                  </Box>
                )}
              </Paper>
            );
          })}
        </Box>
      </DragDropContext>

      {/* Context Menu */}
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
            minWidth: 160
          }
        }}
      >
        <MenuItem onClick={(e) => { e.stopPropagation(); onTaskClick(menuTask); handleMenuClose(); }} sx={{ borderRadius: '8px', mx: 0.5 }}>
          <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Editar</ListItemText>
        </MenuItem>
        <MenuItem onClick={(e) => { e.stopPropagation(); onTaskDelete(menuTask.id); handleMenuClose(); }} sx={{ borderRadius: '8px', mx: 0.5 }}>
          <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
          <ListItemText sx={{ color: 'error.main' }}>Excluir</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};

export default TaskKanban;
