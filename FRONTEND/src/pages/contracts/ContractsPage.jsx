import { useState, useEffect, useMemo, useContext } from 'react';
import { useSnackbar } from 'notistack';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, TextField, MenuItem, InputAdornment, IconButton, Tooltip, Collapse, Paper, useTheme } from '@mui/material';
import { format, isAfter, isBefore, addDays } from 'date-fns';

import { ThemeContext } from '../../contexts/ThemeContext';
import ContractModal from '../../components/modals/ContractModal';
import AddendumFormModal from '../../components/modals/AddendumFormModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import EmptyState from '../../components/common/EmptyState';
import ExportButton from '../../components/common/ExportButton';
import { EXPORT_COLUMNS } from '../../utils/exportUtils';
import { getContracts, createContract, updateContract, deleteContract } from '../../services/contract.service';
import { getErrorMessage } from '../../utils/errorUtils';
import { AuthContext } from '../../contexts/AuthContext';

const ContractsPage = () => {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    period: ''
  });
  const [showFilters, setShowFilters] = useState(true);

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
  const canWrite = hasPermission('CONTRACTS', 'CREATE');
  const canEdit = hasPermission('CONTRACTS', 'EDIT_CONTRACT');
  const canAddendum = hasPermission('CONTRACTS', 'ADDENDUM');
  const canDeletePerm = hasPermission('CONTRACTS', 'DELETE');

  // Theme-aware styles
  const textPrimary = mode === 'dark' ? '#f1f5f9' : theme.palette.text.primary;
  const textSecondary = mode === 'dark' ? '#64748b' : theme.palette.text.secondary;
  const textMuted = mode === 'dark' ? '#94a3b8' : theme.palette.text.disabled;
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

  const clearFilters = () => {
    setFilters({ status: '', type: '', period: '' });
    setSearchTerm('');
  };

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

  // Theme-aware input style
  const inputSx = {
    '& .MuiOutlinedInput-root': {
      bgcolor: surfaceBg,
      borderRadius: '12px',
      color: textPrimary,
      '& fieldset': { borderColor: borderColor },
      '&:hover fieldset': { borderColor: 'rgba(37, 99, 235, 0.3)' },
      '&.Mui-focused fieldset': { borderColor: '#2563eb' }
    },
    '& .MuiInputLabel-root': { color: textMuted },
    '& .MuiSelect-icon': { color: textMuted },
    '& input::placeholder': { color: textSecondary }
  };

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

      {/* Filters Section */}
      <Box
        sx={{
          mb: 3,
          borderRadius: '16px',
          background: cardBg,
          backdropFilter: mode === 'dark' ? 'blur(10px)' : 'none',
          border: `1px solid ${borderColor}`,
          boxShadow: cardShadow,
          overflow: 'hidden'
        }}
      >
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: showFilters ? `1px solid ${borderColor}` : 'none' }}>
          <Typography sx={{ fontSize: '16px', fontWeight: 600, color: textPrimary, display: 'flex', alignItems: 'center', gap: 1 }}>
            <span className="material-icons-round" style={{ fontSize: '20px', color: '#2563eb' }}>filter_list</span>
            Filtros
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size="small"
              onClick={clearFilters}
              sx={{
                color: textMuted,
                textTransform: 'none',
                '&:hover': { bgcolor: mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)' }
              }}
              startIcon={<span className="material-icons-round" style={{ fontSize: '16px' }}>refresh</span>}
            >
              Limpar
            </Button>
            <IconButton size="small" onClick={() => setShowFilters(!showFilters)} sx={{ color: textMuted }}>
              {showFilters ? '▲' : '▼'}
            </IconButton>
          </Box>
        </Box>
        <Collapse in={showFilters}>
          <Box sx={{ p: 3, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 2 }}>
            <TextField
              label="Buscar"
              placeholder="Buscar fornecedor..."
              size="small"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{
                ...inputSx,
                '& .MuiInputBase-root': {
                  height: '40px'
                }
              }}
            />
            <TextField
              select
              label="Status"
              size="small"
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              sx={inputSx}
            >
              <MenuItem value="">Todos os status</MenuItem>
              <MenuItem value="active">Ativo</MenuItem>
              <MenuItem value="pending">Pendente</MenuItem>
              <MenuItem value="expired">Expirado</MenuItem>
            </TextField>
            <TextField
              select
              label="Tipo"
              size="small"
              value={filters.type}
              onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
              sx={inputSx}
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
              label="Período"
              size="small"
              value={filters.period}
              onChange={(e) => setFilters(prev => ({ ...prev, period: e.target.value }))}
              sx={inputSx}
            >
              <MenuItem value="">Todo o período</MenuItem>
              <MenuItem value="current">Vigentes</MenuItem>
              <MenuItem value="expiring">Vencendo em 30 dias</MenuItem>
              <MenuItem value="expired">Expirados</MenuItem>
            </TextField>
          </Box>
        </Collapse>
      </Box>

      {/* Stats Cards — Left Border Accent variant */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 2.5, mb: 3 }}>
        {statCards.map((card) => (
          <Box
            key={card.key}
            sx={{
              p: 2.5,
              borderRadius: '12px',
              background: cardBg,
              backdropFilter: mode === 'dark' ? 'blur(10px)' : 'none',
              border: `1px solid ${borderColor}`,
              borderLeft: `4px solid ${card.color}`,
              boxShadow: cardShadow,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              transition: 'all 0.2s ease',
              cursor: 'pointer',
              '&:hover': {
                transform: 'translateY(-2px)',
                borderColor: 'rgba(37, 99, 235, 0.3)',
                borderLeftColor: card.color,
              }
            }}
          >
            <Box sx={{
              width: 44,
              height: 44,
              borderRadius: '10px',
              background: card.bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: card.color
            }}>
              <span className="material-icons-round" style={{ fontSize: '22px' }}>{card.icon}</span>
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: '24px', fontWeight: 700, color: textPrimary, lineHeight: 1.2 }}>
                {card.value}
              </Typography>
              <Typography sx={{ fontSize: '12px', color: textSecondary }}>
                {card.label}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>

      {/* Table Section */}
      <Box
        sx={{
          borderRadius: '16px',
          background: cardBg,
          backdropFilter: mode === 'dark' ? 'blur(10px)' : 'none',
          border: `1px solid ${borderColor}`,
          boxShadow: cardShadow,
          overflow: 'hidden'
        }}
      >
        {/* Table Header */}
        <Box sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${borderColor}` }}>
          <Typography sx={{ fontSize: '18px', fontWeight: 600, color: textPrimary, display: 'flex', alignItems: 'center', gap: 1 }}>
            <span className="material-icons-round" style={{ fontSize: '20px', color: '#2563eb' }}>list</span>
            Lista de Contratos
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
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
        </Box>

        {/* Table */}
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
      </Box>

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