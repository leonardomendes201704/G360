import { useState, useEffect, useMemo, useContext } from 'react';
import { useSnackbar } from 'notistack';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, TextField, MenuItem, IconButton, Tooltip, useTheme } from '@mui/material';
import FilterAlt from '@mui/icons-material/FilterAlt';
import Refresh from '@mui/icons-material/Refresh';
import FilterDrawer from '../../components/common/FilterDrawer';
import { format, isAfter, isBefore, addDays } from 'date-fns';

import { ThemeContext } from '../../contexts/ThemeContext';
import ContractModal from '../../components/modals/ContractModal';
import AddendumFormModal from '../../components/modals/AddendumFormModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import EmptyState from '../../components/common/EmptyState';
import DataListShell from '../../components/common/DataListShell';
import ExportButton from '../../components/common/ExportButton';
import { EXPORT_COLUMNS } from '../../utils/exportUtils';
import { getContracts, createContract, updateContract, deleteContract } from '../../services/contract.service';
import { getErrorMessage } from '../../utils/errorUtils';
import { AuthContext } from '../../contexts/AuthContext';
import StatsCard from '../../components/common/StatsCard';
import KpiGrid from '../../components/common/KpiGrid';

const CONTRACT_FILTER_DEFAULTS = {
  status: '',
  type: '',
  period: '',
};

const ContractsPage = () => {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ ...CONTRACT_FILTER_DEFAULTS });
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState({ ...CONTRACT_FILTER_DEFAULTS });

  // Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [quickAddendumContract, setQuickAddendumContract] = useState(null);

  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();

  // Theme context
  const { mode } = useContext(ThemeContext);
  const theme = useTheme();
  const { hasPermission } = useContext(AuthContext);
  const isDark = mode === 'dark';
  const canWrite = hasPermission('CONTRACTS', 'CREATE');
  const canEdit = hasPermission('CONTRACTS', 'EDIT_CONTRACT');
  const canAddendum = hasPermission('CONTRACTS', 'ADDENDUM');
  const canDeletePerm = hasPermission('CONTRACTS', 'DELETE');

  // Theme-aware styles
  const textPrimary = mode === 'dark' ? '#f1f5f9' : theme.palette.text.primary;
  const textSecondary = mode === 'dark' ? '#64748b' : theme.palette.text.secondary;
  const cardBg = mode === 'dark' ? 'rgba(22, 29, 38, 0.5)' : '#FFFFFF';
  const borderColor = mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.08)';
  const cardShadow = mode === 'dark' ? 'none' : '0 4px 6px -1px rgba(0, 0, 0, 0.07)';
  const surfaceBg = mode === 'dark' ? '#1c2632' : '#FFFFFF';
  const tableHeaderBg = mode === 'dark' ? '#1c2632' : '#f8fafc';

  const fetchContracts = async () => {
    setLoading(true);
    try {
      const data = await getContracts();
      setContracts(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchContracts(); }, []);

  // Contract Status Helper
  const getContractStatus = (contract) => {
    const end = new Date(contract.endDate);
    const today = new Date();
    if (isAfter(today, end)) return 'VENCIDO';
    if (isBefore(end, addDays(today, 30))) return 'A VENCER';
    return 'VIGENTE';
  };

  // Filter Logic
  const filteredContracts = useMemo(() => {
    return contracts.filter(c => {
      const matchesSearch = searchTerm === '' ||
        c.number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.description?.toLowerCase().includes(searchTerm.toLowerCase());

      const status = getContractStatus(c);
      const matchesStatus = filters.status === '' ||
        (filters.status === 'active' && status === 'VIGENTE') ||
        (filters.status === 'pending' && status === 'A VENCER') ||
        (filters.status === 'expired' && status === 'VENCIDO');


      const matchesType = filters.type === '' || c.type === filters.type;

      const matchesPeriod = filters.period === '' ||
        (filters.period === 'current' && status === 'VIGENTE') ||
        (filters.period === 'expiring' && status === 'A VENCER') ||
        (filters.period === 'expired' && status === 'VENCIDO');

      return matchesSearch && matchesStatus && matchesType && matchesPeriod;
    });
  }, [contracts, searchTerm, filters]);

  const activeDrawerFilterCount = useMemo(
    () =>
      (filters.status ? 1 : 0) +
      (filters.type ? 1 : 0) +
      (filters.period ? 1 : 0),
    [filters.status, filters.type, filters.period]
  );

  const drawerInputSx = useMemo(
    () => ({
      '& .MuiOutlinedInput-root': {
        bgcolor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#FFFFFF',
        borderRadius: 2,
        '& fieldset': { borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)' },
        '&:hover fieldset': { borderColor: 'rgba(37, 99, 235, 0.35)' },
        '&.Mui-focused fieldset': { borderColor: '#2563eb' },
      },
      '& .MuiInputLabel-root': { color: isDark ? '#94a3b8' : '#64748b' },
      '& .MuiSelect-icon': { color: isDark ? '#94a3b8' : '#64748b' },
    }),
    [isDark]
  );

  const openFilterDrawer = () => {
    setDraftFilters({ ...filters });
    setFilterDrawerOpen(true);
  };

  const handleApplyDrawerFilters = () => {
    setFilters({ ...draftFilters });
  };

  const handleClearDrawerOnly = () => {
    setDraftFilters({ ...CONTRACT_FILTER_DEFAULTS });
    setFilters({ ...CONTRACT_FILTER_DEFAULTS });
  };

  const clearAllFilters = () => {
    setFilters({ ...CONTRACT_FILTER_DEFAULTS });
    setDraftFilters({ ...CONTRACT_FILTER_DEFAULTS });
    setSearchTerm('');
  };

  // KPIs
  const kpis = useMemo(() => ({
    total: contracts.length,
    totalValue: contracts.reduce((acc, c) => acc + Number(c.value || 0), 0),
    active: contracts.filter(c => getContractStatus(c) === 'VIGENTE').length,
    expiring: contracts.filter(c => getContractStatus(c) === 'A VENCER').length,
    expired: contracts.filter(c => getContractStatus(c) === 'VENCIDO').length
  }), [contracts]);

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // Handlers
  const handleSave = async (data) => {
    try {
      if (selectedContract) await updateContract(selectedContract.id, data);
      else await createContract(data);
      enqueueSnackbar('Contrato salvo com sucesso!', { variant: 'success' });
      setModalOpen(false);
      fetchContracts();
    } catch (e) {
      enqueueSnackbar(getErrorMessage(e, 'Erro ao salvar contrato.'), { variant: 'error' });
    }
  };

  const handleDeleteClick = (id) => {
    setDeleteId(id);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteContract(deleteId);
      enqueueSnackbar('Contrato excluído com sucesso.', { variant: 'success' });
      fetchContracts();
      setConfirmOpen(false);
      setDeleteId(null);
    } catch (e) {
      enqueueSnackbar(getErrorMessage(e, 'Erro ao excluir contrato.'), { variant: 'error' });
    }
  };

  const handleOpenNew = () => { setSelectedContract(null); setModalOpen(true); };
  const handleOpenEdit = (c) => { setSelectedContract(c); setModalOpen(true); };
  const handleOpenDetails = (c) => { navigate(`/contracts/${c.id}`); };

  // Status Badge Styles
  const getStatusStyle = (status) => {
    switch (status) {
      case 'VIGENTE': return { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981' };
      case 'A VENCER': return { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' };
      case 'VENCIDO': return { bg: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e' };
      default: return { bg: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8' };
    }
  };

  // Stat Card Configuration
  const statCards = [
    {
      key: 'total',
      label: 'Total de Contratos',
      value: kpis.total,
      icon: 'description',
      bg: 'rgba(37, 99, 235, 0.15)',
      color: '#2563eb'
    },
    {
      key: 'active',
      label: 'Contratos Ativos',
      value: kpis.active,
      icon: 'check_circle',
      bg: 'rgba(16, 185, 129, 0.15)',
      color: '#10b981'
    },
    {
      key: 'expiring',
      label: 'Vencendo em 30 dias',
      value: kpis.expiring,
      icon: 'schedule',
      bg: 'rgba(244, 63, 94, 0.15)',
      color: '#f43f5e'
    },
    {
      key: 'pending',
      label: 'Pendentes de Renovação',
      value: kpis.expired,
      icon: 'pending',
      bg: 'rgba(245, 158, 11, 0.15)',
      color: '#f59e0b'
    }
  ];

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          mb: 3,
          p: 3,
          borderRadius: '16px',
          background: cardBg,
          backdropFilter: mode === 'dark' ? 'blur(10px)' : 'none',
          border: `1px solid ${borderColor}`,
          boxShadow: cardShadow,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', md: 'center' },
          flexDirection: { xs: 'column', md: 'row' },
          gap: { xs: 2, md: 0 }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: '12px',
              background: 'rgba(37, 99, 235, 0.15)',
              border: '1px solid rgba(37, 99, 235, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#2563eb'
            }}
          >
            <span className="material-icons-round" style={{ fontSize: '24px' }}>description</span>
          </Box>
          <Box>
            <Typography sx={{
              fontSize: '20px',
              fontWeight: 600,
              color: textPrimary,
            }}
            >
              Gestão de Contratos
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', width: { xs: '100%', md: 'auto' } }}>
          {canWrite && (
            <Button
              data-testid="btn-novo-contrato"
              onClick={handleOpenNew}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                padding: '10px 18px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 600,
                textTransform: 'none',
                background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                color: 'white',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 6px 20px rgba(37, 99, 235, 0.4)',
                },
              }}
              startIcon={<span className="material-icons-round" style={{ fontSize: '18px' }}>add</span>}
            >
              Novo Contrato
            </Button>
          )}
        </Box>
      </Box>

      {/* Filtros — barra compacta + drawer (padrão incidentes / projetos) */}
      <Box
        sx={{
          mb: 3,
          borderRadius: '16px',
          bgcolor: isDark ? 'rgba(22, 29, 38, 0.5)' : '#fff',
          border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.08)',
          p: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Button
            size="medium"
            startIcon={<FilterAlt />}
            onClick={openFilterDrawer}
            sx={{
              color: isDark ? '#f1f5f9' : '#0f172a',
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
            }}
          >
            Filtros
          </Button>
          {activeDrawerFilterCount > 0 ? (
            <Box
              sx={{
                px: 1,
                py: 0.25,
                borderRadius: '10px',
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
          onClick={clearAllFilters}
          sx={{
            color: isDark ? '#94a3b8' : '#64748b',
            textTransform: 'none',
            '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' },
          }}
        >
          Limpar tudo
        </Button>
      </Box>

      <FilterDrawer
        open={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        onApply={handleApplyDrawerFilters}
        onClear={handleClearDrawerOnly}
        title="Filtros de contratos"
      >
        <TextField
          select
          fullWidth
          label="Status"
          size="small"
          value={draftFilters.status}
          onChange={(e) => setDraftFilters((prev) => ({ ...prev, status: e.target.value }))}
          sx={drawerInputSx}
        >
          <MenuItem value="">Todos os status</MenuItem>
          <MenuItem value="active">Ativo</MenuItem>
          <MenuItem value="pending">Pendente</MenuItem>
          <MenuItem value="expired">Expirado</MenuItem>
        </TextField>
        <TextField
          select
          fullWidth
          label="Tipo"
          size="small"
          value={draftFilters.type}
          onChange={(e) => setDraftFilters((prev) => ({ ...prev, type: e.target.value }))}
          sx={drawerInputSx}
        >
          <MenuItem value="">Todos os tipos</MenuItem>
          <MenuItem value="SERVICO">Serviço</MenuItem>
          <MenuItem value="PRODUTO">Produto</MenuItem>
          <MenuItem value="LOCACAO">Locação</MenuItem>
          <MenuItem value="MANUTENCAO">Manutenção</MenuItem>
          <MenuItem value="OUTROS">Outros</MenuItem>
        </TextField>
        <TextField
          select
          fullWidth
          label="Período"
          size="small"
          value={draftFilters.period}
          onChange={(e) => setDraftFilters((prev) => ({ ...prev, period: e.target.value }))}
          sx={drawerInputSx}
        >
          <MenuItem value="">Todo o período</MenuItem>
          <MenuItem value="current">Vigentes</MenuItem>
          <MenuItem value="expiring">Vencendo em 30 dias</MenuItem>
          <MenuItem value="expired">Expirados</MenuItem>
        </TextField>
      </FilterDrawer>

      <KpiGrid maxColumns={4}>
        {statCards.map((card) => (
          <StatsCard
            key={card.key}
            title={card.label}
            value={card.value}
            iconName={card.icon}
            hexColor={card.color}
          />
        ))}
      </KpiGrid>

      {/* Table Section */}
      <DataListShell
        title="Lista de Contratos"
        titleIcon="list"
        accentColor="#2563eb"
        count={filteredContracts.length}
        sx={{
          borderRadius: '16px',
          background: cardBg,
          backdropFilter: mode === 'dark' ? 'blur(10px)' : 'none',
          border: `1px solid ${borderColor}`,
          boxShadow: cardShadow,
          overflow: 'hidden'
        }}
        toolbar={(
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <ExportButton data={filteredContracts} columns={EXPORT_COLUMNS.contracts} filename="contratos" compact />
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                background: surfaceBg,
                border: `1px solid ${borderColor}`,
                borderRadius: '12px',
                padding: '10px 16px',
                width: 300
              }}
            >
              <span className="material-icons-round" style={{ fontSize: '20px', color: mode === 'dark' ? '#64748b' : '#94a3b8' }}>search</span>
              <input
                type="text"
                placeholder="Buscar contrato..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: mode === 'dark' ? '#f1f5f9' : '#0f172a',
                  fontSize: '14px'
                }}
              />
            </Box>
          </Box>
        )}
      >
        <Box sx={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#1c2632' }}>
                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  Número
                </th>
                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  Fornecedor
                </th>
                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  Objeto
                </th>
                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  Vigência
                </th>
                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  Valor
                </th>
                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  Status
                </th>
                <th style={{ padding: '16px 24px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredContracts.map(contract => {
                const status = getContractStatus(contract);
                const statusStyle = getStatusStyle(status);
                return (
                  <tr
                    key={contract.id}
                    style={{ transition: 'all 0.2s ease', cursor: 'pointer' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#1c2632'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '20px 24px', fontSize: '14px', color: '#2563eb', fontWeight: 600, borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                      {contract.number}
                    </td>
                    <td style={{ padding: '20px 24px', fontSize: '14px', color: '#f1f5f9', fontWeight: 500, borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                      {contract.supplier?.name || '-'}
                    </td>
                    <td style={{ padding: '20px 24px', fontSize: '14px', color: '#94a3b8', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {contract.description}
                    </td>
                    <td style={{ padding: '20px 24px', fontSize: '13px', color: '#94a3b8', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                      {format(new Date(contract.startDate), 'dd/MM/yyyy')} - {format(new Date(contract.endDate), 'dd/MM/yyyy')}
                    </td>
                    <td style={{ padding: '20px 24px', fontSize: '14px', color: '#f1f5f9', fontWeight: 600, borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                      {formatCurrency(contract.value)}
                    </td>
                    <td style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 600,
                        background: statusStyle.bg,
                        color: statusStyle.color
                      }}>
                        <span className="material-icons-round" style={{ fontSize: '14px' }}>
                          {status === 'VIGENTE' ? 'check_circle' : status === 'A VENCER' ? 'schedule' : 'error'}
                        </span>
                        {status}
                      </span>
                    </td>
                    <td style={{ padding: '20px 24px', textAlign: 'right', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                        <Tooltip title="Ver Detalhes">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenDetails(contract)}
                            sx={{
                              width: 32,
                              height: 32,
                              borderRadius: '8px',
                              border: '1px solid rgba(255, 255, 255, 0.06)',
                              color: '#94a3b8',
                              '&:hover': {
                                background: '#1c2632',
                                borderColor: '#2563eb',
                                color: '#2563eb'
                              }
                            }}
                          >
                            <span className="material-icons-round" style={{ fontSize: '18px' }}>visibility</span>
                          </IconButton>
                        </Tooltip>
                        {canEdit && (
                          <Tooltip title="Editar">
                            <IconButton
                              size="small"
                              onClick={() => handleOpenEdit(contract)}
                              sx={{
                                width: 32,
                                height: 32,
                                borderRadius: '8px',
                                border: '1px solid rgba(255, 255, 255, 0.06)',
                                color: '#94a3b8',
                                '&:hover': {
                                  background: '#1c2632',
                                  borderColor: '#2563eb',
                                  color: '#2563eb'
                                }
                              }}
                            >
                              <span className="material-icons-round" style={{ fontSize: '18px' }}>edit</span>
                            </IconButton>
                          </Tooltip>
                        )}
                        {canAddendum && (
                          <Tooltip title="Aditivo Rápido">
                            <IconButton
                              size="small"
                              onClick={() => setQuickAddendumContract(contract)}
                              sx={{
                                width: 32,
                                height: 32,
                                borderRadius: '8px',
                                border: '1px solid rgba(255, 255, 255, 0.06)',
                                color: '#94a3b8',
                                '&:hover': {
                                  background: 'rgba(59, 130, 246, 0.1)',
                                  borderColor: '#3b82f6',
                                  color: '#3b82f6'
                                }
                              }}
                            >
                              <span className="material-icons-round" style={{ fontSize: '18px' }}>note_add</span>
                            </IconButton>
                          </Tooltip>
                        )}
                        {canDeletePerm && (
                          <Tooltip title="Excluir">
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteClick(contract.id)}
                              sx={{
                                width: 32,
                                height: 32,
                                borderRadius: '8px',
                                border: '1px solid rgba(255, 255, 255, 0.06)',
                                color: '#94a3b8',
                                '&:hover': {
                                  background: 'rgba(244, 63, 94, 0.1)',
                                  borderColor: '#f43f5e',
                                  color: '#f43f5e'
                                }
                              }}
                            >
                              <span className="material-icons-round" style={{ fontSize: '18px' }}>delete</span>
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Box>

        {/* Empty State */}
        {filteredContracts.length === 0 && !loading && (
          <EmptyState
            icon={<span className="material-icons-round" style={{ fontSize: 'inherit' }}>description</span>}
            title="Nenhum contrato encontrado"
            description="Ajuste os filtros ou adicione um novo contrato para começar a gerenciar seus acordos comerciais."
            actionLabel="Novo Contrato"
            actionIcon={<span className="material-icons-round" style={{ fontSize: '18px' }}>add</span>}
            onAction={handleOpenNew}
          />
        )}
      </DataListShell>

      {/* Modals */}
      <ContractModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        onRefresh={fetchContracts}
        contract={selectedContract}
      />

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Excluir Contrato"
        content="Tem certeza que deseja excluir este contrato? Esta ação pode afetar aditivos e anexos."
      />

      <AddendumFormModal
        open={!!quickAddendumContract}
        onClose={() => setQuickAddendumContract(null)}
        contractId={quickAddendumContract?.id}
        onSaved={() => { setQuickAddendumContract(null); fetchContracts(); }}
      />
    </Box >
  );
};

export default ContractsPage;