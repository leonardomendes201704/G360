import { useState, useEffect, useContext } from 'react';
import {
  Box, Button, IconButton, Typography, Select, MenuItem, Chip, TextField, InputAdornment, FormControl
} from '@mui/material';
import {
  Add, Summarize, CalendarMonth, PendingActions, People,
  Visibility, Edit, Delete, Search, CheckCircle, Pending, Description, Send, Person, Download
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useSnackbar } from 'notistack';
import useAuth from '../../../hooks/useAuth';
import { ThemeContext } from '../../../contexts/ThemeContext';
import { getMinutes, deleteMinute, submitMinute } from '../../../services/project-details.service';
import MinuteModal from '../../modals/MinuteModal';
import { getFileURL } from '../../../utils/urlUtils';

const ProjectMinutes = ({ projectId, projectName, project, autoOpen, onAutoOpenClose }) => {
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
    borderRadius: '16px',
    boxShadow: cardShadow
  };

  const selectSx = {
    bgcolor: surfaceBg,
    border: `1px solid ${borderSubtle}`,
    borderRadius: '8px',
    fontSize: '13px',
    color: textPrimary,
    minWidth: '120px',
    '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
    '&:hover': { borderColor: 'rgba(37, 99, 235, 0.3)' },
    '& .MuiSelect-icon': { color: textMuted }
  };
  const { user } = useAuth();
  const [minutes, setMinutes] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingMinute, setEditingMinute] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { enqueueSnackbar } = useSnackbar();

  const fetchMinutes = async () => {
    try {
      const data = await getMinutes(projectId);
      setMinutes(data);
    } catch (error) { console.error(error); }
  };

  useEffect(() => { fetchMinutes(); }, [projectId]);

  useEffect(() => {
    if (autoOpen) {
      setEditingMinute(null);
      setOpen(true);
      if (onAutoOpenClose) onAutoOpenClose();
    }
  }, [autoOpen, onAutoOpenClose]);

  const handleOpenEdit = (minute) => {
    setEditingMinute(minute);
    setOpen(true);
  };

  const handleOpenCreate = () => {
    setEditingMinute(null);
    setOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Excluir esta ata?')) return;
    try {
      await deleteMinute(projectId, id);
      fetchMinutes();
      enqueueSnackbar('Ata excluída', { variant: 'success' });
    } catch (error) { enqueueSnackbar('Erro ao excluir', { variant: 'error' }); }
  };

  const handleSubmit = async (minuteId) => {
    try {
      await submitMinute(projectId, minuteId);
      fetchMinutes();
      enqueueSnackbar('Ata submetida para aprovação', { variant: 'success' });
    } catch (error) { enqueueSnackbar('Erro ao submeter ata', { variant: 'error' }); }
  };

  // Estatísticas
  const stats = {
    total: minutes.length,
    thisMonth: minutes.filter(m => {
      const date = new Date(m.date);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length,
    pending: minutes.filter(m => m.status === 'PENDING' || m.status === 'DRAFT').length,
    participants: [...new Set(minutes.flatMap(m => m.participants?.split(',') || []))].length
  };

  // Filtros
  const filteredMinutes = minutes.filter(m => {
    if (searchQuery && !m.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Stat Card Component
  const StatCard = ({ icon: Icon, value, label, color }) => (
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
        borderRadius: '12px',
        background: `${color}15`,
        color: color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Icon />
      </Box>
      <Box>
        <Typography sx={{ fontSize: '24px', fontWeight: 700, color: textPrimary }}>{value}</Typography>
        <Typography sx={{ fontSize: '12px', color: textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</Typography>
      </Box>
    </Box>
  );

  // Status config
  const getStatusConfig = (status) => {
    const configs = {
      APPROVED: { label: 'Aprovada', icon: <CheckCircle sx={{ fontSize: 14 }} />, color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
      PENDING: { label: 'Pendente', icon: <Pending sx={{ fontSize: 14 }} />, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
      DRAFT: { label: 'Rascunho', icon: <Edit sx={{ fontSize: 14 }} />, color: '#64748b', bg: 'rgba(100, 116, 139, 0.15)' },
      RETURNED: { label: 'Devolvida p/ Ajuste', icon: <Edit sx={{ fontSize: 14 }} />, color: '#f97316', bg: 'rgba(249, 115, 22, 0.15)' },
      REJECTED: { label: 'Rejeitada', icon: <Delete sx={{ fontSize: 14 }} />, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' }
    };
    return configs[status] || configs.DRAFT;
  };

  return (
    <Box>
      {/* Section Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Summarize sx={{ color: '#14b8a6', fontSize: 28 }} />
          <Typography sx={{ fontSize: '20px', fontWeight: 600, color: textPrimary }}>Atas de Reunião</Typography>
          <Box sx={{
            bgcolor: 'rgba(20, 184, 166, 0.15)',
            color: '#14b8a6',
            px: 1.5,
            py: 0.5,
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: 600
          }}>
            {minutes.length} atas registradas
          </Box>
        </Box>
        <Button
          onClick={handleOpenCreate}
          startIcon={<Add />}
          sx={{
            background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
            color: 'white',
            borderRadius: '12px',
            padding: '12px 20px',
            fontSize: '14px',
            fontWeight: 600,
            textTransform: 'none',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
            '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 6px 20px rgba(37, 99, 235, 0.4)' }
          }}
        >
          Nova Ata
        </Button>
      </Box>

      {/* Stats Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, mb: 3 }}>
        <StatCard icon={Summarize} value={stats.total} label="Total de Atas" color="#14b8a6" />
        <StatCard icon={CalendarMonth} value={stats.thisMonth} label="Este Mês" color="#0ea5e9" />
        <StatCard icon={PendingActions} value={stats.pending} label="Pendentes" color="#f59e0b" />
        <StatCard icon={People} value={stats.participants} label="Participantes" color="#3b82f6" />
      </Box>

      {/* Filters Bar */}
      <Box sx={{
        ...cardStyle,
        p: 2,
        mb: 3,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        flexWrap: 'wrap'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ fontSize: '12px', color: textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status:</Typography>
          <FormControl size="small">
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} sx={selectSx}>
              <MenuItem value="all">Todos</MenuItem>
              <MenuItem value="approved">Aprovada</MenuItem>
              <MenuItem value="pending">Pendente</MenuItem>
              <MenuItem value="draft">Rascunho</MenuItem>
            </Select>
          </FormControl>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ fontSize: '12px', color: textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Período:</Typography>
          <FormControl size="small">
            <Select value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value)} sx={selectSx}>
              <MenuItem value="all">Todos</MenuItem>
              <MenuItem value="thisMonth">Este mês</MenuItem>
              <MenuItem value="last3Months">Últimos 3 meses</MenuItem>
              <MenuItem value="thisYear">Este ano</MenuItem>
            </Select>
          </FormControl>
        </Box>
        <TextField
          placeholder="Buscar atas..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="small"
          InputProps={{
            startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 18, color: '#64748b' }} /></InputAdornment>
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

      {/* Atas List */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {filteredMinutes.map((minute) => {
          const minuteDate = new Date(minute.date);
          const day = format(minuteDate, 'dd');
          const month = format(minuteDate, 'MMM', { locale: ptBR });
          const status = getStatusConfig(minute.status);

          return (
            <Box key={minute.id} sx={{ ...cardStyle, overflow: 'hidden' }}>
              {/* Card Header */}
              <Box sx={{ p: 2.5, borderBottom: `1px solid ${borderSubtle}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                  <Box sx={{
                    width: 56,
                    height: 56,
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Typography sx={{ fontSize: '20px', fontWeight: 700, color: 'white', lineHeight: 1 }}>{day}</Typography>
                    <Typography sx={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase' }}>{month}</Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: '11px', color: '#2563eb', fontWeight: 600, mb: 0.5 }}>
                      ATA-{String(minute.id).slice(-3).padStart(3, '0')}
                    </Typography>
                    <Typography sx={{ fontSize: '16px', fontWeight: 600, color: textPrimary, mb: 1 }}>{minute.title}</Typography>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                      {minute.duration && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: textSecondary, fontSize: '12px' }}>
                          <CalendarMonth sx={{ fontSize: 14 }} />
                          {minute.duration}
                        </Box>
                      )}
                      {minute.location && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: textSecondary, fontSize: '12px' }}>
                          <Description sx={{ fontSize: 14 }} />
                          {minute.location}
                        </Box>
                      )}
                      {minute.participants && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: textSecondary, fontSize: '12px' }}>
                          <People sx={{ fontSize: 14 }} />
                          {typeof minute.participants === 'string' ? minute.participants : `${minute.participants.length} participantes`}
                        </Box>
                      )}
                    </Box>
                  </Box>
                </Box>
                <Chip
                  label={status.label}
                  icon={status.icon}
                  size="small"
                  sx={{
                    bgcolor: status.bg,
                    color: status.color,
                    fontWeight: 500,
                    '& .MuiChip-icon': { color: status.color }
                  }}
                />
              </Box>

              {/* Card Body */}
              <Box sx={{ p: 2.5 }}>
                {/* Pautas */}
                {minute.topics && minute.topics.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography sx={{ fontSize: '11px', color: textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px', mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Description sx={{ fontSize: 14 }} /> Pautas Discutidas
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {minute.topics.map((topic, idx) => (
                        <Chip
                          key={idx}
                          icon={<CheckCircle sx={{ fontSize: 14 }} />}
                          label={topic}
                          size="small"
                          sx={{
                            background: surfaceBg,
                            border: `1px solid ${borderSubtle}`,
                            color: textMuted,
                            '& .MuiChip-icon': { color: '#2563eb' }
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                )}

                {/* Ações Definidas */}
                {minute.actions && Array.isArray(minute.actions) && minute.actions.length > 0 && (
                  <Box>
                    <Typography sx={{ fontSize: '11px', color: textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px', mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <CheckCircle sx={{ fontSize: 14 }} /> Ações Definidas
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {minute.actions.map((action, idx) => (
                        <Box key={idx} sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1.5,
                          p: 1.5,
                          background: surfaceBg,
                          borderRadius: '8px',
                          border: `1px solid ${borderSubtle}`
                        }}>
                          <Box sx={{
                            width: 18,
                            height: 18,
                            borderRadius: '4px',
                            border: action.completed ? 'none' : '2px solid #64748b',
                            background: action.completed ? '#10b981' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            {action.completed && <CheckCircle sx={{ fontSize: 14, color: 'white' }} />}
                          </Box>
                          <Typography sx={{
                            flex: 1,
                            fontSize: '13px',
                            color: textMuted,
                            textDecoration: action.completed ? 'line-through' : 'none',
                            opacity: action.completed ? 0.6 : 1
                          }}>
                            {action.title}
                          </Typography>
                          {action.assignee && (
                            <Typography sx={{ fontSize: '11px', color: textSecondary, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Person sx={{ fontSize: 14 }} />
                              {action.assignee}
                            </Typography>
                          )}
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}
              </Box>

              {/* Card Footer */}
              <Box sx={{ p: 2, borderTop: `1px solid ${borderSubtle}`, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {minute.fileUrl && (
                  <>
                    <Button
                      onClick={() => window.open(getFileURL(minute.fileUrl), '_blank', 'noopener,noreferrer')}
                      startIcon={<Visibility />}
                      size="small"
                      sx={{
                        color: textMuted,
                        textTransform: 'none',
                        fontSize: '13px',
                        '&:hover': { color: '#2563eb', background: 'rgba(37, 99, 235, 0.1)' }
                      }}
                    >
                      Visualizar
                    </Button>
                    <Button
                      onClick={() => {
                        const a = document.createElement('a');
                        a.href = getFileURL(minute.fileUrl);
                        a.download = minute.fileName || 'ata.pdf';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                      }}
                      startIcon={<Download />}
                      size="small"
                      sx={{
                        color: textMuted,
                        textTransform: 'none',
                        fontSize: '13px',
                        '&:hover': { color: '#10b981', background: 'rgba(16, 185, 129, 0.1)' }
                      }}
                    >
                      Baixar
                    </Button>
                  </>
                )}
                <Button
                  onClick={() => handleOpenEdit(minute)}
                  startIcon={<Edit />}
                  size="small"
                  disabled={minute.status === 'APPROVED'}
                  sx={{
                    color: textMuted,
                    textTransform: 'none',
                    fontSize: '13px',
                    '&:hover': { color: '#2563eb', background: 'rgba(37, 99, 235, 0.1)' }
                  }}
                >
                  Editar
                </Button>
                {(minute.status === 'DRAFT' || minute.status === 'RETURNED') && (
                  <Button
                    onClick={() => handleSubmit(minute.id)}
                    startIcon={<Send />}
                    size="small"
                    sx={{
                      color: '#10b981',
                      textTransform: 'none',
                      fontSize: '13px',
                      '&:hover': { background: 'rgba(16, 185, 129, 0.1)' }
                    }}
                  >
                    {minute.status === 'RETURNED' ? 'Reenviar' : 'Submeter'}
                  </Button>
                )}
                {minute.status !== 'APPROVED' && (
                  <Button
                    onClick={() => handleDelete(minute.id)}
                    startIcon={<Delete />}
                    size="small"
                    sx={{
                      color: '#f43f5e',
                      textTransform: 'none',
                      fontSize: '13px',
                      '&:hover': { background: 'rgba(244, 63, 94, 0.1)' }
                    }}
                  >
                    Excluir
                  </Button>
                )}
              </Box>
            </Box>
          );
        })}

        {filteredMinutes.length === 0 && (
          <Typography align="center" sx={{ py: 8, color: textSecondary, fontStyle: 'italic' }}>
            Nenhuma ata registrada.
          </Typography>
        )}
      </Box>

      <MinuteModal
        open={open}
        onClose={() => setOpen(false)}
        onSave={fetchMinutes}
        projectId={projectId}
        projectName={projectName}
        minuteToEdit={editingMinute}
      />
    </Box>
  );
};

export default ProjectMinutes;