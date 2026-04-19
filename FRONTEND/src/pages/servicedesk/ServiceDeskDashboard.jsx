import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import { ThemeContext } from '../../contexts/ThemeContext';
import {
  TextField,
  Tooltip,
  Box,
  Typography,
  IconButton,
  MenuItem,
  Chip,
  Avatar,
  keyframes,
  Button,
  InputAdornment,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DownloadIcon from '@mui/icons-material/Download';
import FilterAlt from '@mui/icons-material/FilterAlt';
import Refresh from '@mui/icons-material/Refresh';
import Search from '@mui/icons-material/Search';
import ticketService from '../../services/ticket.service';
import { getDepartments } from '../../services/department.service';
import { getReferenceUsers, getReferenceCostCenters } from '../../services/reference.service';
import StandardModal from '../../components/common/StandardModal';
import StatsCard from '../../components/common/StatsCard';
import KpiGrid from '../../components/common/KpiGrid';
import DataListTable from '../../components/common/DataListTable';
import FilterDrawer from '../../components/common/FilterDrawer';
import usePersistedFilters from '../../hooks/usePersistedFilters';
import { getTicketStatusSortIndex } from '../../constants/ticketStatus';

const PRIORITY_RANK = { LOW: 1, MEDIUM: 2, HIGH: 3, URGENT: 4 };

const STATUS_COLORS = {
  OPEN: 'info',
  IN_PROGRESS: 'warning',
  WAITING_USER: 'secondary',
  RESOLVED: 'success',
  CLOSED: 'default',
};

const PRIORITY_COLORS = {
  LOW: 'success',
  MEDIUM: 'info',
  HIGH: 'warning',
  URGENT: 'error',
};

/** Escala ~75% para grelha «Chamados» (fonte, células, paginação). */
const SD_TABLE_SHELL_SX = {
  '& > div:first-of-type': {
    py: 2.25,
    px: 2.25,
  },
  '& > div:first-of-type .material-icons-round': {
    fontSize: '15px !important',
  },
  '& > div:first-of-type > .MuiTypography-root': {
    fontSize: '13.5px !important',
  },
  '& > div:first-of-type > .MuiTypography-root .MuiTypography-root': {
    fontSize: '10.5px !important',
  },
};

const SD_TABLE_CONTAINER_SX = {
  fontSize: '0.75rem',
  '& .MuiTableHead .MuiTableCell-root': {
    fontSize: '0.5625rem',
    py: 0.5,
    px: 1,
    lineHeight: 1.25,
  },
  '& .MuiTableBody .MuiTableCell-root': {
    py: 0.75,
    px: 1,
    fontSize: '0.65rem',
  },
  '& .MuiTableSortLabel-root': { fontSize: 'inherit' },
  '& .MuiTableSortLabel-icon': { fontSize: '0.875rem !important' },
  '& .MuiChip-root': {
    height: 21,
    '& .MuiChip-label': { px: 0.75, fontSize: '0.525rem', lineHeight: 1.2 },
  },
  '& .MuiIconButton-root': { padding: '4px' },
  '& .MuiSvgIcon-root': { fontSize: '1.125rem' },
  '& .MuiTablePagination-root': {
    fontSize: '0.75rem',
    '& .MuiTablePagination-toolbar': { minHeight: 42, pl: 1, pr: 0.5 },
    '& .MuiInputBase-root': { fontSize: '0.75rem' },
  },
};

const pulseAnim = keyframes`
  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
  70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
`;

const DRAWER_FILTER_DEFAULTS = {
  status: '',
  priority: '',
  assigneeId: '',
  departmentId: '',
  costCenterId: '',
  slaBreached: '',
};

const SERVICEDESK_FILTER_DEFAULTS = {
  search: '',
  ...DRAWER_FILTER_DEFAULTS,
};

/** Ordenação específica da fila Service Desk (mesma lógica que antes da extração para DataListTable). */
export function sortServiceDeskTickets(list, orderBy, order) {
  const mult = order === 'asc' ? 1 : -1;
  const sorted = [...list];
  sorted.sort((a, b) => {
    let cmp = 0;
    switch (orderBy) {
      case 'code':
        cmp = String(a.code || '').localeCompare(String(b.code || ''), 'pt-BR', { numeric: true, sensitivity: 'base' });
        break;
      case 'title':
        cmp = String(a.title || '').localeCompare(String(b.title || ''), 'pt-BR', { sensitivity: 'base' });
        break;
      case 'department':
        cmp = String(a.department?.name || '').localeCompare(String(b.department?.name || ''), 'pt-BR', { sensitivity: 'base' });
        break;
      case 'costCenter':
        cmp = String(a.costCenter?.name || '').localeCompare(String(b.costCenter?.name || ''), 'pt-BR', { sensitivity: 'base' });
        break;
      case 'priority': {
        const ra = PRIORITY_RANK[a.priority] ?? 0;
        const rb = PRIORITY_RANK[b.priority] ?? 0;
        cmp = ra - rb;
        break;
      }
      case 'slaResolveDue': {
        const ta = a.slaResolveDue ? new Date(a.slaResolveDue).getTime() : null;
        const tb = b.slaResolveDue ? new Date(b.slaResolveDue).getTime() : null;
        if (ta == null && tb == null) cmp = 0;
        else if (ta == null) cmp = 1;
        else if (tb == null) cmp = -1;
        else cmp = ta - tb;
        break;
      }
      case 'status': {
        const ia = getTicketStatusSortIndex(a.status);
        const ib = getTicketStatusSortIndex(b.status);
        cmp = ia - ib;
        if (cmp === 0) {
          cmp = String(a.code || '').localeCompare(String(b.code || ''), 'pt-BR', { numeric: true });
        }
        break;
      }
      case 'createdAt':
        cmp = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        break;
      default:
        cmp = 0;
    }
    return mult * cmp;
  });
  return sorted;
}

const ServiceDeskDashboard = () => {
  const { user } = useContext(AuthContext);
  const { mode } = useContext(ThemeContext);
  const isDark = mode === 'dark';
  const textPrimary = isDark ? '#f1f5f9' : '#0f172a';
  const textMuted = isDark ? '#94a3b8' : '#64748b';
  const borderSubtle = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
  const cardBg = isDark ? 'rgba(22, 29, 38, 0.5)' : '#FFFFFF';
  const cardBorder = isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(0, 0, 0, 0.08)';
  const cardShadow = isDark ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.08)';

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters, clearFilters] = usePersistedFilters('servicedesk', SERVICEDESK_FILTER_DEFAULTS);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState(DRAWER_FILTER_DEFAULTS);
  const [departments, setDepartments] = useState([]);
  const [assigneeUsers, setAssigneeUsers] = useState([]);
  const [costCenters, setCostCenters] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [resolutionComment, setResolutionComment] = useState('');
  const [resolving, setResolving] = useState(false);
  const [metrics, setMetrics] = useState(null);

  const apiQuery = useMemo(() => {
    const q = {};
    if (filters.status) q.status = filters.status;
    if (filters.priority) q.priority = filters.priority;
    if (filters.assigneeId) q.assigneeId = filters.assigneeId;
    if (filters.departmentId) q.departmentId = filters.departmentId;
    if (filters.costCenterId) q.costCenterId = filters.costCenterId;
    return q;
  }, [filters.status, filters.priority, filters.assigneeId, filters.departmentId, filters.costCenterId]);

  const activeDrawerFilterCount = useMemo(
    () =>
      [filters.status, filters.priority, filters.assigneeId, filters.departmentId, filters.costCenterId, filters.slaBreached].filter(
        Boolean
      ).length,
    [filters.status, filters.priority, filters.assigneeId, filters.departmentId, filters.costCenterId, filters.slaBreached]
  );

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const hay = `${t.code || ''} ${t.title || ''} ${t.requester?.name || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filters.slaBreached === 'true' && !t.slaBreached) return false;
      if (filters.slaBreached === 'false' && t.slaBreached) return false;
      return true;
    });
  }, [tickets, filters.search, filters.slaBreached]);

  const resetPaginationKey = useMemo(
    () =>
      `${filters.search}|${filters.status}|${filters.priority}|${filters.assigneeId}|${filters.departmentId}|${filters.costCenterId}|${filters.slaBreached}`,
    [
      filters.search,
      filters.status,
      filters.priority,
      filters.assigneeId,
      filters.departmentId,
      filters.costCenterId,
      filters.slaBreached,
    ]
  );

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      const data = await ticketService.getAll(apiQuery);
      setTickets(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [apiQuery]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  useEffect(() => {
    ticketService
      .getMetricsOverview({ days: 30 })
      .then(setMetrics)
      .catch(() => setMetrics(null));
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [deps, users, ccs] = await Promise.all([
          getDepartments(),
          getReferenceUsers(),
          getReferenceCostCenters(),
        ]);
        setDepartments(Array.isArray(deps) ? deps : []);
        setAssigneeUsers(Array.isArray(users) ? users : []);
        setCostCenters(Array.isArray(ccs) ? ccs : []);
      } catch {
        setDepartments([]);
        setAssigneeUsers([]);
        setCostCenters([]);
      }
    })();
  }, []);

  const handleTakeTicket = useCallback(async (id) => {
    try {
      const uid = user?.userId || user?.id;
      await ticketService.updateStatus(id, {
        status: 'IN_PROGRESS',
        ...(uid ? { assigneeId: uid } : {}),
      });
      fetchTickets();
    } catch (err) {
      console.error(err);
      alert('Erro ao assumir chamado.');
    }
  }, [user, fetchTickets]);

  const openResolveModal = useCallback((ticket) => {
    setSelectedTicket(ticket);
    setResolutionComment('');
    setModalOpen(true);
  }, []);

  const handleExportCsv = async () => {
    try {
      const params = { days: 90 };
      if (filters.status) params.status = filters.status;
      if (filters.priority) params.priority = filters.priority;
      await ticketService.downloadExport(params);
    } catch (err) {
      console.error(err);
      alert('Não foi possível gerar o CSV.');
    }
  };

  const openFilterDrawer = () => {
    setDraftFilters({
      status: filters.status,
      priority: filters.priority,
      assigneeId: filters.assigneeId,
      departmentId: filters.departmentId,
      costCenterId: filters.costCenterId,
      slaBreached: filters.slaBreached,
    });
    setFilterDrawerOpen(true);
  };

  const handleApplyDrawerFilters = () => {
    setFilters((prev) => ({ ...prev, ...draftFilters }));
  };

  const handleClearDrawerOnly = () => {
    setDraftFilters({ ...DRAWER_FILTER_DEFAULTS });
    setFilters((prev) => ({ ...prev, ...DRAWER_FILTER_DEFAULTS }));
  };

  const inputSx = {
    '& .MuiOutlinedInput-root': {
      bgcolor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#FFFFFF',
      borderRadius: '8px',
      color: textPrimary,
      '& fieldset': { borderColor: borderSubtle },
      '&:hover fieldset': { borderColor: 'rgba(102, 126, 234, 0.5)' },
      '&.Mui-focused fieldset': { borderColor: '#667eea' },
    },
    '& .MuiInputLabel-root': { color: textMuted },
    '& .MuiSelect-icon': { color: textMuted },
  };

  const handleResolveTicket = async () => {
    try {
      setResolving(true);
      if (resolutionComment.trim()) {
        await ticketService.addMessage(selectedTicket.id, {
          content: resolutionComment,
          isInternal: false,
        });
      }
      await ticketService.updateStatus(selectedTicket.id, { status: 'RESOLVED' });
      setModalOpen(false);
      fetchTickets();
    } catch (err) {
      console.error(err);
      alert('Erro ao resolver chamado.');
    } finally {
      setResolving(false);
    }
  };

  const totalTickets = tickets.length;
  const closedTickets = tickets.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED');
  const resolvedTickets = closedTickets.length;
  const totalOpen = tickets.filter((t) => t.status === 'OPEN').length;
  const slaBreachedActive = tickets.filter((t) => t.slaBreached && t.status !== 'RESOLVED' && t.status !== 'CLOSED').length;

  let slaCompliance = 100;
  let slaFailure = 0;
  if (closedTickets.length > 0) {
    const closedBreached = closedTickets.filter((t) => t.slaBreached).length;
    slaCompliance = Math.round(((closedTickets.length - closedBreached) / closedTickets.length) * 100);
    slaFailure = 100 - slaCompliance;
  }

  const columns = useMemo(
    () => [
      {
        id: 'code',
        label: 'Cód.',
        width: '7%',
        minWidth: 60,
        render: (t) => (
          <Typography sx={{ fontWeight: '700', fontSize: '0.64rem', lineHeight: 1.3 }}>{t.code}</Typography>
        ),
      },
      {
        id: 'title',
        label: 'Solicitação',
        width: '21%',
        minWidth: 105,
        render: (t) => (
          <>
            <Typography
              variant="body2"
              fontWeight="600"
              sx={{
                mb: 0.35,
                fontSize: '0.7rem',
                lineHeight: 1.3,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                wordBreak: 'break-word',
              }}
              title={t.title}
            >
              {t.title}
            </Typography>
            <Box display="flex" alignItems="center" gap={0.75} sx={{ minWidth: 0 }}>
              <Avatar sx={{ width: 15, height: 15, fontSize: '0.5rem', flexShrink: 0 }}>
                {t.requester?.name?.charAt(0) || 'U'}
              </Avatar>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  fontSize: '0.6rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  minWidth: 0,
                }}
                title={t.requester?.name}
              >
                {t.requester?.name}
              </Typography>
            </Box>
          </>
        ),
      },
      {
        id: 'createdAt',
        label: 'Abertura',
        width: '8%',
        minWidth: 66,
        render: (t) => (
          <Typography sx={{ fontSize: '0.6rem', whiteSpace: 'nowrap' }}>
            {t.createdAt ? new Date(t.createdAt).toLocaleDateString('pt-BR') : '—'}
          </Typography>
        ),
      },
      {
        id: 'department',
        label: 'Dept.',
        width: '11%',
        minWidth: 69,
        render: (t) => (
          <Typography
            variant="caption"
            component="span"
            display="block"
            title={t.department?.name || ''}
            sx={{ fontSize: '0.6rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {t.department?.name || '—'}
          </Typography>
        ),
      },
      {
        id: 'costCenter',
        label: 'C. custo',
        width: '11%',
        minWidth: 69,
        render: (t) => (
          <Typography
            variant="caption"
            component="span"
            display="block"
            title={t.costCenter?.name || ''}
            sx={{ fontSize: '0.6rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {t.costCenter?.name || '—'}
          </Typography>
        ),
      },
      {
        id: 'priority',
        label: 'Prioridade',
        width: '9%',
        minWidth: 66,
        render: (t) => (
          <Chip
            label={t.priority}
            color={PRIORITY_COLORS[t.priority] ?? 'default'}
            size="small"
            sx={{
              borderRadius: '6px',
              fontSize: '0.525rem',
              fontWeight: 700,
              height: 21,
              maxWidth: '100%',
              '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis', px: 0.75 },
            }}
          />
        ),
      },
      {
        id: 'slaResolveDue',
        label: 'Prazo SLA',
        width: '10%',
        minWidth: 72,
        render: (t) => {
          const isBreached = t.slaBreached && t.status !== 'RESOLVED' && t.status !== 'CLOSED';
          return (
            <Box display="flex" alignItems="center" sx={{ minWidth: 0 }}>
              <Typography
                variant="body2"
                sx={{
                  fontSize: '0.65rem',
                  fontWeight: 500,
                  color: isBreached ? '#ef4444' : 'inherit',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {t.slaResolveDue ? new Date(t.slaResolveDue).toLocaleDateString() : 'Sem SLA'}
              </Typography>
              {isBreached && (
                <Tooltip title="Atenção: Prazo de SLA Expirado!">
                  <Box
                    sx={{
                      width: 6,
                      height: 6,
                      borderRadius: '6px',
                      bgcolor: '#ef4444',
                      animation: `${pulseAnim} 2s infinite`,
                      display: 'inline-block',
                      ml: 0.75,
                      flexShrink: 0,
                    }}
                  />
                </Tooltip>
              )}
            </Box>
          );
        },
      },
      {
        id: 'status',
        label: 'Status',
        width: '10%',
        minWidth: 72,
        render: (t) => (
          <Chip
            label={t.status}
            color={STATUS_COLORS[t.status] ?? 'default'}
            size="small"
            variant="outlined"
            sx={{
              borderRadius: '6px',
              fontSize: '0.525rem',
              fontWeight: 600,
              height: 21,
              borderWidth: 1.5,
              maxWidth: '100%',
              '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis', px: 0.75 },
            }}
          />
        ),
      },
      {
        id: '_actions',
        label: 'Operar',
        sortable: false,
        width: '8%',
        minWidth: 60,
        render: (t) => (
          <>
            <IconButton size="small" component="a" href={`/portal/tickets/${t.id}`} target="_blank" title="Visualizar Detalhes">
              <VisibilityIcon color="primary" sx={{ fontSize: '1.125rem' }} />
            </IconButton>
            {t.status === 'OPEN' && (
              <IconButton size="small" onClick={() => handleTakeTicket(t.id)} title="Iniciar Atendimento">
                <PlayArrowIcon color="warning" sx={{ fontSize: '1.125rem' }} />
              </IconButton>
            )}
            {t.status === 'IN_PROGRESS' && (
              <IconButton size="small" onClick={() => openResolveModal(t)} title="Resolver Chamado">
                <CheckCircleIcon color="success" sx={{ fontSize: '1.125rem' }} />
              </IconButton>
            )}
          </>
        ),
      },
    ],
    [handleTakeTicket, openResolveModal]
  );

  const tableToolbar = (
    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
      <TextField
        placeholder="Buscar chamado..."
        size="small"
        value={filters.search}
        onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search sx={{ color: textMuted }} />
            </InputAdornment>
          ),
        }}
        sx={{ width: 260, minWidth: 120, ...inputSx }}
      />
    </Box>
  );

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center">
          <Typography variant="h5" fontWeight="bold" mr={2}>
            Central de Serviços (Service Desk)
          </Typography>
          <Tooltip title="Exportar chamados (CSV)">
            <IconButton onClick={handleExportCsv} size="small" sx={{ bgcolor: 'rgba(0,0,0,0.04)' }}>
              <DownloadIcon color="action" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {!loading && (
        <Box sx={{ mb: 4 }}>
          {metrics && (
            <Typography variant="subtitle2" color="text.secondary" fontWeight={700} sx={{ mb: 1.5 }}>
              Indicadores ({metrics.periodDays} dias)
            </Typography>
          )}
          <KpiGrid maxColumns={5} mb={0} clampChildHeight={false} gap={2}>
            {metrics && (
              <>
                <StatsCard
                  title="MTTR"
                  value={metrics.mttrHours != null ? `${metrics.mttrHours.toFixed(1)} h` : '—'}
                  iconName="schedule"
                  hexColor="#2563eb"
                />
                <StatsCard
                  title="1ª resposta média"
                  value={metrics.meanFirstResponseHours != null ? `${metrics.meanFirstResponseHours.toFixed(1)} h` : '—'}
                  iconName="mark_chat_read"
                  hexColor="#0284c7"
                  titleLineClamp={2}
                />
                <StatsCard
                  title="Conformidade SLA"
                  value={metrics.slaCompliancePct != null ? `${metrics.slaCompliancePct}%` : '—'}
                  iconName="verified"
                  hexColor={
                    metrics.slaCompliancePct == null
                      ? '#64748b'
                      : metrics.slaCompliancePct >= 90
                        ? '#059669'
                        : '#d97706'
                  }
                />
                <StatsCard
                  title="Resolvidos no período"
                  value={metrics.resolvedInPeriod ?? 0}
                  iconName="done_all"
                  hexColor="#06b6d4"
                  titleLineClamp={2}
                />
              </>
            )}
            <StatsCard title="Total de chamados" value={totalTickets} iconName="confirmation_number" hexColor="#2563eb" />
            <StatsCard title="Atendidos" value={resolvedTickets} iconName="task_alt" hexColor="#10b981" />
            <StatsCard title="Fila em aberto" value={totalOpen} iconName="pending_actions" hexColor="#f59e0b" />
            <StatsCard title="Taxa sucesso SLA" value={`${slaCompliance}%`} iconName="trending_up" hexColor="#059669" />
            <StatsCard title="Taxa fracasso SLA" value={`${slaFailure}%`} iconName="trending_down" hexColor="#ef4444" />
            <StatsCard title="Estouros ativos" value={slaBreachedActive} iconName="error_outline" hexColor="#dc2626" />
          </KpiGrid>
        </Box>
      )}

      <Box
        sx={{
          mb: 3,
          borderRadius: '8px',
          background: cardBg,
          backdropFilter: isDark ? 'blur(10px)' : 'none',
          border: cardBorder,
          boxShadow: cardShadow,
          overflow: 'hidden',
        }}
      >
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: textPrimary }}>
            <Button
              size="medium"
              startIcon={<FilterAlt />}
              onClick={openFilterDrawer}
              sx={{
                color: textPrimary,
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': { bgcolor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)' },
              }}
            >
              Filtros
            </Button>
            {activeDrawerFilterCount > 0 ? (
              <Box
                sx={{
                  px: 1,
                  py: 0.25,
                  borderRadius: '8px',
                  fontSize: '10px',
                  fontWeight: 700,
                  bgcolor: 'rgba(37, 99, 235, 0.15)',
                  color: '#2563eb',
                }}
              >
                {activeDrawerFilterCount}
              </Box>
            ) : null}
          </Box>
          <Button
            size="small"
            startIcon={<Refresh />}
            onClick={clearFilters}
            sx={{
              color: textMuted,
              textTransform: 'none',
              '&:hover': { bgcolor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)' },
            }}
          >
            Limpar tudo
          </Button>
        </Box>
      </Box>

      <FilterDrawer
        open={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        onApply={handleApplyDrawerFilters}
        onClear={handleClearDrawerOnly}
        title="Filtros de chamados"
      >
        <TextField
          select
          fullWidth
          label="Status"
          size="small"
          value={draftFilters.status}
          onChange={(e) => setDraftFilters((prev) => ({ ...prev, status: e.target.value }))}
          sx={inputSx}
        >
          <MenuItem value="">Todos</MenuItem>
          <MenuItem value="OPEN">Novos / Abertos</MenuItem>
          <MenuItem value="IN_PROGRESS">Em atendimento</MenuItem>
          <MenuItem value="WAITING_USER">Aguardando usuário</MenuItem>
          <MenuItem value="RESOLVED">Resolvidos</MenuItem>
          <MenuItem value="CLOSED">Fechados</MenuItem>
        </TextField>
        <TextField
          select
          fullWidth
          label="Prioridade"
          size="small"
          value={draftFilters.priority}
          onChange={(e) => setDraftFilters((prev) => ({ ...prev, priority: e.target.value }))}
          sx={inputSx}
        >
          <MenuItem value="">Todas</MenuItem>
          <MenuItem value="LOW">LOW</MenuItem>
          <MenuItem value="MEDIUM">MEDIUM</MenuItem>
          <MenuItem value="HIGH">HIGH</MenuItem>
          <MenuItem value="URGENT">URGENT</MenuItem>
        </TextField>
        <TextField
          select
          fullWidth
          label="Responsável"
          size="small"
          value={draftFilters.assigneeId}
          onChange={(e) => setDraftFilters((prev) => ({ ...prev, assigneeId: e.target.value }))}
          sx={inputSx}
        >
          <MenuItem value="">Todos</MenuItem>
          {assigneeUsers.map((u) => (
            <MenuItem key={u.id} value={u.id}>
              {u.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          fullWidth
          label="Departamento"
          size="small"
          value={draftFilters.departmentId}
          onChange={(e) => setDraftFilters((prev) => ({ ...prev, departmentId: e.target.value }))}
          sx={inputSx}
        >
          <MenuItem value="">Todos</MenuItem>
          {departments.map((d) => (
            <MenuItem key={d.id} value={d.id}>
              {d.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          fullWidth
          label="Centro de custo"
          size="small"
          value={draftFilters.costCenterId}
          onChange={(e) => setDraftFilters((prev) => ({ ...prev, costCenterId: e.target.value }))}
          sx={inputSx}
        >
          <MenuItem value="">Todos</MenuItem>
          {costCenters.map((c) => (
            <MenuItem key={c.id} value={c.id}>
              {c.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          fullWidth
          label="SLA estourado"
          size="small"
          value={draftFilters.slaBreached}
          onChange={(e) => setDraftFilters((prev) => ({ ...prev, slaBreached: e.target.value }))}
          sx={inputSx}
        >
          <MenuItem value="">Todos</MenuItem>
          <MenuItem value="true">Sim</MenuItem>
          <MenuItem value="false">Não</MenuItem>
        </TextField>
      </FilterDrawer>

      <DataListTable
        shell={{
          title: 'Chamados',
          titleIcon: 'confirmation_number',
          accentColor: '#2563eb',
          count: filteredTickets.length,
          toolbar: tableToolbar,
          sx: SD_TABLE_SHELL_SX,
          tableContainerSx: SD_TABLE_CONTAINER_SX,
        }}
        columns={columns}
        rows={filteredTickets}
        loading={loading}
        emptyMessage="Fila Limpa! Nenhum chamado em aberto. 🎉"
        defaultOrderBy="createdAt"
        defaultOrder="desc"
        getDefaultOrderForColumn={(id) => (['createdAt', 'slaResolveDue'].includes(id) ? 'desc' : 'asc')}
        sortRows={sortServiceDeskTickets}
        resetPaginationKey={resetPaginationKey}
      />

      <StandardModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Resolver Chamado: ${selectedTicket?.code || ''}`}
        subtitle={selectedTicket?.title}
        icon="task_alt"
        size="form"
        loading={resolving}
        actions={[
          { label: 'Cancelar', onClick: () => setModalOpen(false) },
          { label: 'Confirmar Resolução', onClick: handleResolveTicket, color: 'success' },
        ]}
      >
        <Typography variant="body2" sx={{ mb: 2 }}>
          Você está prestes a resolver a requisição <b>{selectedTicket?.title}</b>. O usuário será notificado.
        </Typography>
        <TextField
          autoFocus
          margin="dense"
          label="Nota de Resolução (Visível ao Usuário)"
          fullWidth
          multiline
          rows={4}
          variant="outlined"
          value={resolutionComment}
          onChange={(e) => setResolutionComment(e.target.value)}
          disabled={resolving}
        />
      </StandardModal>
    </Box>
  );
};

export default ServiceDeskDashboard;
