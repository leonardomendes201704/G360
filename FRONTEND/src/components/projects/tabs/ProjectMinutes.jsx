import { useState, useEffect, useContext } from 'react';
import {
  Box, Button, Typography, Select, MenuItem, TextField, InputAdornment, FormControl
} from '@mui/material';
import {
  Add, Summarize, Search, CheckCircle, Pending, Edit, Delete
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import useAuth from '../../../hooks/useAuth';
import { ThemeContext } from '../../../contexts/ThemeContext';
import { getMinutes, deleteMinute, submitMinute } from '../../../services/project-details.service';
import MinuteModal from '../../modals/MinuteModal';
import StatsCard from '../../common/StatsCard';
import ProjectTabKpiStrip from '../ProjectTabKpiStrip';
import DataListTable from '../../common/DataListTable';
import { getProjectMinuteListColumns } from '../projectDetailLists/projectMinuteListColumns';
import { sortProjectMinuteRows } from '../projectDetailLists/projectMinuteListSort';

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
    borderRadius: '8px',
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
  const filteredMinutes = minutes.filter((m) => {
    if (searchQuery && !m.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (statusFilter === 'approved' && m.status !== 'APPROVED') return false;
    if (statusFilter === 'pending' && m.status !== 'PENDING') return false;
    if (statusFilter === 'draft' && m.status !== 'DRAFT') return false;
    const date = new Date(m.date);
    const now = new Date();
    if (periodFilter === 'thisMonth') {
      if (date.getMonth() !== now.getMonth() || date.getFullYear() !== now.getFullYear()) return false;
    }
    if (periodFilter === 'last3Months') {
      const cutoff = new Date(now);
      cutoff.setMonth(cutoff.getMonth() - 3);
      if (date < cutoff) return false;
    }
    if (periodFilter === 'thisYear') {
      if (date.getFullYear() !== now.getFullYear()) return false;
    }
    return true;
  });

  const dense = true;

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
            borderRadius: '8px',
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
            borderRadius: '8px',
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

      <ProjectTabKpiStrip columnCount={4}>
        <StatsCard dense={dense} title="Total de atas" value={stats.total} iconName="summarize" hexColor="#14b8a6" />
        <StatsCard dense={dense} title="Este mês" value={stats.thisMonth} iconName="calendar_month" hexColor="#0ea5e9" />
        <StatsCard dense={dense} title="Pendentes" value={stats.pending} iconName="pending_actions" hexColor="#f59e0b" />
        <StatsCard dense={dense} title="Participantes" value={stats.participants} iconName="people" hexColor="#3b82f6" />
      </ProjectTabKpiStrip>

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

      <DataListTable
        density="compact"
        dataTestidTable="tabela-projeto-atas"
        shell={{
          title: 'Lista de atas',
          titleIcon: 'summarize',
          accentColor: '#14b8a6',
          count: filteredMinutes.length,
          sx: { ...cardStyle, overflow: 'hidden' },
          tableContainerSx: { maxHeight: 520 },
        }}
        columns={getProjectMinuteListColumns({
          colors: {
            textPrimary,
            textSecondary,
            textMuted,
          },
          getStatusConfig,
          handleOpenEdit,
          handleSubmit,
          handleDelete,
        })}
        rows={filteredMinutes}
        sortRows={sortProjectMinuteRows}
        defaultOrderBy="date"
        defaultOrder="desc"
        getDefaultOrderForColumn={(id) => (id === 'date' ? 'desc' : 'asc')}
        resetPaginationKey={`${statusFilter}-${periodFilter}-${searchQuery}-${filteredMinutes.length}`}
        rowsPerPageDefault={10}
        emptyMessage="Nenhuma ata registrada."
      />

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