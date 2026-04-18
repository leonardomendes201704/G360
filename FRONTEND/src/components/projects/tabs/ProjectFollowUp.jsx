import { useState, useEffect, useMemo, useContext } from 'react';
import { Box, Typography, Button, Select, MenuItem, TextField, InputAdornment, FormControl, CircularProgress, IconButton } from '@mui/material';
import { useSnackbar } from 'notistack';
import { format, isToday, isPast, isFuture, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addDays, subDays, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ThemeContext } from '../../../contexts/ThemeContext';
import { getFollowUps, deleteFollowUp, completeFollowUp, rescheduleFollowUp } from '../../../services/project-details.service';
import FollowUpModal from '../../modals/FollowUpModal';
import ConfirmDialog from '../../common/ConfirmDialog';
import RescheduleModal from '../../modals/RescheduleModal';

const TYPE_CONFIG = {
  STATUS_REPORT: { label: 'Status', icon: 'analytics', color: '#2563eb' },
  MEETING: { label: 'Reunião', icon: 'videocam', color: '#0ea5e9' },
  CALL: { label: 'Ligação', icon: 'call', color: '#10b981' },
  EMAIL: { label: 'E-mail', icon: 'email', color: '#f59e0b' },
  REVIEW: { label: 'Revisão', icon: 'rate_review', color: '#3b82f6' },
  TASK: { label: 'Tarefa', icon: 'task_alt', color: '#14b8a6' }
};

const PRIORITY_CONFIG = {
  HIGH: { label: 'Alta', color: '#f43f5e' },
  MEDIUM: { label: 'Média', color: '#f59e0b' },
  LOW: { label: 'Baixa', color: '#10b981' }
};

const ProjectFollowUp = ({ projectId, projectMembers = [] }) => {
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

  const cardStyle = {
    background: isDark ? 'linear-gradient(145deg, #1a222d 0%, #151c25 100%)' : '#FFFFFF',
    border: cardBorder,
    borderRadius: '8px',
    boxShadow: cardShadow
  };

  const selectSx = {
    bgcolor: surfaceBg,
    border: `1px solid ${borderSubtle}`,
    borderRadius: '8px',
    fontSize: '13px',
    color: textPrimary,
    minWidth: '130px',
    '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
    '&:hover': { borderColor: 'rgba(37, 99, 235, 0.3)' },
    '& .MuiSelect-icon': { color: textMuted }
  };
  const [followUps, setFollowUps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedFollowUp, setSelectedFollowUp] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null });
  const [filters, setFilters] = useState({ type: '', status: '', priority: '', responsible: '', search: '' });
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  // Reschedule Modal State
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [rescheduleTargetId, setRescheduleTargetId] = useState(null);
  const [rescheduleCurrentDate, setRescheduleCurrentDate] = useState(null);

  // Map project members to users format for filters and modal
  const users = useMemo(() => {
    return projectMembers.map(member => ({
      id: member.userId || member.user?.id,
      name: member.user?.name || member.name || 'Membro'
    })).filter(u => u.id);
  }, [projectMembers]);
  const { enqueueSnackbar } = useSnackbar();

  const fetchData = async () => {
    try {
      setLoading(true);
      const followUpsData = await getFollowUps(projectId);
      setFollowUps(followUpsData);
    } catch (error) {
      console.error(error);
      enqueueSnackbar('Erro ao carregar dados', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (projectId) fetchData(); }, [projectId]);

  const getComputedStatus = (item) => {
    if (item.completedAt || item.status === 'COMPLETED') return 'COMPLETED';
    if (!item.dueDate) return 'PENDING';
    const dueDate = new Date(item.dueDate);
    if (isPast(dueDate) && !isToday(dueDate)) return 'OVERDUE';
    if (isToday(dueDate)) return 'PENDING';
    return 'SCHEDULED';
  };

  const processedFollowUps = useMemo(() => {
    return followUps
      .map(fu => ({ ...fu, computedStatus: getComputedStatus(fu) }))
      .filter(fu => {
        if (filters.type && fu.type !== filters.type) return false;
        if (filters.status && fu.computedStatus !== filters.status) return false;
        if (filters.priority && fu.priority !== filters.priority) return false;
        if (filters.responsible && fu.assignee?.id !== filters.responsible && fu.author?.id !== filters.responsible) return false;
        if (filters.search && !fu.title?.toLowerCase().includes(filters.search.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => {
        const order = { OVERDUE: 0, PENDING: 1, SCHEDULED: 2, COMPLETED: 3 };
        return order[a.computedStatus] - order[b.computedStatus];
      });
  }, [followUps, filters]);

  const stats = useMemo(() => {
    const all = followUps.map(fu => ({ ...fu, computedStatus: getComputedStatus(fu) }));
    return {
      total: all.length,
      pending: all.filter(fu => fu.computedStatus === 'PENDING').length,
      overdue: all.filter(fu => fu.computedStatus === 'OVERDUE').length,
      completed: all.filter(fu => fu.computedStatus === 'COMPLETED').length
    };
  }, [followUps]);

  const upcoming = useMemo(() => {
    const now = new Date();
    const weekFromNow = addDays(now, 7);
    return followUps
      .filter(fu => {
        if (fu.completedAt || fu.status === 'COMPLETED') return false;
        if (!fu.dueDate) return false;
        const due = new Date(fu.dueDate);
        return due >= subDays(now, 1) && due <= weekFromNow;
      })
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, 4);
  }, [followUps]);

  const calendarDays = useMemo(() => {
    const start = startOfMonth(selectedMonth);
    const end = endOfMonth(selectedMonth);
    const days = eachDayOfInterval({ start, end });
    const firstDayOfWeek = getDay(start);
    const paddingBefore = [];
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      paddingBefore.push({ date: subDays(start, i + 1), isOtherMonth: true });
    }
    const eventDates = new Set(
      followUps.filter(fu => fu.dueDate).map(fu => format(new Date(fu.dueDate), 'yyyy-MM-dd'))
    );
    return [
      ...paddingBefore,
      ...days.map(d => ({
        date: d,
        isOtherMonth: false,
        isToday: isToday(d),
        hasEvent: eventDates.has(format(d, 'yyyy-MM-dd'))
      }))
    ];
  }, [followUps, selectedMonth]);

  const handlePreviousMonth = () => setSelectedMonth(prev => subMonths(prev, 1));
  const handleNextMonth = () => setSelectedMonth(prev => addMonths(prev, 1));
  const handleGoToToday = () => setSelectedMonth(new Date());

  const handleDeleteClick = (id) => {
    setDeleteConfirm({ open: true, id });
  };

  const handleDeleteConfirm = async () => {
    const id = deleteConfirm.id;
    if (!id) return;
    setDeleteConfirm({ open: false, id: null });
    try {
      await deleteFollowUp(projectId, id);
      fetchData();
      enqueueSnackbar('Excluido com sucesso', { variant: 'success' });
    } catch (e) {
      enqueueSnackbar('Erro ao excluir', { variant: 'error' });
    }
  };

  const handleComplete = async (id) => {
    try {
      await completeFollowUp(projectId, id);
      fetchData();
      enqueueSnackbar('Marcado como concluído', { variant: 'success' });
    } catch (e) {
      enqueueSnackbar('Erro ao concluir', { variant: 'error' });
    }
  };

  const openRescheduleModal = (id, currentDate) => {
    setRescheduleTargetId(id);
    setRescheduleCurrentDate(currentDate);
    setRescheduleModalOpen(true);
  };

  const handleRescheduleConfirm = async (newDate) => {
    if (!rescheduleTargetId || !newDate) return;
    try {
      await rescheduleFollowUp(projectId, rescheduleTargetId, newDate);
      fetchData();
      enqueueSnackbar('Reagendado com sucesso', { variant: 'success' });
      setRescheduleModalOpen(false);
      setRescheduleTargetId(null);
      setRescheduleCurrentDate(null);
    } catch (e) {
      enqueueSnackbar('Erro ao reagendar', { variant: 'error' });
    }
  };

  const openQuickCreate = (type) => {
    setSelectedFollowUp({ type, priority: 'MEDIUM' });
    setModalOpen(true);
  };

  const getDaysOverdue = (dueDate) => {
    if (!dueDate) return 0;
    const diff = Math.floor((new Date() - new Date(dueDate)) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'OVERDUE': return '#f43f5e';
      case 'PENDING': return '#f59e0b';
      case 'COMPLETED': return '#10b981';
      case 'SCHEDULED': return '#0ea5e9';
      default: return '#64748b';
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  // Stat Card Component
  const StatCard = ({ icon, value, label, color }) => (
    <Box sx={{
      ...cardStyle,
      p: 2.5,
      display: 'flex',
      alignItems: 'center',
      gap: 2,
      transition: 'all 0.2s',
      '&:hover': { borderColor: 'rgba(37, 99, 235, 0.3)', transform: 'translateY(-2px)' }
    }}>
      <Box sx={{
        width: 48,
        height: 48,
        borderRadius: '8px',
        background: `${color}15`,
        color: color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <span className="material-icons-round" style={{ fontSize: 24 }}>{icon}</span>
      </Box>
      <Box>
        <Typography sx={{ fontSize: '24px', fontWeight: 700, color: textPrimary }}>{value}</Typography>
        <Typography sx={{ fontSize: '12px', color: textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</Typography>
      </Box>
    </Box>
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
        <CircularProgress sx={{ color: '#2563eb' }} />
      </Box>
    );
  }

  return (
    <Box>
      {/* Section Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <span className="material-icons-round" style={{ fontSize: 28, color: '#0ea5e9' }}>sync</span>
          <Typography sx={{ fontSize: '20px', fontWeight: 600, color: textPrimary }}>Follow-up do Projeto</Typography>
          <Box sx={{
            bgcolor: 'rgba(14, 165, 233, 0.15)',
            color: '#0ea5e9',
            px: 1.5,
            py: 0.5,
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600
          }}>
            {stats.pending + stats.overdue} pendentes
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            onClick={() => { setSelectedFollowUp(null); setModalOpen(true); }}
            startIcon={<span className="material-icons-round" style={{ fontSize: 18 }}>add</span>}
            sx={{
              background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
              color: 'white',
              borderRadius: '8px',
              padding: '12px 20px',
              fontSize: '14px',
              fontWeight: 600,
              textTransform: 'none',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
              '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 6px 20px rgba(37, 99, 235, 0.4)' }
            }}
          >
            Novo Follow-up
          </Button>
        </Box>
      </Box>

      {/* Stats */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, mb: 3 }}>
        <StatCard icon="event_note" value={stats.total} label="Total" color="#2563eb" />
        <StatCard icon="pending_actions" value={stats.pending} label="Pendentes" color="#f59e0b" />
        <StatCard icon="warning" value={stats.overdue} label="Atrasados" color="#f43f5e" />
        <StatCard icon="check_circle" value={stats.completed} label="Concluídos" color="#10b981" />
      </Box>

      {/* Filters */}
      <Box sx={{ ...cardStyle, p: 2, mb: 3, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ fontSize: '12px', color: textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tipo:</Typography>
          <FormControl size="small">
            <Select value={filters.type} onChange={e => setFilters({ ...filters, type: e.target.value })} sx={selectSx} displayEmpty>
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="MEETING">Reunião</MenuItem>
              <MenuItem value="CALL">Ligação</MenuItem>
              <MenuItem value="EMAIL">E-mail</MenuItem>
              <MenuItem value="REVIEW">Revisão</MenuItem>
              <MenuItem value="TASK">Tarefa</MenuItem>
            </Select>
          </FormControl>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ fontSize: '12px', color: textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status:</Typography>
          <FormControl size="small">
            <Select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })} sx={selectSx} displayEmpty>
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="PENDING">Pendente</MenuItem>
              <MenuItem value="OVERDUE">Atrasado</MenuItem>
              <MenuItem value="COMPLETED">Concluído</MenuItem>
              <MenuItem value="SCHEDULED">Agendado</MenuItem>
            </Select>
          </FormControl>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ fontSize: '12px', color: textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Prioridade:</Typography>
          <FormControl size="small">
            <Select value={filters.priority} onChange={e => setFilters({ ...filters, priority: e.target.value })} sx={selectSx} displayEmpty>
              <MenuItem value="">Todas</MenuItem>
              <MenuItem value="HIGH">Alta</MenuItem>
              <MenuItem value="MEDIUM">Média</MenuItem>
              <MenuItem value="LOW">Baixa</MenuItem>
            </Select>
          </FormControl>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ fontSize: '12px', color: textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Responsável:</Typography>
          <FormControl size="small">
            <Select value={filters.responsible} onChange={e => setFilters({ ...filters, responsible: e.target.value })} sx={selectSx} displayEmpty>
              <MenuItem value="">Todos</MenuItem>
              {users.map(u => (
                <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        <TextField
          placeholder="Buscar..."
          value={filters.search}
          onChange={e => setFilters({ ...filters, search: e.target.value })}
          size="small"
          InputProps={{
            startAdornment: <InputAdornment position="start"><span className="material-icons-round" style={{ fontSize: 18, color: '#64748b' }}>search</span></InputAdornment>
          }}
          sx={{
            flex: 1,
            minWidth: 200,
            '& .MuiOutlinedInput-root': {
              bgcolor: surfaceBg,
              border: `1px solid ${borderSubtle}`,
              borderRadius: '8px',
              fontSize: '13px',
              color: textPrimary,
              '& fieldset': { border: 'none' },
              '&:hover': { borderColor: 'rgba(37, 99, 235, 0.3)' }
            },
            '& input::placeholder': { color: textSecondary, opacity: 1 }
          }}
        />
      </Box>

      {/* Main Content */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 3 }}>
        {/* Timeline */}
        <Box sx={{ ...cardStyle, p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
            <span className="material-icons-round" style={{ fontSize: 22, color: '#2563eb' }}>timeline</span>
            <Typography sx={{ fontSize: '16px', fontWeight: 600, color: textPrimary }}>Linha do Tempo</Typography>
          </Box>

          {processedFollowUps.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6, color: textSecondary }}>
              <span className="material-icons-round" style={{ fontSize: 48, opacity: 0.5 }}>event_note</span>
              <Typography sx={{ mt: 1 }}>Nenhum follow-up encontrado</Typography>
            </Box>
          ) : (
            <Box sx={{
              display: 'flex', flexDirection: 'column', gap: 2, position: 'relative', pl: 3, '&::before': {
                content: '""',
                position: 'absolute',
                left: 10,
                top: 0,
                bottom: 0,
                width: 2,
                background: 'rgba(255, 255, 255, 0.06)'
              }
            }}>
              {processedFollowUps.map((item) => {
                const typeConfig = TYPE_CONFIG[item.type] || TYPE_CONFIG.TASK;
                const priorityConfig = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG.MEDIUM;
                const daysOverdue = getDaysOverdue(item.dueDate);
                const isCompleted = item.computedStatus === 'COMPLETED';

                return (
                  <Box key={item.id} sx={{ display: 'flex', gap: 2 }}>
                    <Box sx={{
                      width: 24,
                      height: 24,
                      borderRadius: '8px',
                      background: getStatusColor(item.computedStatus),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginLeft: '-21px',
                      zIndex: 1
                    }}>
                      <span className="material-icons-round" style={{ fontSize: 14, color: 'white' }}>
                        {item.computedStatus === 'OVERDUE' ? 'priority_high' :
                          item.computedStatus === 'COMPLETED' ? 'check' :
                            item.computedStatus === 'PENDING' ? 'schedule' : 'event'}
                      </span>
                    </Box>
                    <Box sx={{
                      flex: 1,
                      background: surfaceBg,
                      borderRadius: '8px',
                      p: 2,
                      border: `1px solid ${borderSubtle}`,
                      opacity: isCompleted ? 0.6 : 1
                    }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{
                            px: 1,
                            py: 0.5,
                            borderRadius: '8px',
                            background: `${typeConfig.color}20`,
                            color: typeConfig.color,
                            fontSize: '11px',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5
                          }}>
                            <span className="material-icons-round" style={{ fontSize: 14 }}>{typeConfig.icon}</span>
                            {typeConfig.label}
                          </Box>
                          <Box sx={{
                            px: 1,
                            py: 0.5,
                            borderRadius: '8px',
                            background: `${priorityConfig.color}20`,
                            color: priorityConfig.color,
                            fontSize: '11px',
                            fontWeight: 600
                          }}>
                            {priorityConfig.label}
                          </Box>
                        </Box>
                      </Box>
                      <Typography sx={{
                        fontSize: '14px',
                        fontWeight: 500,
                        color: textPrimary,
                        mb: 0.5,
                        textDecoration: isCompleted ? 'line-through' : 'none'
                      }}>
                        {item.title || 'Sem título'}
                      </Typography>
                      {item.description && (
                        <Typography sx={{ fontSize: '12px', color: textMuted, mb: 1.5 }}>{item.description}</Typography>
                      )}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '12px', color: item.computedStatus === 'OVERDUE' ? '#f43f5e' : textSecondary }}>
                          <span className="material-icons-round" style={{ fontSize: 14 }}>event</span>
                          {item.dueDate ? format(new Date(item.dueDate), "dd MMM yyyy", { locale: ptBR }) : 'Sem data'}
                        </Box>
                        {item.computedStatus === 'OVERDUE' && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '12px', color: '#f43f5e' }}>
                            <span className="material-icons-round" style={{ fontSize: 14 }}>warning</span>
                            {daysOverdue} dia{daysOverdue > 1 ? 's' : ''} atrasado
                          </Box>
                        )}
                        {(item.assignee || item.author) && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '12px', color: textSecondary }}>
                            <Box sx={{
                              width: 20,
                              height: 20,
                              borderRadius: '8px',
                              background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '10px',
                              fontWeight: 600,
                              color: 'white'
                            }}>
                              {getInitials(item.assignee?.name || item.author?.name)}
                            </Box>
                            {item.assignee?.name || item.author?.name}
                          </Box>
                        )}
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {!isCompleted && (
                          <>
                            <Button
                              size="small"
                              onClick={() => handleComplete(item.id)}
                              sx={{
                                color: '#10b981',
                                fontSize: '12px',
                                textTransform: 'none',
                                '&:hover': { background: 'rgba(16, 185, 129, 0.1)' }
                              }}
                            >
                              <span className="material-icons-round" style={{ fontSize: 14, marginRight: 4 }}>check</span>
                              Concluir
                            </Button>
                            <Button
                              size="small"
                              onClick={() => openRescheduleModal(item.id, item.dueDate)}
                              sx={{
                                color: '#94a3b8',
                                fontSize: '12px',
                                textTransform: 'none',
                                '&:hover': { background: 'rgba(255, 255, 255, 0.05)' }
                              }}
                            >
                              <span className="material-icons-round" style={{ fontSize: 14, marginRight: 4 }}>schedule</span>
                              Reagendar
                            </Button>
                            <Button
                              size="small"
                              onClick={() => { setSelectedFollowUp(item); setModalOpen(true); }}
                              sx={{
                                color: '#94a3b8',
                                fontSize: '12px',
                                textTransform: 'none',
                                '&:hover': { background: 'rgba(255, 255, 255, 0.05)' }
                              }}
                            >
                              <span className="material-icons-round" style={{ fontSize: 14 }}>edit</span>
                            </Button>
                          </>
                        )}
                        <Button
                          size="small"
                          onClick={() => handleDeleteClick(item.id)}
                          sx={{
                            color: '#f43f5e',
                            fontSize: '12px',
                            textTransform: 'none',
                            '&:hover': { background: 'rgba(244, 63, 94, 0.1)' }
                          }}
                        >
                          <span className="material-icons-round" style={{ fontSize: 14 }}>delete</span>
                        </Button>
                      </Box>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          )}
        </Box>

        {/* Side Panel */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Calendar */}
          <Box sx={{ ...cardStyle, p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <span className="material-icons-round" style={{ fontSize: 20, color: '#2563eb' }}>calendar_month</span>
                <Typography sx={{ fontSize: '14px', fontWeight: 600, color: textPrimary }}>
                  {format(selectedMonth, 'MMMM yyyy', { locale: ptBR })}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <IconButton
                  size="small"
                  onClick={handlePreviousMonth}
                  sx={{ color: textMuted, '&:hover': { color: textPrimary, background: 'rgba(37, 99, 235, 0.1)' } }}
                >
                  <span className="material-icons-round" style={{ fontSize: 18 }}>chevron_left</span>
                </IconButton>
                <IconButton
                  size="small"
                  onClick={handleGoToToday}
                  sx={{ color: textMuted, '&:hover': { color: textPrimary, background: 'rgba(37, 99, 235, 0.1)' } }}
                  title="Ir para hoje"
                >
                  <span className="material-icons-round" style={{ fontSize: 16 }}>today</span>
                </IconButton>
                <IconButton
                  size="small"
                  onClick={handleNextMonth}
                  sx={{ color: textMuted, '&:hover': { color: textPrimary, background: 'rgba(37, 99, 235, 0.1)' } }}
                >
                  <span className="material-icons-round" style={{ fontSize: 18 }}>chevron_right</span>
                </IconButton>
              </Box>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5 }}>
              {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, i) => (
                <Box key={i} sx={{ textAlign: 'center', fontSize: '10px', color: textSecondary, py: 0.5 }}>{day}</Box>
              ))}
              {calendarDays.map((day, i) => (
                <Box
                  key={i}
                  sx={{
                    textAlign: 'center',
                    fontSize: '12px',
                    py: 0.75,
                    borderRadius: '8px',
                    color: day.isOtherMonth ? (isDark ? '#3d4a5c' : '#9ca3af') : day.isToday ? 'white' : textMuted,
                    background: day.isToday ? 'linear-gradient(135deg, #2563eb, #3b82f6)' : 'transparent',
                    position: 'relative',
                    cursor: day.hasEvent ? 'pointer' : 'default',
                    '&:hover': day.hasEvent ? { background: 'rgba(37, 99, 235, 0.1)' } : {}
                  }}
                >
                  {format(day.date, 'd')}
                  {day.hasEvent && !day.isToday && (
                    <Box sx={{ position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)', width: 4, height: 4, borderRadius: '8px', background: '#2563eb' }} />
                  )}
                </Box>
              ))}
            </Box>
          </Box>

          {/* Upcoming */}
          <Box sx={{ ...cardStyle, p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <span className="material-icons-round" style={{ fontSize: 20, color: '#2563eb' }}>upcoming</span>
              <Typography sx={{ fontSize: '14px', fontWeight: 600, color: textPrimary }}>Próximos</Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {upcoming.length === 0 ? (
                <Typography sx={{ fontSize: '12px', color: textSecondary, textAlign: 'center', py: 2 }}>Nenhum follow-up próximo</Typography>
              ) : upcoming.map(item => {
                const typeConfig = TYPE_CONFIG[item.type] || TYPE_CONFIG.TASK;
                const dueDate = new Date(item.dueDate);
                return (
                  <Box key={item.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, background: surfaceBg, borderRadius: '8px' }}>
                    <Box sx={{
                      background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                      borderRadius: '8px',
                      p: 1,
                      textAlign: 'center',
                      minWidth: 40
                    }}>
                      <Typography sx={{ fontSize: '14px', fontWeight: 700, color: 'white', lineHeight: 1 }}>{format(dueDate, 'dd')}</Typography>
                      <Typography sx={{ fontSize: '9px', color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase' }}>{format(dueDate, 'MMM', { locale: ptBR })}</Typography>
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: '12px', fontWeight: 500, color: textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title || 'Sem título'}</Typography>
                      <Typography sx={{ fontSize: '10px', color: textSecondary }}>{format(dueDate, 'HH:mm')}</Typography>
                    </Box>
                    <Box sx={{ width: 28, height: 28, borderRadius: '8px', background: `${typeConfig.color}20`, color: typeConfig.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span className="material-icons-round" style={{ fontSize: 16 }}>{typeConfig.icon}</span>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Box>

          {/* Quick Actions */}
          <Box sx={{ ...cardStyle, p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <span className="material-icons-round" style={{ fontSize: 20, color: '#2563eb' }}>bolt</span>
              <Typography sx={{ fontSize: '14px', fontWeight: 600, color: textPrimary }}>Ações Rápidas</Typography>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
              {[
                { type: 'MEETING', label: 'Reunião' },
                { type: 'CALL', label: 'Ligação' },
                { type: 'EMAIL', label: 'E-mail' },
                { type: 'TASK', label: 'Tarefa' }
              ].map(action => {
                const config = TYPE_CONFIG[action.type];
                return (
                  <Button
                    key={action.type}
                    onClick={() => openQuickCreate(action.type)}
                    sx={{
                      p: 1.5,
                      background: surfaceBg,
                      border: `1px solid ${borderSubtle}`,
                      borderRadius: '8px',
                      color: textMuted,
                      fontSize: '11px',
                      textTransform: 'none',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 0.5,
                      '&:hover': { borderColor: config.color, color: config.color }
                    }}
                  >
                    <span className="material-icons-round" style={{ fontSize: 20 }}>{config.icon}</span>
                    {action.label}
                  </Button>
                );
              })}
            </Box>
          </Box>
        </Box>
      </Box>

      <FollowUpModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setSelectedFollowUp(null); }}
        onSave={fetchData}
        projectId={projectId}
        followUpToEdit={selectedFollowUp}
        users={users}
      />

      <ConfirmDialog
        open={deleteConfirm.open}
        title="Excluir Follow-up"
        content="Tem certeza que deseja excluir este follow-up? Esta acao nao pode ser desfeita."
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteConfirm({ open: false, id: null })}
        confirmText="Excluir"
        confirmColor="error"
      />

      <RescheduleModal
        open={rescheduleModalOpen}
        onClose={() => { setRescheduleModalOpen(false); setRescheduleTargetId(null); setRescheduleCurrentDate(null); }}
        onConfirm={handleRescheduleConfirm}
        currentDate={rescheduleCurrentDate}
      />
    </Box>
  );
};

export default ProjectFollowUp;
