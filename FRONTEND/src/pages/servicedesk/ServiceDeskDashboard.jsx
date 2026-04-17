import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import { 
  TextField, Tooltip,
  Box, Typography, IconButton, FormControl, InputLabel, Select, MenuItem, TableContainer, Paper,
  CircularProgress, Table, TableHead, TableRow, TableCell, TableBody, Chip, Avatar, useTheme, keyframes
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DownloadIcon from '@mui/icons-material/Download';
import ticketService from '../../services/ticket.service';
import StandardModal from '../../components/common/StandardModal';
import StatsCard from '../../components/common/StatsCard';
import KpiGrid from '../../components/common/KpiGrid';

const STATUS_COLORS = {
  'OPEN': 'info',
  'IN_PROGRESS': 'warning',
  'WAITING_USER': 'secondary',
  'RESOLVED': 'success',
  'CLOSED': 'default'
};

const PRIORITY_COLORS = {
  'LOW': 'success',
  'MEDIUM': 'info',
  'HIGH': 'warning',
  'URGENT': 'error'
};

const pulseAnim = keyframes`
  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
  70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
`;

const ServiceDeskDashboard = () => {
  const { user } = useContext(AuthContext);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const theme = useTheme();
  const mode = theme.palette.mode;

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [resolutionComment, setResolutionComment] = useState('');
  const [resolving, setResolving] = useState(false);
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    fetchTickets();
  }, [filterStatus]);

  useEffect(() => {
    ticketService
      .getMetricsOverview({ days: 30 })
      .then(setMetrics)
      .catch(() => setMetrics(null));
  }, []);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const query = filterStatus !== 'ALL' ? { status: filterStatus } : {};
      const data = await ticketService.getAll(query);
      setTickets(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTakeTicket = async (id) => {
    try {
      const uid = user?.userId || user?.id;
      await ticketService.updateStatus(id, {
        status: 'IN_PROGRESS',
        ...(uid ? { assigneeId: uid } : {})
      });
      fetchTickets();
    } catch (err) {
      console.error(err);
      alert('Erro ao assumir chamado.');
    }
  };

  const openResolveModal = (ticket) => {
    setSelectedTicket(ticket);
    setResolutionComment('');
    setModalOpen(true);
  };

  const handleExportCsv = async () => {
    try {
      const params = { days: 90 };
      if (filterStatus !== 'ALL') params.status = filterStatus;
      await ticketService.downloadExport(params);
    } catch (err) {
      console.error(err);
      alert('Não foi possível gerar o CSV.');
    }
  };

  const handleResolveTicket = async () => {
    try {
      setResolving(true);
      if (resolutionComment.trim()) {
        await ticketService.addMessage(selectedTicket.id, { 
          content: resolutionComment, 
          isInternal: false 
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

  // KPIs Calculation
  const totalTickets = tickets.length;
  const closedTickets = tickets.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED');
  const resolvedTickets = closedTickets.length;
  const totalOpen = tickets.filter(t => t.status === 'OPEN').length;
  const slaBreachedActive = tickets.filter(t => t.slaBreached && t.status !== 'RESOLVED' && t.status !== 'CLOSED').length;
  
  let slaCompliance = 100;
  let slaFailure = 0;
  if (closedTickets.length > 0) {
    const closedBreached = closedTickets.filter(t => t.slaBreached).length;
    slaCompliance = Math.round(((closedTickets.length - closedBreached) / closedTickets.length) * 100);
    slaFailure = 100 - slaCompliance;
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center">
          <Typography variant="h5" fontWeight="bold" mr={2}>Central de Serviços (Service Desk)</Typography>
          <Tooltip title="Exportar chamados (CSV)">
            <IconButton onClick={handleExportCsv} size="small" sx={{ bgcolor: 'rgba(0,0,0,0.04)' }}>
              <DownloadIcon color="action" />
            </IconButton>
          </Tooltip>
        </Box>
        
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={filterStatus}
            label="Status"
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <MenuItem value="ALL">Todos os Chamados</MenuItem>
            <MenuItem value="OPEN">Novos / Abertos</MenuItem>
            <MenuItem value="IN_PROGRESS">Em Atendimento</MenuItem>
            <MenuItem value="WAITING_USER">Aguardando Usuário</MenuItem>
            <MenuItem value="RESOLVED">Resolvidos</MenuItem>
            <MenuItem value="CLOSED">Fechados</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* KPI DASHBOARD */}
      {filterStatus === 'ALL' && !loading && metrics && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" fontWeight={700} sx={{ mb: 1.5 }}>
            Indicadores ({metrics.periodDays} dias)
          </Typography>
          <KpiGrid maxColumns={3} mb={3} clampChildHeight={false} gap={2}>
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
          </KpiGrid>
        </Box>
      )}

      {filterStatus === 'ALL' && !loading && (
        <KpiGrid maxColumns={3} mb={4} clampChildHeight={false} gap={2}>
          <StatsCard title="Total de chamados" value={totalTickets} iconName="confirmation_number" hexColor="#2563eb" />
          <StatsCard title="Atendidos" value={resolvedTickets} iconName="task_alt" hexColor="#10b981" />
          <StatsCard title="Fila em aberto" value={totalOpen} iconName="pending_actions" hexColor="#f59e0b" />
          <StatsCard title="Taxa sucesso SLA" value={`${slaCompliance}%`} iconName="trending_up" hexColor="#059669" />
          <StatsCard title="Taxa fracasso SLA" value={`${slaFailure}%`} iconName="trending_down" hexColor="#ef4444" />
          <StatsCard title="Estouros ativos" value={slaBreachedActive} iconName="error_outline" hexColor="#dc2626" />
        </KpiGrid>
      )}

      <TableContainer component={Paper} elevation={1} sx={{ borderRadius: 1 }}>
        {loading ? (
          <Box p={4} display="flex" justifyContent="center"><CircularProgress /></Box>
        ) : (
          <Table>
            <TableHead sx={{ bgcolor: mode==='dark'?'#1e293b':'#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ color: '#64748b', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Cód.</TableCell>
                <TableCell sx={{ color: '#64748b', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Solicitação</TableCell>
                <TableCell sx={{ color: '#64748b', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Prioridade</TableCell>
                <TableCell sx={{ color: '#64748b', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Prazo SLA</TableCell>
                <TableCell sx={{ color: '#64748b', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Status</TableCell>
                <TableCell sx={{ color: '#64748b', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Operar</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6, color: 'text.secondary' }}>Fila Limpa! Nenhum chamado em aberto. 🎉</TableCell>
                </TableRow>
              ) : (
                tickets.map(t => {
                  const isBreached = t.slaBreached && t.status !== 'RESOLVED' && t.status !== 'CLOSED';
                  return (
                    <TableRow key={t.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                      <TableCell sx={{ fontWeight: '700', fontSize: '0.85rem' }}>{t.code}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="600" sx={{ mb: 0.5 }}>{t.title}</Typography>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Avatar sx={{ width: 20, height: 20, fontSize: '0.65rem' }}>{t.requester?.name?.charAt(0) || 'U'}</Avatar>
                          <Typography variant="caption" color="text.secondary">{t.requester?.name}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip label={t.priority} color={PRIORITY_COLORS[t.priority]} size="small" sx={{ borderRadius: 1.5, fontSize: '0.7rem', fontWeight: 700 }} />
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center">
                          <Typography variant="body2" sx={{ fontWeight: 500, color: isBreached ? '#ef4444' : 'inherit' }}>
                            {t.slaResolveDue ? new Date(t.slaResolveDue).toLocaleDateString() : 'Sem SLA'}
                          </Typography>
                          {isBreached && (
                            <Tooltip title="Atenção: Prazo de SLA Expirado!">
                              <Box sx={{
                                width: 8, height: 8, borderRadius: '50%', bgcolor: '#ef4444',
                                animation: `${pulseAnim} 2s infinite`, display: 'inline-block', ml: 1
                              }} />
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip label={t.status} color={STATUS_COLORS[t.status]} size="small" variant="outlined" sx={{ borderRadius: 1.5, fontSize: '0.7rem', fontWeight: 600, borderWidth: 2 }} />
                      </TableCell>
                      <TableCell>
                        <IconButton 
                          component="a" 
                          href={`/portal/tickets/${t.id}`} 
                          target="_blank" 
                          title="Visualizar Detalhes"
                        >
                          <VisibilityIcon color="primary" />
                        </IconButton>
                        
                        {t.status === 'OPEN' && (
                          <IconButton onClick={() => handleTakeTicket(t.id)} title="Iniciar Atendimento">
                            <PlayArrowIcon color="warning" />
                          </IconButton>
                        )}

                        {t.status === 'IN_PROGRESS' && (
                          <IconButton onClick={() => openResolveModal(t)} title="Resolver Chamado">
                            <CheckCircleIcon color="success" />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        )}
      </TableContainer>

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
